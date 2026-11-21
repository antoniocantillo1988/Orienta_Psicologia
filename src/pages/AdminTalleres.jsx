import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, Check, ChevronDown, CirclePlus, FileText, LoaderCircle,
  Pencil, Presentation, Save, Trash2, Video, ClipboardList, ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';

const CURSO_VACIO = {
  titulo: '', descripcion: '', categoria: '', tipo_acceso: 'gratis', precio: '',
  moneda: 'EUR', duracion_horas: '', publicado: false,
};

const CONTENIDO_VACIO = {
  tema: '', titulo: '', tipo: 'video', enlace: '', instrucciones: '',
  orden: 0, obligatorio: true, publicado: true,
};

const TIPOS = [
  { value: 'video', label: 'Vídeo de YouTube', icon: Video, placeholder: 'https://www.youtube.com/watch?v=…' },
  { value: 'presentacion', label: 'Presentación', icon: Presentation, placeholder: 'Enlace para insertar la presentación' },
  { value: 'pdf', label: 'Documento PDF', icon: FileText, placeholder: 'Enlace directo al PDF' },
  { value: 'cuestionario', label: 'Cuestionario / Microsoft Forms', icon: ClipboardList, placeholder: 'Enlace de inserción de Microsoft Forms' },
  { value: 'tarea', label: 'Tarea para el alumno', icon: Pencil, placeholder: '' },
];

function textoAcceso(tipo) {
  return tipo === 'membresia' ? 'Membresía mensual' : tipo === 'pago' ? 'Pago único' : 'Gratuito';
}

function IconoTipo({ tipo, size = 17 }) {
  const Icon = TIPOS.find((item) => item.value === tipo)?.icon || BookOpen;
  return <Icon size={size} aria-hidden="true" />;
}

function Aviso({ aviso }) {
  if (!aviso) return null;
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${aviso.tipo === 'error' ? 'border-terracota-200 bg-terracota-50 text-terracota-700' : 'border-sage-200 bg-sage-50 text-sage-800'}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
      {aviso.texto}
    </div>
  );
}

