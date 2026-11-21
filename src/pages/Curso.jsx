import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Check, CheckCircle2, Circle, Clock3, FileText,
  LoaderCircle, PlayCircle, Presentation, RotateCcw, ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';

function youtubeEmbed(enlace) {
  try {
    const url = new URL(enlace);
    const host = url.hostname.toLowerCase();
    const esYoutube = host === 'youtu.be'
      || host.endsWith('.youtu.be')
      || host === 'youtube.com'
      || host.endsWith('.youtube.com')
      || host === 'youtube-nocookie.com'
      || host.endsWith('.youtube-nocookie.com');
    if (!esYoutube) return null;

    let id = '';
    const partes = url.pathname.split('/').filter(Boolean);
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) id = partes[0] || '';
    else if (partes[0] === 'watch') id = url.searchParams.get('v') || '';
    else if (['embed', 'shorts', 'live', 'v'].includes(partes[0])) id = partes[1] || '';
    else id = url.searchParams.get('v') || '';
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
  } catch {
    return null;
  }
}

function embedUrl(item) {
  try {
    const url = new URL(item.enlace);
    if (item.tipo === 'video') return youtubeEmbed(item.enlace);
    if (item.tipo === 'cuestionario') {
      url.searchParams.set('embed', 'true');
      return url.toString();
    }
    if (item.tipo === 'pdf' && url.hostname.includes('drive.google.com')) {
      const match = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    if (item.tipo === 'presentacion' && url.hostname.includes('docs.google.com') && url.pathname.includes('/presentation/d/')) {
      url.pathname = url.pathname.replace(/\/edit$/, '/embed');
      url.search = '';
    }
    if (item.tipo === 'pdf') {
      const hash = 'toolbar=0&navpanes=0&scrollbar=0';
      url.hash = url.hash ? `${url.hash.replace(/^#/, '')}&${hash}` : hash;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function iconoContenido(tipo) {
  if (tipo === 'video') return PlayCircle;
  if (tipo === 'pdf') return FileText;
  if (tipo === 'presentacion') return Presentation;
  if (tipo === 'tarea' || tipo === 'cuestionario') return BookOpen;
  return FileText;
}

export default function Curso() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    try {
      const result = await api.get(`/cursos/contenido?curso_id=${encodeURIComponent(id)}`);
      setData(result);
      setSeleccionado((actual) => {
        const refreshed = result.contenidos.find((item) => Number(item.id) === Number(actual));
        return refreshed || result.contenidos.find((item) => Number(item.completado) !== 1) || result.contenidos[0] || null;
      });
      window.dispatchEvent(new Event('campus-progress-updated'));
    } catch (err) {
      setError(err.message || 'No se pudo abrir este curso.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setRespuesta(seleccionado?.respuesta || ''); }, [seleccionado]);

  const temas = useMemo(() => {
    const grupos = new Map();
    for (const item of data?.contenidos || []) {
      const key = item.tema || 'Contenido';
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key).push(item);
    }
    return Array.from(grupos, ([tema, items]) => ({ tema, items }));
  }, [data]);

  async function cambiarProgreso(completado) {
    if (!seleccionado) return;
    setGuardando(true);
    setAviso('');
    try {
      await api.post('/cursos/progreso', {
        contenido_id: seleccionado.id,
        completado,
        respuesta: seleccionado.tipo === 'tarea' ? respuesta : undefined,
      });
      setAviso(completado ? 'Actividad guardada. Tu progreso se ha actualizado.' : 'Actividad marcada como pendiente.');
      await cargar();
    } catch (err) {
      setAviso(err.message || 'No se pudo guardar el progreso.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <div className="flex items-center justify-center gap-3 py-24 text-sm text-stone-500"><LoaderCircle className="animate-spin" size={20} /> Cargando tu curso…</div>;
  if (error) return <div className="mx-auto max-w-3xl"><Link to="/campus" className="inline-flex items-center gap-2 text-sm font-semibold text-sage-700"><ArrowLeft size={16} /> Volver al Campus</Link><div className="card-orienta mt-6 p-6 text-sm text-terracota-700" role="alert">{error}</div></div>;

  const itemSeleccionado = seleccionado;
  const Icono = iconoContenido(itemSeleccionado?.tipo);
  const reproductor = itemSeleccionado ? embedUrl(itemSeleccionado) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <Link to="/campus" className="inline-flex items-center gap-2 text-sm font-semibold text-sage-700 hover:text-sage-900"><ArrowLeft size={16} /> Campus</Link>
      <section className="overflow-hidden rounded-[2rem] bg-sage-700 p-6 text-white shadow-suave sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold"><BookOpen size={14} /> Tu espacio de aprendizaje</span>
            <h1 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">{data.curso.titulo}</h1>
            {data.curso.descripcion && <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">{data.curso.descripcion}</p>}
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-white/80"><Clock3 size={15} /> Duración estimada</span>
            <strong className="mt-1 block text-lg">{data.curso.duracion_horas || '—'} h</strong>
          </div>
        </div>
        <div className="mt-7 max-w-2xl">
          <div className="mb-2 flex justify-between text-sm"><span>Progreso del curso</span><strong>{data.progreso}%</strong></div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-oro-300 transition-all duration-500" style={{ width: `${data.progreso}%` }} /></div>
          <p className="mt-2 text-xs text-white/75">{data.completados} de {data.total_actividades} actividades obligatorias completadas</p>
        </div>
      </section>

      {aviso && <div className="rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-800" role="status">{aviso}</div>}

      {data.contenidos.length === 0 ? (
        <div className="card-orienta p-10 text-center">
          <BookOpen className="mx-auto text-sage-600" size={32} />
          <h2 className="mt-4 font-serif text-xl font-bold text-tierra-800">El temario se está preparando</h2>
          <p className="mt-2 text-sm text-stone-500">Vuelve pronto para ver los nuevos temas y actividades.</p>
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="card-orienta p-4 sm:p-5">
            <h2 className="px-2 pb-3 font-serif text-xl font-bold text-tierra-800">Temario</h2>
            <div className="space-y-4">
              {temas.map((grupo) => (
                <section key={grupo.tema}>
                  <h3 className="px-2 pb-1 text-xs font-bold uppercase tracking-wider text-terracota-600">{grupo.tema}</h3>
                  <div className="space-y-1">
                    {grupo.items.map((item) => {
                      const ItemIcon = iconoContenido(item.tipo);
                      const active = Number(item.id) === Number(seleccionado?.id);
                      const done = Number(item.completado) === 1;
                      return (
                        <button key={item.id} type="button" onClick={() => setSeleccionado(item)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-sage-50 text-sage-800' : 'text-tierra-800 hover:bg-crema-50'}`}>
                          {done ? <CheckCircle2 size={18} className="shrink-0 text-sage-600" /> : <Circle size={18} className="shrink-0 text-stone-300" />}
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.titulo}</span><span className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500"><ItemIcon size={12} />{item.tipo.replace('_', ' ')}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <article className="card-orienta min-w-0 overflow-hidden">
            <div className="border-b border-crema-200 p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sage-50 text-sage-700"><Icono size={22} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-terracota-600">{itemSeleccionado.tema}</p>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-tierra-800">{itemSeleccionado.titulo}</h2>
                </div>
                {Number(itemSeleccionado.obligatorio) === 1 && <span className="hidden rounded-full bg-oro-50 px-3 py-1 text-xs font-semibold text-oro-700 sm:inline">Actividad obligatoria</span>}
              </div>
              {itemSeleccionado.instrucciones && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-stone-600">{itemSeleccionado.instrucciones}</p>}
            </div>

            {itemSeleccionado.tipo === 'tarea' ? (
              <div className="p-5 sm:p-7">
                <label className="block text-sm font-semibold text-tierra-800" htmlFor="respuesta-tarea">Tu respuesta o reflexión</label>
                <textarea id="respuesta-tarea" rows={7} value={respuesta} onChange={(event) => setRespuesta(event.target.value)} className="mt-2 w-full resize-y rounded-2xl border border-crema-300 bg-white p-4 text-sm leading-6 outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100" placeholder="Escribe aquí tu reflexión. Solo tú y el equipo del curso podrán verla." />
              </div>
            ) : reproductor ? (
              <div className="p-4 sm:p-6">
                <div className={`relative overflow-hidden rounded-2xl border border-crema-200 bg-stone-100 ${itemSeleccionado.tipo === 'video' ? 'aspect-video' : 'h-[65vh] min-h-[420px]'}`}>
                  <iframe
                    title={itemSeleccionado.titulo}
                    src={reproductor}
                    className="absolute inset-0 h-full w-full border-0"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-2 py-1.5 shadow-md backdrop-blur">
                    <img src="/orienta-icon.png" alt="" className="h-6 w-6 object-contain" />
                    <span className="pr-1 text-[10px] font-bold tracking-wide text-sage-800">ORIENTA</span>
                  </div>
                </div>
                {itemSeleccionado.tipo === 'pdf' && <p className="mt-2 flex items-center gap-2 text-xs text-stone-500"><ShieldCheck size={14} /> Documento mostrado dentro del campus; el enlace original no aparece en pantalla.</p>}
              </div>
            ) : (
              <div className="p-7 text-sm text-terracota-700" role="alert">No se pudo preparar este recurso. Pide al administrador que revise el enlace.</div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-crema-200 bg-crema-50/60 p-5 sm:px-7">
              <div className="flex items-center gap-2 text-sm text-stone-500"><ShieldCheck size={16} className="text-sage-600" /> Contenido del campus Orienta</div>
              {Number(itemSeleccionado.completado) === 1 ? (
                <button type="button" onClick={() => cambiarProgreso(false)} disabled={guardando} className="btn-outline disabled:opacity-60">
                  {guardando ? <LoaderCircle size={16} className="animate-spin" /> : <RotateCcw size={16} />} Marcar pendiente
                </button>
              ) : (
                <button type="button" onClick={() => cambiarProgreso(true)} disabled={guardando} className="btn-primary disabled:opacity-60">
                  {guardando ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Marcar como completado
                </button>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
