// src/components/FeedbackPopout.jsx
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';

const FORM_URL =
  'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=DQSIkWdsW0yxEjajBLZtrQAAAAAAAAAAAAa__ZDUP6BUQUROUFJFNEdBT0lNOFVVOFFPMDJTMUFXTS4u&embed=true';

const TIEMPO_ACTIVO_MS = 30000;   // segundos de actividad antes de abrir
const INACTIVIDAD_MS = 10000;     // sin interacción durante 10 s = inactivo
const CLAVE_STORAGE = 'feedback_mostrado';

export default function FeedbackPopout() {
  const [abierto, setAbierto] = useState(false);
  const tiempoActivo = useRef(0);
  const ultimaInteraccion = useRef(Date.now());

  // Registra la actividad del usuario
  useEffect(() => {
    const marcar = () => { ultimaInteraccion.current = Date.now(); };
    const eventos = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    return () => eventos.forEach((e) => window.removeEventListener(e, marcar));
  }, []);

  // Cuenta el tiempo activo y abre la ventana al llegar a 30 s
  useEffect(() => {
    if (sessionStorage.getItem(CLAVE_STORAGE)) return;

    let ultimo = Date.now();
    const intervalo = setInterval(() => {
      const ahora = Date.now();
      const activo = !document.hidden && ahora - ultimaInteraccion.current < INACTIVIDAD_MS;
      if (activo) tiempoActivo.current += ahora - ultimo;
      ultimo = ahora;

      if (tiempoActivo.current >= TIEMPO_ACTIVO_MS) {
        clearInterval(intervalo);
        sessionStorage.setItem(CLAVE_STORAGE, '1');
        setAbierto(true);
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, []);

  // Escape para cerrar y bloqueo del scroll mientras está abierto
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => e.key === 'Escape' && setAbierto(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [abierto]);

  return (
    <>
      {/* Botón flotante (siempre disponible) */}
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-sage-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sage-600"
      >
        <MessageSquare size={16} /> Tu opinión
      </button>

      {/* Ventana emergente */}
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Déjanos tu opinión"
            className="relative flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-crema-300 px-4 py-3">
              <h2 className="font-semibold text-tierra-800">Déjanos tu opinión</h2>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="p-1 text-stone-400 hover:text-terracota-600"
              >
                <X size={20} />
              </button>
            </div>

            <iframe
              src={FORM_URL}
              title="Formulario de opinión"
              className="w-full flex-1 border-0"
            />
          </div>
        </div>
      )}
    </>
  );
}