export default function AdminTalleres() {
  const [cursos, setCursos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [curso, setCurso] = useState(CURSO_VACIO);
  const [contenidos, setContenidos] = useState([]);
  const [contenido, setContenido] = useState(CONTENIDO_VACIO);
  const [contenidoId, setContenidoId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cargandoContenido, setCargandoContenido] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargarCursos = useCallback(async () => {
    setAviso(null);
    try {
      const data = await api.get('/admin/talleres');
      setCursos(data.cursos || []);
      if (seleccionado) {
        const actualizado = (data.cursos || []).find((item) => Number(item.id) === Number(seleccionado));
        if (actualizado) setCurso({ ...actualizado, publicado: Number(actualizado.publicado) === 1 });
      }
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message || 'No se pudieron cargar los cursos.' });
    } finally {
      setCargando(false);
    }
  }, [seleccionado]);

  useEffect(() => { cargarCursos(); }, [cargarCursos]);

  const cargarContenidos = useCallback(async (cursoId) => {
    if (!cursoId) {
      setContenidos([]);
      return;
    }
    setCargandoContenido(true);
    try {
      const data = await api.get(`/admin/talleres/contenido?curso_id=${cursoId}`);
      setContenidos(data.contenidos || []);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message || 'No se pudo cargar el temario.' });
    } finally {
      setCargandoContenido(false);
    }
  }, []);

  useEffect(() => { cargarContenidos(seleccionado); }, [seleccionado, cargarContenidos]);

  function seleccionarCurso(item) {
    setSeleccionado(item.id);
    setCurso({
      titulo: item.titulo || '', descripcion: item.descripcion || '', categoria: item.categoria || '',
      tipo_acceso: item.tipo_acceso || 'gratis', precio: item.precio ?? '', moneda: item.moneda || 'EUR',
      duracion_horas: item.duracion_horas ?? '', publicado: Number(item.publicado) === 1,
    });
    setContenidoId(null);
    setContenido(CONTENIDO_VACIO);
    setAviso(null);
  }

  function crearCurso() {
    setSeleccionado(null);
    setCurso(CURSO_VACIO);
    setContenidos([]);
    setContenidoId(null);
    setContenido(CONTENIDO_VACIO);
    setAviso(null);
  }

  async function guardarCurso(event) {
    event.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      const payload = { ...curso, curso_id: seleccionado };
      if (seleccionado) {
        await api.put('/admin/talleres', payload);
        setAviso({ tipo: 'ok', texto: 'Curso actualizado.' });
        await cargarCursos();
      } else {
        const data = await api.post('/admin/talleres', payload);
        setAviso({ tipo: 'ok', texto: 'Curso creado. Ya puedes añadir sus temas y actividades.' });
        await cargarCursos();
        setSeleccionado(data.curso_id);
      }
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message || 'No se pudo guardar el curso.' });
    } finally {
      setGuardando(false);
    }
  }

  function nuevoContenido() {
    setContenidoId(null);
    setContenido({ ...CONTENIDO_VACIO, curso_id: seleccionado, orden: contenidos.length + 1 });
    setAviso(null);
  }

  function editarContenido(item) {
    setContenidoId(item.id);
    setContenido({
      curso_id: seleccionado, tema: item.tema || '', titulo: item.titulo || '', tipo: item.tipo,
      enlace: item.enlace || '', instrucciones: item.instrucciones || '', orden: item.orden ?? 0,
      obligatorio: Number(item.obligatorio) === 1, publicado: Number(item.publicado) === 1,
    });
    setAviso(null);
  }

  async function guardarContenido(event) {
    event.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      const payload = { ...contenido, curso_id: seleccionado, contenido_id: contenidoId };
      if (contenidoId) await api.put('/admin/talleres/contenido', payload);
      else await api.post('/admin/talleres/contenido', payload);
      setAviso({ tipo: 'ok', texto: contenidoId ? 'Contenido actualizado.' : 'Contenido añadido al curso.' });
      setContenidoId(null);
      setContenido(CONTENIDO_VACIO);
      await cargarContenidos(seleccionado);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message || 'No se pudo guardar el contenido.' });
    } finally {
      setGuardando(false);
    }
  }

  async function ocultarCurso() {
    if (!seleccionado || !window.confirm('¿Retirar este curso del catálogo? Podrás volver a publicarlo después.')) return;
    setGuardando(true);
    try {
      await api.del('/admin/talleres', { curso_id: seleccionado });
      setAviso({ tipo: 'ok', texto: 'Curso retirado del catálogo. Sus datos y progreso se conservan.' });
      await cargarCursos();
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message || 'No se pudo retirar el curso.' });
    } finally {
      setGuardando(false);
    }
  }

  async function ocultarContenido(item) {
    if (!window.confirm(`¿Retirar «${item.titulo}» del temario?`)) return;
    try {
      await api.del('/admin/talleres/contenido', { contenido_id: item.id });
      setAviso({ tipo: 'ok', texto: 'Contenido retirado; el progreso anterior se conserva.' });
      await cargarContenidos(seleccionado);
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message || 'No se pudo retirar el contenido.' });
    }
  }

  const tipoSeleccionado = TIPOS.find((item) => item.value === contenido.tipo);

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-sage-700 px-6 py-8 text-white shadow-suave sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-8 -top-12 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <BookOpen size={14} /> Gestión del campus
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">Modificar talleres</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
              Crea cursos por temas, añade recursos y actividades y actualízalos cuando lo necesites.
            </p>
          </div>
          <button type="button" onClick={crearCurso} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-sage-800 transition hover:bg-crema-50">
            <CirclePlus size={18} /> Crear curso
          </button>
        </div>
      </section>

      <Aviso aviso={aviso} />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="card-orienta h-fit p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-tierra-800">Tus cursos</h2>
              <p className="mt-1 text-xs text-stone-500">Elige uno para editarlo</p>
            </div>
            <span className="rounded-full bg-sage-50 px-2.5 py-1 text-xs font-semibold text-sage-700">{cursos.length}</span>
          </div>
          {cargando ? (
            <div className="flex items-center gap-2 py-6 text-sm text-stone-500"><LoaderCircle size={17} className="animate-spin" /> Cargando…</div>
          ) : cursos.length === 0 ? (
            <p className="rounded-2xl bg-crema-50 p-4 text-sm leading-6 text-stone-600">Aún no hay cursos. Pulsa «Crear curso» para empezar.</p>
          ) : (
            <div className="space-y-2">
              {cursos.map((item) => (
                <button key={item.id} type="button" onClick={() => seleccionarCurso(item)} className={`w-full rounded-2xl border p-4 text-left transition ${Number(seleccionado) === Number(item.id) ? 'border-sage-300 bg-sage-50 shadow-sm' : 'border-crema-200 hover:border-sage-200 hover:bg-crema-50'}`}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-semibold leading-5 text-tierra-800">{item.titulo}</span>
                    {Number(item.publicado) === 1 ? <span className="shrink-0 rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-bold text-sage-700">Publicado</span> : <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">Borrador</span>}
                  </span>
                  <span className="mt-2 block text-xs text-stone-500">{textoAcceso(item.tipo_acceso)}{item.duracion_horas ? ` · ${item.duracion_horas} h` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="space-y-6">
          <form onSubmit={guardarCurso} className="card-orienta space-y-5 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-terracota-600">{seleccionado ? 'Editar curso' : 'Nuevo curso'}</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-tierra-800">Información general</h2>
              </div>
              {seleccionado && <button type="button" onClick={ocultarCurso} disabled={guardando} className="inline-flex items-center gap-2 rounded-full border border-terracota-200 px-3 py-2 text-xs font-semibold text-terracota-700 hover:bg-terracota-50"><Trash2 size={15} /> Retirar</button>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Nombre del curso</span>
                <input required maxLength={200} value={curso.titulo} onChange={(event) => setCurso({ ...curso, titulo: event.target.value })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100" placeholder="Ej. Herramientas para la gestión emocional" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Descripción</span>
                <textarea rows={3} value={curso.descripcion} onChange={(event) => setCurso({ ...curso, descripcion: event.target.value })} className="w-full resize-y rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100" placeholder="Qué aprenderá el alumno y a quién va dirigido" />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Categoría</span>
                <input value={curso.categoria} onChange={(event) => setCurso({ ...curso, categoria: event.target.value })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100" placeholder="Crianza, emociones…" />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Duración estimada (horas)</span>
                <input required type="number" min="0.5" step="0.5" value={curso.duracion_horas} onChange={(event) => setCurso({ ...curso, duracion_horas: event.target.value })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100" placeholder="Ej. 4" />
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Acceso</span>
                <span className="relative block">
                  <select value={curso.tipo_acceso} onChange={(event) => setCurso({ ...curso, tipo_acceso: event.target.value })} className="w-full appearance-none rounded-xl border border-crema-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100">
                    <option value="gratis">Gratuito</option><option value="pago">Pago único</option><option value="membresia">Membresía mensual</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />
                </span>
              </label>
              {curso.tipo_acceso !== 'gratis' && (
                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Precio {curso.tipo_acceso === 'membresia' ? 'al mes' : ''}</span>
                    <input required type="number" min="0.5" step="0.01" value={curso.precio} onChange={(event) => setCurso({ ...curso, precio: event.target.value })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100" placeholder="0,00" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Moneda</span>
                    <input required maxLength={3} value={curso.moneda} onChange={(event) => setCurso({ ...curso, moneda: event.target.value.toUpperCase() })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm uppercase outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100" />
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-crema-200 pt-4">
              <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-tierra-800">
                <input type="checkbox" checked={Boolean(curso.publicado)} onChange={(event) => setCurso({ ...curso, publicado: event.target.checked })} className="h-4 w-4 accent-sage-600" />
                Mostrar en el catálogo
              </label>
              <button disabled={guardando} className="btn-primary disabled:opacity-60">
                {guardando ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}
                {seleccionado ? 'Guardar cambios' : 'Crear curso'}
              </button>
            </div>
          </form>

          {seleccionado && (
            <section className="card-orienta p-5 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-terracota-600">Temario</p>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-tierra-800">Temas y actividades</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">Añade cada vídeo, documento, formulario o tarea dentro de un tema. El alumno verá el orden que establezcas.</p>
                </div>
                <button type="button" onClick={nuevoContenido} className="btn-outline"><CirclePlus size={17} /> Añadir contenido</button>
              </div>

              <div className="mt-5 space-y-3">
                {cargandoContenido ? (
                  <div className="flex items-center gap-2 py-5 text-sm text-stone-500"><LoaderCircle size={17} className="animate-spin" /> Cargando temario…</div>
                ) : contenidos.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-crema-300 bg-crema-50 px-5 py-7 text-center">
                    <BookOpen className="mx-auto text-sage-600" size={26} />
                    <p className="mt-2 font-semibold text-tierra-800">Empieza por el primer tema</p>
                    <p className="mt-1 text-sm text-stone-500">Puedes añadir tantos recursos y tareas como necesites.</p>
                  </div>
                ) : contenidos.map((item) => (
                  <article key={item.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${Number(item.publicado) === 1 ? 'border-crema-200 bg-white' : 'border-stone-200 bg-stone-50 opacity-70'}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-50 text-sage-700"><IconoTipo tipo={item.tipo} /></div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-terracota-600">Tema {item.orden}: {item.tema}</p>
                        <p className="truncate font-semibold text-tierra-800">{item.titulo}</p>
                        <p className="text-xs text-stone-500">{TIPOS.find((tipo) => tipo.value === item.tipo)?.label || item.tipo}{Number(item.obligatorio) === 1 ? ' · cuenta para el progreso' : ' · opcional'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.enlace && <a href={item.enlace} target="_blank" rel="noreferrer" aria-label="Abrir enlace" className="rounded-full p-2 text-stone-500 hover:bg-crema-100"><ExternalLink size={17} /></a>}
                      <button type="button" onClick={() => editarContenido(item)} aria-label={`Editar ${item.titulo}`} className="rounded-full p-2 text-sage-700 hover:bg-sage-50"><Pencil size={17} /></button>
                      {Number(item.publicado) === 1 && <button type="button" onClick={() => ocultarContenido(item)} aria-label={`Retirar ${item.titulo}`} className="rounded-full p-2 text-terracota-700 hover:bg-terracota-50"><Trash2 size={17} /></button>}
                    </div>
                  </article>
                ))}
              </div>

              {(contenidoId || contenido.curso_id) && (
                <form onSubmit={guardarContenido} className="mt-6 space-y-4 rounded-3xl border border-sage-200 bg-sage-50/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-serif text-xl font-bold text-tierra-800">{contenidoId ? 'Editar recurso o actividad' : 'Añadir al temario'}</h3>
                    <button type="button" onClick={() => { setContenidoId(null); setContenido(CONTENIDO_VACIO); }} className="text-sm font-semibold text-stone-500 hover:text-tierra-800">Cancelar</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Tema o unidad</span>
                      <input required maxLength={180} value={contenido.tema} onChange={(event) => setContenido({ ...contenido, tema: event.target.value })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400" placeholder="Ej. Tema 1 · Comprender las emociones" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Título de la actividad</span>
                      <input required maxLength={200} value={contenido.titulo} onChange={(event) => setContenido({ ...contenido, titulo: event.target.value })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400" placeholder="Ej. Introducción al tema" />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Tipo</span>
                      <span className="relative block">
                        <select value={contenido.tipo} onChange={(event) => setContenido({ ...contenido, tipo: event.target.value })} className="w-full appearance-none rounded-xl border border-crema-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-sage-400">
                          {TIPOS.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                        </select>
                        <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />
                      </span>
                    </label>
                    <label>
                      <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Orden</span>
                      <input required type="number" min="0" value={contenido.orden} onChange={(event) => setContenido({ ...contenido, orden: event.target.value })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400" />
                    </label>
                    {contenido.tipo !== 'tarea' && (
                      <label className="sm:col-span-2">
                        <span className="mb-1.5 block text-sm font-semibold text-tierra-800">Enlace</span>
                        <input required type="url" value={contenido.enlace} onChange={(event) => setContenido({ ...contenido, enlace: event.target.value })} className="w-full rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400" placeholder={tipoSeleccionado?.placeholder} />
                        <span className="mt-1 block text-xs text-stone-500">{contenido.tipo === 'video' ? 'Pega el enlace normal de YouTube; el campus lo convertirá al formato incrustado.' : contenido.tipo === 'cuestionario' ? 'Pega el enlace de inserción de Microsoft Forms.' : 'El contenido se mostrará dentro del campus.'}</span>
                      </label>
                    )}
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-sm font-semibold text-tierra-800">{contenido.tipo === 'tarea' ? 'Instrucciones para el alumno' : 'Descripción o instrucciones (opcional)'}</span>
                      <textarea rows={3} required={contenido.tipo === 'tarea'} value={contenido.instrucciones} onChange={(event) => setContenido({ ...contenido, instrucciones: event.target.value })} className="w-full resize-y rounded-xl border border-crema-300 bg-white px-4 py-3 text-sm outline-none focus:border-sage-400" placeholder="Explica qué debe ver, responder o entregar el alumno" />
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sage-200 pt-4">
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      <label className="inline-flex items-center gap-2 text-sm text-tierra-800"><input type="checkbox" checked={Boolean(contenido.obligatorio)} onChange={(event) => setContenido({ ...contenido, obligatorio: event.target.checked })} className="accent-sage-600" /> Cuenta para el progreso</label>
                      <label className="inline-flex items-center gap-2 text-sm text-tierra-800"><input type="checkbox" checked={Boolean(contenido.publicado)} onChange={(event) => setContenido({ ...contenido, publicado: event.target.checked })} className="accent-sage-600" /> Visible para el alumno</label>
                    </div>
                    <button disabled={guardando} className="btn-primary disabled:opacity-60">{guardando ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}{contenidoId ? 'Guardar cambios' : 'Añadir al curso'}</button>
                  </div>
                </form>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
