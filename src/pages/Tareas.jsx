import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function Tareas() {
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api.get('/cursos/mis-cursos')
      .then((data) => { if (activo) setCursos(data.cursos || []); })
      .catch((err) => { if (activo) setError(err.message || 'No se pudieron cargar las tareas.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const actividades = cursos.flatMap((curso) =>
    (curso.tareas_pendientes || []).map((item) => ({ ...item, curso_id: curso.id, curso_titulo: curso.titulo }))
  );

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-sage-700 px-6 py-8 text-white shadow-suave sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold"><ClipboardList size={14} /> Mi aprendizaje</span>
          <h1 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">Tareas y actividades</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Aquí tienes las actividades y cuestionarios pendientes de tus cursos.</p>
        </div>
      </section>

      {cargando ? (
        <div className="card-orienta mt-6 flex items-center justify-center gap-3 py-12 text-sm text-stone-500"><LoaderCircle className="animate-spin" size={19} /> Cargando tareas…</div>
      ) : error ? (
        <div className="card-orienta mt-6 p-5 text-sm text-terracota-700" role="alert">{error}</div>
      ) : actividades.length === 0 ? (
        <div className="card-orienta mt-6 flex flex-col items-center px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700"><CheckCircle2 size={28} /></div>
          <h2 className="mt-4 font-serif text-xl font-bold text-tierra-800">No tienes actividades pendientes</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-stone-500">Cuando te inscribas en un curso, aparecerán aquí sus tareas y cuestionarios.</p>
          <Link to="/talleres" className="btn-primary mt-5">Explorar cursos <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {actividades.map((item) => (
            <Link key={`${item.curso_id}-${item.id}`} to={`/cursos/${item.curso_id}`} className="card-orienta flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-sage-300">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-terracota-50 text-terracota-600"><ClipboardList size={23} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-terracota-600">{item.tema}</p>
                <h2 className="mt-0.5 truncate font-semibold text-tierra-800">{item.titulo}</h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-stone-500"><BookOpen size={13} /> {item.curso_titulo}</p>
              </div>
              <span className="hidden rounded-full bg-oro-50 px-3 py-1 text-xs font-semibold text-oro-700 sm:inline">{item.tipo === 'cuestionario' ? 'Cuestionario' : 'Pendiente'}</span>
              <ArrowRight className="shrink-0 text-sage-600" size={18} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
