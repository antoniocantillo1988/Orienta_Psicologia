# Pagos de cursos con Stripe (modo de prueba)

La integración admite cursos de pago único (`tipo_acceso = 'pago'`) y membresías mensuales (`tipo_acceso = 'membresia'`). El catálogo muestra únicamente cursos publicados. Las inscripciones gratuitas se activan sin pasar por Stripe.

## Configuración privada

En el entorno de prueba de Vercel, añade estas variables desde **Settings → Environment Variables**. No las guardes en el código ni las compartas por chat.

- `STRIPE_SECRET_KEY`: clave secreta de prueba que empieza por `sk_test_`.
- `STRIPE_WEBHOOK_SECRET`: secreto de firma del endpoint webhook, que empieza por `whsec_`.
- `APP_URL`: URL HTTPS de la web, por ejemplo el dominio de vista previa que quieras usar.

La integración rechaza las claves de Stripe en vivo. El código no crea claves ni configura el panel de Stripe por ti.

## Webhook

En Stripe, crea un endpoint de prueba con URL `https://TU-DOMINIO/api/stripe/webhook` y suscríbelo a estos eventos:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copia el secreto de firma que Stripe muestra para ese endpoint y guárdalo como `STRIPE_WEBHOOK_SECRET`. El webhook valida la firma y la antigüedad de la petición antes de actualizar `inscripciones`.

## Catálogo y precios

El catálogo lee `cursos` y `inscripciones`. Para ofrecer un curso, crea o edita una fila de `cursos`, fija `publicado = 1` y elige `tipo_acceso`:

- `gratis`: inscripción autenticada sin pago.
- `pago`: Checkout de Stripe de un solo pago.
- `membresia`: Checkout con renovación mensual.

El precio se toma de `precio` y `moneda`; no se recibe del navegador. La aplicación espera las columnas creadas previamente: `cursos(id, titulo, descripcion, categoria, tipo_acceso, precio, moneda, publicado, fecha_creacion)` e `inscripciones(usuario_id, curso_id, estado, fecha_inicio, fecha_fin, stripe_checkout_session_id, stripe_subscription_id)`.

El endpoint del portal de Stripe permite gestionar o cancelar una suscripción. Activa el **Customer Portal** en el panel de Stripe de prueba para que el botón de gestión funcione.

## Prueba local

Usa `vercel dev` para ejecutar a la vez la aplicación y las funciones API. Configura las variables en el entorno local de forma segura y utiliza tarjetas de prueba oficiales de Stripe. No uses tarjetas reales con claves de prueba.
