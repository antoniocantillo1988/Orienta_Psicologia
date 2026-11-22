import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CheckCircle2, ClipboardList, Clock3,
  GraduationCap, LoaderCircle, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [membresia, setMembresia] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api.get('/cursos/mis-cursos')
      .then((data) => {
        if (activo) {
          setCursos(data.cursos || []);
          setMembresia(data.membresia || { activa: false, valida_hasta: null });
        }
      })
      .catch((err) => {
        if (activo) {
          setError(err.message || 'No se pudo cargar tu formación.');
          setMembresia({ error: true });
        }
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const actividadesPendientes = cursos.flatMap((curso) =>
    (curso.tareas_pendientes || []).map((actividad) => ({
      ...actividad,
      curso_id: curso.id,
      curso_titulo: curso.titulo,
    }))
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-sage-700 px-6 py-9 text-white shadow-suave sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-1 -top-7 h-52 w-52 rounded-full border border-white/10" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide">
            <GraduationCap size={15} /> Campus Orienta
          </span>
          <h1 className="mt-5 font-serif text-3xl font-bold sm:text-5xl">Hola, {user?.nombre_usuario}</h1>
          {membresia === null ? (
            <p className="mt-3 text-sm text-white/80">Comprobando el estado de tu membresía…</p>
          ) : membresia.error ? (
            <p className="mt-3 text-sm text-white/80">No pudimos comprobar ahora tu membresía. Inténtalo de nuevo en unos minutos.</p>
          ) : membresia.activa ? (
            <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-oro-200/40 bg-oro-100/15 px-4 py-2 text-sm font-semibold text-white sm:text-base">
              <Sparkles size={17} className="text-oro-200" /> Usuario Premium · Membresía válida hasta {String(membresia.valida_hasta).slice(8, 10)}/{String(membresia.valida_hasta).slice(5, 7)}/{String(membresia.valida_hasta).slice(0, 4)}
            </p>
          ) : (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
              Aún no tienes una membresía activa. Tu formación, tus actividades y tus próximos pasos están reunidos en este espacio.
            </p>
          )}
        </div>
        <div className="pointer-events-none absolute bottom-7 right-10 hidden text-white/15 sm:block">
          <BookOpen size={105} strokeWidth={1} />
        </div>
      </section>

      <section aria-labelledby="formacion-actual">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracota-600">Tu recorrido</p>
            <h2 id="formacion-actual" className="mt-1 font-serif text-2xl font-bold text-tierra-800">Formación actual</h2>
          </div>
          <Link to="/talleres" className="inline-flex items-center gap-2 text-sm font-semibold text-sage-700 hover:text-sage-900">
            Explorar el catálogo <ArrowRight size={16} />
          </Link>
        </div>

        {cargando ? (
          <div className="card-orienta flex items-center justify-center gap-3 py-12 text-sm text-stone-500" role="status">
            <LoaderCircle size={19} className="animate-spin" /> Cargando tu formación…
          </div>
        ) : error ? (
          <div className="card-orienta p-5 text-sm text-terracota-700" role="alert">{error}</div>
        ) : cursos.length === 0 ? (
          <div className="card-orienta flex flex-col items-center gap-5 px-6 py-9 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sage-50 text-sage-700"><GraduationCap size={28} /></div>
            <div className="flex-1">
              <h3 className="font-serif text-xl font-bold text-tierra-800">Empieza tu próximo curso</h3>
              <p className="mt-1 text-sm leading-6 text-stone-500">Al inscribirte, aquí aparecerán tus temas, actividades y progreso.</p>
            </div>
            <Link to="/talleres" className="btn-primary shrink-0">Explorar cursos <ArrowRight size={16} /></Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {cursos.map((curso) => (
              <article key={curso.id} className="card-orienta overflow-hidden p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {curso.categoria && <p className="text-xs font-semibold uppercase tracking-wider text-terracota-600">{curso.categoria}</p>}
                    <h3 className="mt-1 font-serif text-xl font-bold text-tierra-800">{curso.titulo}</h3>
                  </div>
                  {Number(curso.porcentaje) === 100
                    ? <CheckCircle2 className="shrink-0 text-sage-600" size={23} aria-label="Curso completado" />
                    : <Sparkles className="shrink-0 text-oro-500" size={22} aria-label="Curso en progreso" />}
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-stone-600">Progreso</span>
                    <strong className="text-sage-800">{curso.porcentaje}%</strong>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-crema-200">
                    <div className="h-full rounded-full bg-sage-500 transition-all duration-500" style={{ width: `${curso.porcentaje}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                    <span>{curso.completados} de {curso.total_actividades} actividades obligatorias</span>
                    {curso.duracion_horas && <span className="inline-flex items-center gap-1"><Clock3 size={12} /> {curso.duracion_horas} h</span>}
                    {curso.fecha_finalizacion && <span className="font-semibold text-sage-700">Completado</span>}
                  </div>
                </div>

                {curso.siguiente_actividad && (
                  <div className="mt-5 flex items-center gap-3 rounded-2xl bg-crema-50 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-terracota-600"><ClipboardList size={18} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Siguiente · {curso.siguiente_actividad.tema}</p>
                      <p className="truncate text-sm font-semibold text-tierra-800">{curso.siguiente_actividad.titulo}</p>
                    </div>
                  </div>
                )}

                {Number(curso.puede_acceder) === 1 ? (
                  <Link to={`/cursos/${curso.id}`} className="btn-primary mt-5 w-full justify-center">
                    {Number(curso.porcentaje) === 100 ? 'Volver a ver el curso' : 'Continuar formación'} <ArrowRight size={16} />
                  </Link>
                ) : curso.fecha_finalizacion ? (
                  <Link to="/informes" className="btn-primary mt-5 w-full justify-center">Ver mi certificado <ArrowRight size={16} /></Link>
                ) : (
                  <Link to={`/talleres?checkout=${curso.id}`} className="btn-primary mt-5 w-full justify-center">Renovar acceso <ArrowRight size={16} /></Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="actividades-pendientes">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracota-600">Tu siguiente paso</p>
            <h2 id="actividades-pendientes" className="mt-1 font-serif text-2xl font-bold text-tierra-800">Tareas y cuestionarios pendientes</h2>
          </div>
          <Link to="/tareas" className="text-sm font-semibold text-sage-700 hover:text-sage-900">Abrir tareas <ArrowRight size={15} className="inline" /></Link>
        </div>

        {cargando ? (
          <div className="card-orienta flex items-center justify-center gap-3 py-8 text-sm text-stone-500"><LoaderCircle size={18} className="animate-spin" /> Revisando actividades…</div>
        ) : actividadesPendientes.length === 0 ? (
          <div className="card-orienta flex items-center gap-4 p-5">
            <CheckCircle2 className="shrink-0 text-sage-600" size={22} />
            <div>
              <h3 className="font-semibold text-tierra-800">Todo al día</h3>
              <p className="mt-1 text-sm text-stone-500">Cuando un curso tenga nuevas tareas o cuestionarios, aparecerán aquí.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {actividadesPendientes.map((actividad) => (
              <Link key={`${actividad.curso_id}-${actividad.id}`} to={`/cursos/${actividad.curso_id}`} className="card-orienta flex items-center gap-3 p-4 transition hover:border-sage-300 hover:shadow-suave">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracota-50 text-terracota-600"><ClipboardList size={19} /></div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-tierra-800">{actividad.titulo}</span>
                  <span className="mt-0.5 block truncate text-xs text-stone-500">{actividad.curso_titulo} · {actividad.tema}</span>
                </span>
                <span className="shrink-0 rounded-full bg-oro-50 px-2.5 py-1 text-[10px] font-bold text-oro-700">{actividad.tipo === 'cuestionario' ? 'Cuestionario' : 'Tarea'}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link to="/talleres" className="group flex flex-col justify-between gap-5 rounded-[2rem] border border-sage-200 bg-sage-50 p-6 transition hover:border-sage-300 hover:bg-sage-100 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sage-700 shadow-sm"><BookOpen size={23} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sage-700">Sigue aprendiendo</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-tierra-800">Explora el catálogo de cursos</h2>
            <p className="mt-1 text-sm text-stone-600">Encuentra formación nueva para tu camino y el de tu familia.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 font-semibold text-sage-800 group-hover:gap-3">Ver catálogo <ArrowRight size={17} /></span>
      </Link>
    </div>
  );
}
