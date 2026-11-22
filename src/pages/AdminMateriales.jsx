import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, FolderPlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';

const CATEGORIA_VACIA = { nombre: '', descripcion: '', orden: 0 };
const MATERIAL_VACIO = { titulo: '', descripcion: '', categoria_id: '', enlace_drive: '', orden: 0, publicado: true };
const inputClass = 'w-full rounded-xl border border-crema-300 bg-white px-3.5 py-2.5 text-sm text-tierra-800 outline-none transition focus:border-sage-400 focus:ring-2 focus:ring-sage-100';

function urlVistaDrive(url = '') {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(parsed.hostname.toLowerCase())) return '';
    const match = parsed.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
    const id = match?.[1] || parsed.searchParams.get('id');
    return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : '';
  } catch { return ''; }
}

export default function AdminMateriales() {
  const [categorias, setCategorias] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [categoriaForm, setCategoriaForm] = useState(CATEGORIA_VACIA);
  const [materialForm, setMaterialForm] = useState(MATERIAL_VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const data = await api.get('/admin/materiales');
      setCategorias(data.categorias || []);
      setMateriales(data.materiales || []);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudo cargar la administración de materiales.' });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function ejecutar(fn, texto) {
    setGuardando(true);
    setMensaje(null);
    try {
      await fn();
      setMensaje({ tipo: 'ok', texto });
      await cargar();
      return true;
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message || 'No se pudieron guardar los cambios.' });
      return false;
    } finally {
      setGuardando(false);
    }
  }

  function guardarCategoria(event) {
    event.preventDefault();
    const editando = Boolean(categoriaForm.id);
    ejecutar(
      () => editando
        ? api.put('/admin/materiales', { ...categoriaForm, tipo: 'categoria' })
        : api.post('/admin/materiales', { ...categoriaForm, tipo: 'categoria' }),
      editando ? 'Categoría actualizada.' : 'Categoría añadida.'
    ).then((ok) => { if (ok) setCategoriaForm(CATEGORIA_VACIA); });
  }

  function guardarMaterial(event) {
    event.preventDefault();
    const editando = Boolean(materialForm.id);
    ejecutar(
      () => editando
        ? api.put('/admin/materiales', { ...materialForm, tipo: 'material' })
        : api.post('/admin/materiales', { ...materialForm, tipo: 'material' }),
      editando ? 'Material actualizado.' : 'Material añadido.'
    ).then((ok) => { if (ok) setMaterialForm(MATERIAL_VACIO); });
  }

  function editarMaterial(item) {
    setMaterialForm({
      id: item.id,
      titulo: item.titulo || '',
      descripcion: item.descripcion || '',
      categoria_id: item.categoria_id == null ? '' : String(item.categoria_id),
      enlace_drive: item.enlace_drive || '',
      orden: item.orden ?? 0,
      publicado: Boolean(Number(item.publicado)),
    });
    document.getElementById('form-material')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function eliminarCategoria(item) {
    if (!window.confirm(`¿Eliminar la categoría «${item.nombre}»? Los documentos se conservarán en «Otros materiales».`)) return;
    ejecutar(() => api.del('/admin/materiales', { tipo: 'categoria', id: item.id }), 'Categoría eliminada.');
  }

  function eliminarMaterial(item) {
    if (!window.confirm(`¿Eliminar definitivamente «${item.titulo}»?`)) return;
    ejecutar(() => api.del('/admin/materiales', { tipo: 'material', id: item.id }), 'Material eliminado.');
  }

  if (cargando) return <p className="text-sm text-stone-500">Cargando materiales…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-oro-50 via-white to-crema-100 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oro-600">Administración</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-tierra-800">Materiales y guías</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Organiza la biblioteca, añade enlaces de Google Drive y decide qué documentos aparecen en el catálogo.
        </p>
      </header>

      {mensaje && <div role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${mensaje.tipo === 'ok' ? 'border-sage-200 bg-sage-50 text-sage-700' : 'border-terracota-200 bg-terracota-50 text-terracota-700'}`}>{mensaje.texto}</div>}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="card-orienta h-fit">
          <div className="mb-4 flex items-center gap-2">
            <FolderPlus className="text-sage-600" size={20} />
            <h2 className="text-lg font-bold text-tierra-800">{categoriaForm.id ? 'Editar categoría' : 'Añadir categoría'}</h2>
          </div>
          <form onSubmit={guardarCategoria} className="space-y-3">
            <label className="block text-sm font-medium text-stone-700">Nombre
              <input className={`${inputClass} mt-1`} maxLength={120} value={categoriaForm.nombre} onChange={(e) => setCategoriaForm({ ...categoriaForm, nombre: e.target.value })} placeholder="Ej.: Envejecimiento" required />
            </label>
            <label className="block text-sm font-medium text-stone-700">Descripción breve
              <textarea className={`${inputClass} mt-1 min-h-20 resize-y`} maxLength={500} value={categoriaForm.descripcion} onChange={(e) => setCategoriaForm({ ...categoriaForm, descripcion: e.target.value })} placeholder="Opcional" />
            </label>
            <label className="block text-sm font-medium text-stone-700">Orden en el catálogo
              <input className={`${inputClass} mt-1`} type="number" min="0" value={categoriaForm.orden} onChange={(e) => setCategoriaForm({ ...categoriaForm, orden: e.target.value })} />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="inline-flex items-center gap-2 rounded-full bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage-700 disabled:opacity-60" disabled={guardando}>
                {categoriaForm.id ? <Save size={16} /> : <Plus size={16} />}{categoriaForm.id ? 'Guardar categoría' : 'Añadir categoría'}
              </button>
              {categoriaForm.id && <button type="button" onClick={() => setCategoriaForm(CATEGORIA_VACIA)} className="inline-flex items-center gap-2 rounded-full border border-crema-300 px-4 py-2.5 text-sm text-stone-600"><X size={16} />Cancelar</button>}
            </div>
          </form>

          <div className="mt-6 border-t border-crema-200 pt-4">
            <h3 className="mb-2 text-sm font-bold text-tierra-800">Categorías ({categorias.length})</h3>
            {categorias.length ? <ul className="space-y-2">
              {categorias.map((item) => <li key={item.id} className="flex items-center gap-2 rounded-xl bg-crema-50 px-3 py-2.5">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-tierra-800">{item.nombre}</span><span className="text-xs text-stone-500">Orden {item.orden}</span></span>
                <button type="button" aria-label={`Editar ${item.nombre}`} onClick={() => setCategoriaForm({ id: item.id, nombre: item.nombre, descripcion: item.descripcion || '', orden: item.orden ?? 0 })} className="rounded-lg p-2 text-stone-500 hover:bg-white hover:text-sage-700"><Pencil size={16} /></button>
                <button type="button" aria-label={`Eliminar ${item.nombre}`} onClick={() => eliminarCategoria(item)} className="rounded-lg p-2 text-stone-500 hover:bg-white hover:text-terracota-600"><Trash2 size={16} /></button>
              </li>)}
            </ul> : <p className="text-sm text-stone-500">Aún no hay categorías.</p>}
          </div>
        </div>

        <div id="form-material" className="card-orienta scroll-mt-24">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="text-terracota-600" size={20} />
            <h2 className="text-lg font-bold text-tierra-800">{materialForm.id ? 'Editar documento' : 'Añadir documento'}</h2>
          </div>
          <form onSubmit={guardarMaterial} className="space-y-3">
            <label className="block text-sm font-medium text-stone-700">Título
              <input className={`${inputClass} mt-1`} maxLength={200} value={materialForm.titulo} onChange={(e) => setMaterialForm({ ...materialForm, titulo: e.target.value })} placeholder="Nombre del documento" required />
            </label>
            <label className="block text-sm font-medium text-stone-700">Categoría
              <select className={`${inputClass} mt-1`} value={materialForm.categoria_id} onChange={(e) => setMaterialForm({ ...materialForm, categoria_id: e.target.value })}>
                <option value="">Otros materiales (sin categoría)</option>
                {categorias.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-stone-700">Enlace compartido de Google Drive
              <input className={`${inputClass} mt-1`} type="url" value={materialForm.enlace_drive} onChange={(e) => setMaterialForm({ ...materialForm, enlace_drive: e.target.value })} placeholder="https://drive.google.com/file/d/…/view" required />
            </label>
            <p className="-mt-1 text-xs leading-5 text-stone-500">En Drive, comparte el archivo con permiso de lector. Para limitar la descarga, desactiva la opción de descargar, imprimir y copiar para lectores.</p>
            <label className="block text-sm font-medium text-stone-700">Descripción
              <textarea className={`${inputClass} mt-1 min-h-20 resize-y`} maxLength={1000} value={materialForm.descripcion} onChange={(e) => setMaterialForm({ ...materialForm, descripcion: e.target.value })} placeholder="Breve explicación para el usuario" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-stone-700">Orden dentro de la categoría
                <input className={`${inputClass} mt-1`} type="number" min="0" value={materialForm.orden} onChange={(e) => setMaterialForm({ ...materialForm, orden: e.target.value })} />
              </label>
              <label className="flex items-center gap-2 self-end rounded-xl border border-crema-200 px-3.5 py-3 text-sm text-stone-700">
                <input type="checkbox" checked={materialForm.publicado} onChange={(e) => setMaterialForm({ ...materialForm, publicado: e.target.checked })} className="h-4 w-4 accent-sage-600" />Mostrar en el catálogo
              </label>
            </div>
            {urlVistaDrive(materialForm.enlace_drive) && <div className="rounded-xl bg-sage-50 px-3 py-2 text-xs text-sage-700">El enlace se mostrará dentro del visor de la web.</div>}
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="inline-flex items-center gap-2 rounded-full bg-terracota-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-terracota-600 disabled:opacity-60" disabled={guardando}>
                {materialForm.id ? <Save size={16} /> : <Plus size={16} />}{materialForm.id ? 'Guardar documento' : 'Añadir documento'}
              </button>
              {materialForm.id && <button type="button" onClick={() => setMaterialForm(MATERIAL_VACIO)} className="inline-flex items-center gap-2 rounded-full border border-crema-300 px-4 py-2.5 text-sm text-stone-600"><X size={16} />Cancelar</button>}
            </div>
          </form>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-tierra-800">Documentos ({materiales.length})</h2>
        </div>
        {materiales.length ? <div className="grid gap-3 md:grid-cols-2">
          {materiales.map((item) => <article key={item.id} className="card-orienta !p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-terracota-50 text-terracota-600"><FileText size={19} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-tierra-800">{item.titulo}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${Number(item.publicado) ? 'bg-sage-100 text-sage-700' : 'bg-stone-100 text-stone-500'}`}>{Number(item.publicado) ? 'Publicado' : 'Borrador'}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">{item.categoria || 'Otros materiales'} · Orden {item.orden}</p>
                {item.descripcion && <p className="mt-2 line-clamp-2 text-sm text-stone-600">{item.descripcion}</p>}
                <a className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs text-sage-700 underline" href={item.enlace_drive} target="_blank" rel="noreferrer"><ExternalLink size={13} />Abrir enlace de Drive</a>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2 border-t border-crema-100 pt-3">
              <button type="button" onClick={() => editarMaterial(item)} className="inline-flex items-center gap-1.5 rounded-full border border-crema-300 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-crema-50"><Pencil size={14} />Editar</button>
              <button type="button" onClick={() => eliminarMaterial(item)} className="inline-flex items-center gap-1.5 rounded-full border border-terracota-200 px-3 py-1.5 text-xs font-semibold text-terracota-600 hover:bg-terracota-50"><Trash2 size={14} />Eliminar</button>
            </div>
          </article>)}
        </div> : <div className="rounded-2xl border border-dashed border-crema-300 bg-white p-8 text-center text-sm text-stone-500">Todavía no has añadido documentos.</div>}
      </section>
      <p className="text-xs leading-5 text-stone-500">La vista integrada evita ofrecer un botón propio de descarga; Google Drive puede permitir extraer el enlace o capturar el contenido. Los permisos del archivo deben configurarse en Drive.</p>
    </div>
  );
}
