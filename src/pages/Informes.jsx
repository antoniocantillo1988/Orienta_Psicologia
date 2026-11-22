import { useEffect, useState } from 'react';
import { Award, CalendarDays, Clock3, LoaderCircle, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

function fechaLegible(fecha) {
  if (!fecha) return '';
  const parsed = new Date(fecha);
  return Number.isNaN(parsed.getTime()) ? String(fecha) : parsed.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Informes() {
  const { user } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [imprimiendo, setImprimiendo] = useState(null);

  useEffect(() => {
    let activo = true;
    api.get('/cursos/mis-cursos')
      .then((data) => { if (activo) setCursos((data.cursos || []).filter((curso) => curso.fecha_finalizacion && Number(curso.porcentaje) === 100)); })
      .catch((err) => { if (activo) setError(err.message || 'No se pudieron cargar los certificados.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  function imprimir(cursoId) {
    setImprimiendo(String(cursoId));
    window.setTimeout(() => window.print(), 100);
  }

  useEffect(() => {
    const terminar = () => setImprimiendo(null);
    window.addEventListener('afterprint', terminar);
    return () => window.removeEventListener('afterprint', terminar);
  }, []);

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracota-600">Tus logros</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-tierra-800">Informes y certificados</h1>
        <p className="mt-2 text-sm text-stone-500">Los diplomas aparecen al completar todas las actividades obligatorias del curso.</p>
      </div>

      {cargando ? <div className="card-orienta flex items-center justify-center gap-3 py-12 text-sm text-stone-500"><LoaderCircle className="animate-spin" size={19} /> Buscando tus certificados…</div>
        : error ? <div className="card-orienta p-5 text-sm text-terracota-700" role="alert">{error}</div>
          : cursos.length === 0 ? <div className="card-orienta py-12 text-center"><Award className="mx-auto text-oro-500" size={36} /><h2 className="mt-4 font-serif text-xl font-bold text-tierra-800">Aún no tienes certificados</h2><p className="mt-2 text-sm text-stone-500">Cuando termines un curso, su certificado estará disponible aquí.</p></div>
            : <div className="space-y-8">{cursos.map((curso) => (
              <article key={curso.id} className={`certificate-print-card relative overflow-hidden rounded-2xl border-[6px] border-double border-oro-300 bg-[#fffdf7] p-6 shadow-suave sm:p-10 ${imprimiendo === String(curso.id) ? 'certificate-print-target' : ''}`}>
                <div className="absolute inset-3 rounded-xl border border-oro-200" aria-hidden="true" />
                <div className="relative text-center">
                  <img src="/orienta-icon.png" alt="Orienta Psicología" className="mx-auto h-16 w-16 object-contain" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-sage-700">Orienta Psicología</p>
                  <Award className="mx-auto mt-6 text-oro-500" size={36} />
                  <h2 className="mt-3 font-serif text-3xl font-bold text-tierra-800 sm:text-4xl">Certificado de aprovechamiento</h2>
                  <p className="mx-auto mt-5 max-w-2xl text-stone-600">Se certifica que</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-sage-800">{user?.nombre_usuario || 'Participante'}</p>
                  <p className="mx-auto mt-4 max-w-2xl leading-7 text-stone-600">ha completado satisfactoriamente la formación</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-tierra-800">{curso.titulo}</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-stone-600">
                    <span className="inline-flex items-center gap-2"><Clock3 size={16} /> Duración: <strong>{curso.duracion_horas || '—'} horas</strong></span>
                    <span className="inline-flex items-center gap-2"><CalendarDays size={16} /> Finalizado el {fechaLegible(curso.fecha_finalizacion)}</span>
                  </div>
                  <div className="mx-auto mt-10 max-w-xs border-t border-stone-400 pt-2">
                    <p className="font-serif text-xl italic text-sage-800">Antonio Cantillo Rueda</p>
                    <p className="mt-1 text-xs text-stone-500">Dirección · Orienta Psicología</p>
                  </div>
                  <p className="mt-6 text-[10px] tracking-wide text-stone-400">Emitido por Orienta Psicología</p>
                </div>
                <button type="button" onClick={() => imprimir(curso.id)} className="no-print btn-primary relative mx-auto mt-7"><Printer size={16} /> Imprimir o guardar como PDF</button>
              </article>
            ))}</div>}
      <style>{`@media print { @page { size: A4 landscape; margin: 12mm; } body { background: white !important; } body * { visibility: hidden !important; } .certificate-print-card, .certificate-print-card * { visibility: visible !important; } .certificate-print-card { display: none !important; position: absolute !important; inset: 0 !important; width: 100% !important; box-shadow: none !important; break-inside: avoid; } .certificate-print-card.certificate-print-target { display: block !important; } .no-print { display: none !important; } }`}</style>
    </div>
  );
}
