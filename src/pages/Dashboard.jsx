// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, MessageSquare, BookOpen, CalendarCheck, Users, GraduationCap, ClipboardList, Clock3, ArrowRight, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';

const modulos = [
  {
    to: '/citas',
    icon: Calendar,
    iconColor: 'text-sage-600 bg-sage-100',
    titulo: 'Consulta con Antonio',
    desc: 'Reserva una sesión de videollamada. Te confirmaremos el enlace.',
    accion: 'Reservar cita',
  },
  {
    to: '/chat',
    icon: MessageSquare,
    iconColor: 'text-terracota-600 bg-terracota-100',
    titulo: 'Chat de apoyo 24h',
    desc: 'Orientación psicoeducativa con IA. Resuelve dudas sobre el desarrollo de tu hijo/a.',
    accion: 'Abrir chat',
  },
  {
    to: '/talleres',
    icon: BookOpen,
    iconColor: 'text-sage-700 bg-crema-200',
    titulo: 'Talleres y cursos',
    desc: 'Contenido grabado sobre crianza, desarrollo emocional y estimulación temprana.',
    accion: 'Ver talleres',
  },
];

const modulosAdmin = [
  {
    to: '/admin/citas',
    icon: CalendarCheck,
    iconColor: 'text-sage-600 bg-sage-100',
    titulo: 'Modificar citas',
    desc: 'Confirma, cancela o elimina citas y gestiona tus huecos de disponibilidad.',
    accion: 'Gestionar citas',
  },
  {
    to: '/admin/usuarios',
    icon: Users,
    iconColor: 'text-terracota-600 bg-terracota-100',
    titulo: 'Modificar usuarios',
    desc: 'Edita nombres, cambia roles de usuario o administrador y elimina cuentas.',
    accion: 'Gestionar usuarios',
  },
  {
    to: '/admin/talleres',
    icon: GraduationCap,
    iconColor: 'text-oro-600 bg-oro-100',
    titulo: 'Modificar talleres',
    desc: 'Crea y edita cursos, temas, recursos y actividades para el campus.',
    accion: 'Gestionar talleres',
  },
];

