import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, FileText, FolderOpen, LoaderCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function Material() {
  const [categorias, setCategorias] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [categoriaAbierta, setCategoriaAbierta] = useState(null);
  const [materialId, setMaterialId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api.get('/materiales')
      .then((data) => {
        if (!activo) return;
        const lista = data.materiales || [];
        setCategorias(data.categorias || []);
        setMateriales(lista);
        if (lista.length) {
          setMaterialId(lista[0].id);
          setCategoriaAbierta(lista[0].categoria_id ?? 'sin-categoria');
        }
      })
      .catch((err) => { if (activo) setError(err.message || 'No se pudieron cargar los materiales.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  const materialSeleccionado = useMemo(
    () => materiales.find((item) => Number(item.id) === Number(materialId)) || null,
    [materiales, materialId]
  );

  function abrirCategoria(categoriaId) {
    setCategoriaAbierta((actual) => actual === categoriaId ? null : categoriaId);
    const primero = materiales.find((item) => (item.categoria_id ?? 'sin-categoria') === categoriaId);
    if (primero) setMaterialId(primero.id);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 rounded-3xl bg-gradient-to-br from-sage-50 via-white to-crema-100 p-6 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracota-600">Biblioteca Orienta</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-tierra-800 sm:text-4xl">Materiales y guías</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
          Consulta documentos y recursos organizados por temas, desde un único espacio.
        </p>
      </header>

      {cargando ? (
        <div className="card-orienta flex items-center justify-center gap-3 py-16 text-sm text-stone-500" role="status">
          <LoaderCircle className="animate-spin" size={20} /> Cargando materiales…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-terracota-200 bg-terracota-50 p-5 text-sm text-terracota-700" role="alert">
          <p className="font-semibold">No se pudo cargar el catálogo.</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : materiales.length === 0 && categorias.length === 0 ? (
        <div className="card-orienta py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
            <FolderOpen size={28} />
          </div>
          <h2 className="font-serif text-xl font-bold text-tierra-800">Estamos preparando la biblioteca</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
            Pronto encontrarás aquí materiales y guías organizados por categorías.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-crema-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
            <div className="mb-3 flex items-center gap-2 px-2 text-sm font-bold text-tierra-800">
              <FolderOpen size={17} className="text-sage-600" /> Categorías
            </div>
            <nav aria-label="Categorías de materiales" className="space-y-1">
              {categorias.map((categoria) => {
                const abierto = categoriaAbierta === categoria.id;
                const lista = materiales.filter((item) => Number(item.categoria_id) === Number(categoria.id));
                return (
                  <div key={categoria.id} className="overflow-hidden rounded-xl">
                    <button
                      type="button"
                      onClick={() => abrirCategoria(categoria.id)}
                      aria-expanded={abierto}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${abierto ? 'bg-sage-50 text-sage-700' : 'text-stone-600 hover:bg-crema-100'}`}
                    >
                      <span className="flex-1">{categoria.nombre}</span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-stone-500">{lista.length}</span>
                      <ChevronDown size={16} className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />
                    </button>
                    {abierto && (
                      <div className="space-y-1 pb-2 pl-3 pt-1">
                        {lista.length ? lista.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMaterialId(item.id)}
                            className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs leading-5 transition ${Number(materialId) === Number(item.id) ? 'bg-terracota-50 font-semibold text-terracota-700' : 'text-stone-600 hover:bg-crema-50'}`}
                          >
                            <FileText size={14} className="mt-0.5 shrink-0" />
                            <span>{item.titulo}</span>
                          </button>
                        )) : <p className="px-3 py-2 text-xs text-stone-400">Aún no hay documentos.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
              {materiales.some((item) => !item.categoria_id) && (() => {
                const lista = materiales.filter((item) => !item.categoria_id);
                const abierto = categoriaAbierta === 'sin-categoria';
                return (
                  <div className="overflow-hidden rounded-xl" key="sin-categoria">
                    <button type="button" onClick={() => abrirCategoria('sin-categoria')} aria-expanded={abierto}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${abierto ? 'bg-sage-50 text-sage-700' : 'text-stone-600 hover:bg-crema-100'}`}>
                      <span className="flex-1">Otros materiales</span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-stone-500">{lista.length}</span>
                      <ChevronDown size={16} className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />
                    </button>
                    {abierto && <div className="space-y-1 pb-2 pl-3 pt-1">{lista.map((item) => (
                      <button key={item.id} type="button" onClick={() => setMaterialId(item.id)}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs leading-5 ${Number(materialId) === Number(item.id) ? 'bg-terracota-50 font-semibold text-terracota-700' : 'text-stone-600 hover:bg-crema-50'}`}>
                        <FileText size={14} className="mt-0.5 shrink-0" /><span>{item.titulo}</span>
                      </button>
                    ))}</div>}
                  </div>
                );
              })()}
            </nav>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-crema-200 bg-white shadow-sm">
            {materialSeleccionado ? (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-crema-200 px-5 py-4 sm:px-6">
                  <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-terracota-600">
                    {materialSeleccionado.categoria || 'Otros materiales'}
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-bold text-tierra-800">{materialSeleccionado.titulo}</h2>
                  {materialSeleccionado.descripcion && <p className="mt-2 text-sm leading-6 text-stone-600">{materialSeleccionado.descripcion}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 rounded-xl bg-sage-50 px-3 py-2 text-sage-700">
                    <img src="/orienta-icon.png" alt="" className="h-8 w-8 object-contain" />
                    <span className="hidden text-xs font-bold sm:inline">Orienta Psicología</span>
                  </div>
                </div>
                <div className="bg-stone-100 p-2 sm:p-4">
                  <iframe
                    key={materialSeleccionado.id}
                    src={materialSeleccionado.embed_url}
                    title={`Documento: ${materialSeleccionado.titulo}`}
                    className="h-[70vh] min-h-[32rem] w-full rounded-xl border border-crema-200 bg-white"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    allow="autoplay"
                  />
                </div>
                <p className="px-5 py-3 text-xs leading-5 text-stone-500 sm:px-6">
                  Documento integrado en el visor de Google Drive. La disponibilidad depende de los permisos configurados por Orienta.
                </p>
              </>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
                <BookOpen size={30} className="text-sage-500" />
                <p className="mt-3 font-semibold text-tierra-800">{materiales.length ? 'Elige un documento' : 'Todavía no hay documentos publicados'}</p>
                <p className="mt-1 text-sm text-stone-500">{materiales.length ? 'Selecciona un material de las categorías.' : 'Las categorías aparecerán aquí cuando se añadan materiales.'}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
