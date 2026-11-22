import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  CreditCard,
  HeartHandshake,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const CONTACTO_TALLERES =
  'https://wa.me/34678766839?text=Hola%2C%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20los%20pr%C3%B3ximos%20talleres.';

function precioCurso(curso) {
  const precio = Number(curso.precio);
  if (!Number.isFinite(precio)) return 'Consultar precio';
  const moneda = String(curso.moneda || 'EUR').toUpperCase();
  try {
    const importe = new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda }).format(precio);
    return curso.tipo_acceso === 'membresia' ? `${importe} / mes` : importe;
  } catch {
    return 'Consultar precio';
  }
}

function etiquetaAcceso(tipo) {
  if (tipo === 'membresia') return 'Membresía mensual';
  if (tipo === 'pago') return 'Pago único';
  return 'Gratuito';
}

export default function Talleres() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [accion, setAccion] = useState('');
  const checkoutProcesado = useRef(false);

  const cargarCursos = useCallback(async () => {
    setError('');
    try {
      const data = await api.get('/cursos');
      setCursos(data.cursos || []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCursos();
  }, [cargarCursos]);

  useEffect(() => {
    if (searchParams.get('pago') === 'correcto') {
      setMensaje('Pago recibido. Estoy confirmando tu inscripción; actualiza el catálogo en unos segundos si aún no aparece activa.');
      cargarCursos();
    } else if (searchParams.get('pago') === 'cancelado') {
      setMensaje('El pago se canceló y no se ha activado la inscripción. Puedes volver a intentarlo cuando quieras.');
    }
  }, [searchParams, cargarCursos]);

  useEffect(() => {
    const cursoId = Number(searchParams.get('curso_id'));
    if (searchParams.get('pago') !== 'correcto' || !cursoId || !user) return undefined;
    let activo = true;
    let intento = 0;
    let temporizador;
    const comprobar = async () => {
      try {
        const data = await api.get('/cursos');
        const curso = (data.cursos || []).find((item) => Number(item.id) === cursoId);
        if (activo && curso?.inscripcion_estado === 'activa') {
          navigate(`/cursos/${cursoId}`, { replace: true });
          return;
        }
      } catch {
        // Se reintenta mientras llega la confirmación de Stripe.
      }
      intento += 1;
      if (activo && intento < 15) temporizador = window.setTimeout(comprobar, 2000);
      else if (activo) setMensaje('El pago se recibió, pero Stripe aún no ha confirmado el acceso. Espera un momento y actualiza la inscripción.');
    };
    temporizador = window.setTimeout(comprobar, 1200);
    return () => { activo = false; window.clearTimeout(temporizador); };
  }, [searchParams, user, navigate]);

  useEffect(() => {
    const cursoSolicitado = Number(searchParams.get('checkout'));
    if (!user || loading || !cursoSolicitado || checkoutProcesado.current) return;
    const curso = cursos.find((item) => Number(item.id) === cursoSolicitado);
    if (!curso) return;
    checkoutProcesado.current = true;
    if (curso.inscripcion_estado === 'activa') {
      navigate(`/cursos/${curso.id}`, { replace: true });
    } else {
      inscribirse(curso);
    }
  }, [user, loading, cursos, searchParams, navigate]);

  async function inscribirse(curso) {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/talleres', search: `?checkout=${curso.id}` } } });
      return;
    }

    setAccion(`${curso.tipo_acceso}-${curso.id}`);
    setMensaje('');
    try {
      if (curso.tipo_acceso === 'gratis') {
        await api.post('/cursos/inscribirse', { curso_id: curso.id });
        setMensaje('Ya estás inscrito. Encontrarás el curso en tu espacio personal.');
        await cargarCursos();
      } else {
        const data = await api.post('/stripe/checkout', { curso_id: curso.id });
        if (!data.url) throw new Error('Stripe no devolvió el enlace de pago.');
        window.location.assign(data.url);
      }
    } catch (err) {
      setMensaje(err.message || 'No se pudo completar la operación.');
    } finally {
      setAccion('');
    }
  }

  async function gestionarMembresia() {
    if (!user) return navigate('/login');
    setAccion('portal');
    setMensaje('');
    try {
      const data = await api.post('/stripe/portal', {});
      if (!data.url) throw new Error('No se recibió el enlace de gestión.');
      window.location.assign(data.url);
    } catch (err) {
      setMensaje(err.message || 'No se pudo abrir la gestión de la membresía.');
      setAccion('');
    }
  }

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-sage-700 px-6 py-10 text-white shadow-suave sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-6 h-44 w-44 rounded-full border border-white/10" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
            <BookOpen size={14} aria-hidden="true" />
            Orienta Psicología
          </span>
          <h1 className="mt-6 font-serif text-3xl font-bold leading-tight sm:text-5xl">
            Talleres para acompañar y aprender
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
            Un espacio para compartir herramientas y conocimientos que acompañen
            el bienestar de las personas cuidadoras y sus familias.
          </p>
        </div>
        <div className="pointer-events-none absolute bottom-7 right-10 hidden text-white/15 sm:block">
          <HeartHandshake size={112} strokeWidth={1} aria-hidden="true" />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="catalogo-talleres">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracota-600">Catálogo</p>
            <h2 id="catalogo-talleres" className="mt-1 font-serif text-2xl font-bold text-tierra-800">
              Talleres y cursos
            </h2>
          </div>
          {user && <span className="text-sm text-stone-500">Hola, {user.nombre_usuario}</span>}
        </div>

        {mensaje && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sage-200 bg-sage-50 p-4 text-sm text-sage-800" role="status">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p>{mensaje}</p>
              {searchParams.get('pago') === 'correcto' && (
                <button type="button" className="mt-2 font-semibold underline" onClick={cargarCursos}>
                  Actualizar inscripción
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="card-orienta mt-5 flex items-center justify-center gap-3 px-6 py-12 text-sm text-stone-500" role="status">
            <LoaderCircle size={19} className="animate-spin" aria-hidden="true" />
            Cargando talleres y cursos…
          </div>
        ) : error ? (
          <div className="card-orienta mt-5 flex flex-col items-center px-6 py-10 text-center">
            <p className="text-sm text-terracota-700" role="alert">{error}</p>
            <button type="button" className="btn-outline mt-5" onClick={cargarCursos}>
              <RefreshCw size={16} aria-hidden="true" />
              Volver a intentar
            </button>
          </div>
        ) : cursos.length === 0 ? (
          <div className="card-orienta mt-5 flex flex-col items-center px-6 py-10 text-center sm:px-12 sm:py-14">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-50 text-sage-600">
              <BookOpen size={30} strokeWidth={1.7} aria-hidden="true" />
            </div>
            <h3 className="mt-5 font-serif text-xl font-bold text-tierra-800">Estoy preparando la programación</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-stone-600">
              En cuanto haya talleres disponibles, encontrarás aquí sus temas y detalles.
              Mientras tanto, puedes escribirnos para consultar novedades.
            </p>
            <a href={CONTACTO_TALLERES} target="_blank" rel="noopener noreferrer" className="btn-outline mt-6">
              Consultar novedades <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {cursos.map((curso) => {
              const inscrita = curso.inscripcion_estado === 'activa';
              const busy = accion === `${curso.tipo_acceso}-${curso.id}`;
              return (
                <article key={curso.id} className="card-orienta flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-50 text-sage-700">
                      <BookOpen size={23} aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-oro-50 px-3 py-1 text-xs font-semibold text-oro-700">
                      {etiquetaAcceso(curso.tipo_acceso)}
                    </span>
                  </div>
                  {curso.categoria && (
                    <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-terracota-600">{curso.categoria}</p>
                  )}
                  <h3 className="mt-2 font-serif text-xl font-bold text-tierra-800">{curso.titulo}</h3>
                  {curso.descripcion && <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">{curso.descripcion}</p>}
                  {curso.duracion_horas && <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500"><Clock3 size={14} /> Duración estimada: {curso.duracion_horas} h</p>}

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-crema-200 pt-4">
                    <span className="font-semibold text-tierra-800">{precioCurso(curso)}</span>
                    {inscrita ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {curso.tipo_acceso === 'membresia' && (
                          <button type="button" className="btn-outline" onClick={gestionarMembresia} disabled={accion === 'portal'}>
                            {accion === 'portal' ? <LoaderCircle size={16} className="animate-spin" /> : <CreditCard size={16} />}
                            Gestionar membresía
                          </button>
                        )}
                        <Link to={`/cursos/${curso.id}`} className="btn-primary">
                          <BookOpen size={16} aria-hidden="true" /> Acceder al curso
                        </Link>
                      </div>
                    ) : (
                      user ? (
                        <button type="button" className="btn-primary" onClick={() => inscribirse(curso)} disabled={Boolean(accion)}>
                          {busy ? <LoaderCircle size={16} className="animate-spin" /> : curso.tipo_acceso === 'gratis' ? <BookOpen size={16} /> : <CreditCard size={16} />}
                          {curso.tipo_acceso === 'gratis' ? 'Inscribirme gratis' : curso.tipo_acceso === 'membresia' ? 'Suscribirme' : 'Comprar curso'}
                        </button>
                      ) : (
                        <Link to="/login" state={{ from: { pathname: '/talleres', search: `?checkout=${curso.id}` } }} className="btn-primary">
                          <CreditCard size={16} aria-hidden="true" /> Iniciar sesión
                        </Link>
                      )
                    )}
                  </div>
                  {curso.tipo_acceso === 'membresia' && !inscrita && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                      <ShieldCheck size={14} aria-hidden="true" /> Pago mensual seguro gestionado por Stripe.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