function Tarjeta({ m }) {
  const Icon = m.icon;
  return (
    <Link
      to={m.to}
      className="group block rounded-3xl border border-crema-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-sage-300 hover:shadow-suave"
    >
      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${m.iconColor}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold text-tierra-800">{m.titulo}</h2>
      <p className="mt-2 min-h-[4rem] leading-relaxed text-stone-500">{m.desc}</p>
      <div className="mt-4 flex items-center font-semibold text-sage-600 opacity-0 transition-opacity group-hover:opacity-100">
        {m.accion} <span className="ml-2">→</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [cargandoCursos, setCargandoCursos] = useState(true);
  const [errorCursos, setErrorCursos] = useState('');

  useEffect(() => {
    let activo = true;
    api.get('/cursos/mis-cursos')
      .then((data) => { if (activo) setCursos(data.cursos || []); })
      .catch((error) => { if (activo) setErrorCursos(error.message || 'No se pudieron cargar tus cursos.'); })
      .finally(() => { if (activo) setCargandoCursos(false); });
    return () => { activo = false; };
  }, []);

  const tareasPendientes = cursos.flatMap((curso) =>
    (curso.tareas_pendientes || []).map((tarea) => ({ ...tarea, curso_id: curso.id, curso_titulo: curso.titulo }))
  ).slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="font-serif text-3xl font-bold text-tierra-800 sm:text-4xl">
          Hola, {user?.nombre_usuario}
        </h1>
        <p className="mt-2 text-lg text-stone-500">
          ¿En qué podemos acompañarte hoy en tu camino al bienestar?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {modulos.map((m) => <Tarjeta key={m.to} m={m} />)}
      </div>

      <section className="mt-12" aria-labelledby="mis-cursos-titulo">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-terracota-600">Tu formación</p>
            <h2 id="mis-cursos-titulo" className="mt-1 font-serif text-2xl font-bold text-tierra-800">Mis cursos</h2>
          </div>
          <Link to="/talleres" className="inline-flex items-center gap-2 text-sm font-semibold text-sage-700 hover:text-sage-900">Explorar catálogo <ArrowRight size={16} /></Link>
        </div>

        {cargandoCursos ? (
          <div className="card-orienta flex items-center justify-center gap-3 py-10 text-sm text-stone-500"><LoaderCircle size={19} className="animate-spin" /> Cargando tus cursos…</div>
        ) : errorCursos ? (
          <div className="card-orienta p-5 text-sm text-terracota-700" role="alert">{errorCursos}</div>
        ) : cursos.length === 0 ? (
          <div className="card-orienta flex flex-col items-center px-6 py-9 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sage-50 text-sage-700"><GraduationCap size={27} /></div>
            <div className="mt-4 sm:ml-4 sm:mt-0">
              <h3 className="font-serif text-lg font-bold text-tierra-800">Tu próximo aprendizaje empieza aquí</h3>
              <p className="mt-1 text-sm text-stone-500">Al inscribirte en un curso aparecerán aquí tus temas, tareas y progreso.</p>
            </div>
            <Link to="/talleres" className="btn-primary mt-5 sm:ml-auto sm:mt-0">Ver talleres</Link>
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
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-50 text-sage-700"><BookOpen size={21} /></div>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium text-stone-600">Tu progreso</span><strong className="text-sage-800">{curso.porcentaje}%</strong></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-crema-200"><div className="h-full rounded-full bg-sage-500 transition-all duration-500" style={{ width: `${curso.porcentaje}%` }} /></div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                    <span>{curso.completados} de {curso.total_actividades} actividades obligatorias</span>
                    {curso.duracion_horas && <span className="inline-flex items-center gap-1"><Clock3 size={12} /> {curso.duracion_horas} h estimadas</span>}
                    {curso.fecha_finalizacion && <span className="font-semibold text-sage-700">Curso completado</span>}
                  </div>
                </div>
                {curso.siguiente_actividad && (
                  <div className="mt-5 flex items-center gap-3 rounded-2xl bg-crema-50 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-terracota-600"><ClipboardList size={18} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Siguiente actividad · {curso.siguiente_actividad.tema}</p>
                      <p className="truncate text-sm font-semibold text-tierra-800">{curso.siguiente_actividad.titulo}</p>
                    </div>
                  </div>
                )}
                <Link to={`/cursos/${curso.id}`} className="btn-primary mt-5 w-full justify-center">{curso.porcentaje === 100 ? 'Repasar mi curso' : 'Continuar curso'} <ArrowRight size={16} /></Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {tareasPendientes.length > 0 && (
        <section className="mt-10" aria-labelledby="tareas-curso-titulo">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-terracota-600">Para continuar</p><h2 id="tareas-curso-titulo" className="mt-1 font-serif text-2xl font-bold text-tierra-800">Tareas y cuestionarios pendientes</h2></div>
            <Link to="/tareas" className="text-sm font-semibold text-sage-700 hover:text-sage-900">Ver todas</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tareasPendientes.map((tarea) => (
              <Link key={`${tarea.curso_id}-${tarea.id}`} to={`/cursos/${tarea.curso_id}`} className="card-orienta flex items-center gap-3 p-4 transition hover:border-sage-300">
                <ClipboardList className="shrink-0 text-terracota-600" size={19} />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-tierra-800">{tarea.titulo}</span><span className="mt-0.5 block truncate text-xs text-stone-500">{tarea.curso_titulo} · {tarea.tema}</span></span>
                <ArrowRight className="shrink-0 text-sage-600" size={16} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {isAdmin && (
        <>
          <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-wider text-oro-600">
            Administración
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {modulosAdmin.map((m) => <Tarjeta key={m.to} m={m} />)}
          </div>
        </>
      )}
    </div>
  );
}
