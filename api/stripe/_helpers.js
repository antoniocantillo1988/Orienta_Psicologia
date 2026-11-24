import crypto from 'node:crypto';

const STRIPE_API = 'https://api.stripe.com/v1';

export function getStripeSecret() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !secret.startsWith('sk_test_')) {
    throw new Error('Configura STRIPE_SECRET_KEY con una clave de prueba de Stripe (sk_test_…).');
  }
  return secret;
}

export function getAppUrl() {
  const configured = process.env.APP_URL?.trim();
  const candidate = configured
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '');

  if (!candidate) throw new Error('Falta configurar APP_URL con la URL pública de la aplicación.');
  const url = new URL(candidate);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('APP_URL debe usar HTTP o HTTPS.');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('APP_URL debe usar HTTPS en producción.');
  }
  return url.origin;
}

export async function stripeRequest(path, { method = 'POST', body, idempotencyKey } = {}) {
  const headers = { Authorization: `Bearer ${getStripeSecret()}` };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body: body?.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe respondió con el estado ${response.status}.`);
  }
  return data;
}

export function verifyStripeSignature(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(',').map((part) => part.split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest();

  return signatures.some((signature) => {
    if (!/^[a-f\d]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
  });
}

export async function readRawBody(req) {
  // Vercel exposes `req.body` through a lazy parser for JSON requests. Reading
  // that property first consumes/parses the payload, which loses the exact
  // bytes Stripe signs. Read the request stream directly instead.
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length) return Buffer.concat(chunks);

  // Keep compatibility with request mocks/adapters that provide an own data
  // property, while deliberately avoiding a getter that could parse the body.
  const bodyDescriptor = Object.getOwnPropertyDescriptor(req, 'body');
  const body = bodyDescriptor && 'value' in bodyDescriptor ? bodyDescriptor.value : undefined;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  throw new Error('No se recibió el cuerpo original del webhook.');
}

export function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
