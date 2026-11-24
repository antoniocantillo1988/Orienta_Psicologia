import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleHelp, MessageCircle } from 'lucide-react';

const preguntas = [
  {
    pregunta: '¿A quién va dirigido el servicio?',
    respuesta: 'A familiares y personas cuidadoras de personas con Alzheimer u otras enfermedades neurodegenerativas que necesitan apoyo para comprender lo que están viviendo, cuidar su bienestar y encontrar herramientas prácticas para el día a día.',
  },
  {
    pregunta: '¿Necesito que mi familiar tenga un diagnóstico de Alzheimer?',
    respuesta: 'No es imprescindible que exista un diagnóstico confirmado. El acompañamiento se centra en ti y en cómo estás viviendo el cuidado. La valoración y el tratamiento médico de tu familiar corresponden a sus profesionales sanitarios.',
  },
  {
    pregunta: '¿Puedo acudir aunque sea otro familiar quien se encargue principalmente de los cuidados?',
    respuesta: 'Sí. No es necesario ser la persona cuidadora principal. Puede participar cualquier familiar o persona cercana implicada en el cuidado que necesite orientación y apoyo.',
  },
  {
    pregunta: '¿Cómo funciona la primera consulta?',
    respuesta: 'La primera consulta es totalmente gratuita y sirve para conocer tu situación, escuchar qué te preocupa y valorar cómo puedo acompañarte. No tienes que preparar nada; puedes compartir solo aquello con lo que te sientas cómodo o cómoda.',
  },
  {
    pregunta: '¿Cuánto dura una sesión?',
    respuesta: 'Cada sesión dura 45 minutos.',
  },
  {
    pregunta: '¿Cuál es el precio?',
    respuesta: 'La primera consulta es totalmente gratuita. Después, una sesión individual cuesta 50 €. También puedes elegir el bono promocional de 10 sesiones por 300 € (30 € por sesión), con un ahorro de 200 € frente a diez sesiones individuales.',
  },
  {
    pregunta: '¿Puedo realizar las consultas online?',
    respuesta: 'Sí. Puedes realizar las consultas online. Una vez confirmada la cita, recibirás la información necesaria para conectarte a la videollamada.',
  },
  {
    pregunta: '¿Ofrecéis atención a domicilio?',
    respuesta: 'Sí, se ofrece atención a domicilio en Málaga capital. Puedes consultarme la disponibilidad para tu zona al solicitar la cita.',
  },
  {
    pregunta: '¿Puedo cancelar o modificar una cita?',
    respuesta: 'Puedes cancelar una cita confirmada desde el apartado de citas de tu cuenta. Si necesitas cambiarla, escríbeme lo antes posible para revisar otras fechas disponibles. Si tienes dudas sobre las condiciones, consúltamelas al reservar.',
  },
  {
    pregunta: '¿Qué ocurre si necesito ayuda urgente?',
    respuesta: 'Orienta Psicología no es un servicio de urgencias y una cita no sustituye la atención inmediata. Si hay un peligro inmediato, llama al 112 o acude a urgencias. Si tú o alguien cercano tiene pensamientos o riesgo de conducta suicida, puedes llamar al 024; es gratuito, confidencial y está disponible las 24 horas. Si existe una emergencia vital inminente, llama directamente al 112.',
    enlaces: true,
  },
];

export default function PreguntasFrecuentes() {
  const [mostrarOferta, setMostrarOferta] = useState(false);
  const cerrarOfertaRef = useRef(null);

  useEffect(() => {
    const demora = 6_000;
    let restante = demora;
    let temporizador = null;
    let inicioTramo = 0;
    let actividadIniciada = false;
    let contextoAudio = null;

    function activarSonido() {
      const AudioContexto = window.AudioContext || window.webkitAudioContext;
      if (!AudioContexto) return;
      try {
        if (!contextoAudio) contextoAudio = new AudioContexto();
        if (contextoAudio.state === 'suspended') contextoAudio.resume().catch(() => {});
      } catch {
        contextoAudio = null;
      }
    }

    function sonarLlamada() {
      if (!contextoAudio || contextoAudio.state !== 'running') return;
      const ahora = contextoAudio.currentTime;
      [880, 1174, 1568].forEach((frecuencia, indice) => {
        const oscilador = contextoAudio.createOscillator();
        const volumen = contextoAudio.createGain();
        const comienzo = ahora + indice * 0.09;
        oscilador.type = 'sine';
        oscilador.frequency.value = frecuencia;
        volumen.gain.setValueAtTime(0.0001, comienzo);
        volumen.gain.exponentialRampToValueAtTime(0.12, comienzo + 0.025);
        volumen.gain.exponentialRampToValueAtTime(0.0001, comienzo + 0.42);
        oscilador.connect(volumen);
        volumen.connect(contextoAudio.destination);
        oscilador.start(comienzo);
        oscilador.stop(comienzo + 0.45);
      });
    }

    function abrirOferta() {
      temporizador = null;
      restante = 0;
      setMostrarOferta(true);
      sonarLlamada();
    }

    function continuarCuenta() {
      if (!actividadIniciada || temporizador || restante <= 0 || document.visibilityState !== 'visible') return;
      inicioTramo = Date.now();
      temporizador = window.setTimeout(abrirOferta, restante);
    }

    function pausarCuenta() {
      if (!temporizador) return;
      window.clearTimeout(temporizador);
      temporizador = null;
      restante = Math.max(0, restante - (Date.now() - inicioTramo));
    }

    function iniciarActividad() {
      activarSonido();
      actividadIniciada = true;
      continuarCuenta();
    }

    function cambiarVisibilidad() {
      if (document.visibilityState === 'visible') continuarCuenta();
      else pausarCuenta();
    }

    document.addEventListener('pointerdown', iniciarActividad);
    document.addEventListener('keydown', iniciarActividad);
    document.addEventListener('touchstart', iniciarActividad, { passive: true });
    document.addEventListener('visibilitychange', cambiarVisibilidad);

    return () => {
      pausarCuenta();
      document.removeEventListener('pointerdown', iniciarActividad);
      document.removeEventListener('keydown', iniciarActividad);
      document.removeEventListener('touchstart', iniciarActividad);
      document.removeEventListener('visibilitychange', cambiarVisibilidad);
      if (contextoAudio && contextoAudio.state !== 'closed') contextoAudio.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!mostrarOferta) return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarOfertaRef.current?.focus();
    return () => { document.body.style.overflow = overflowAnterior; };
  }, [mostrarOferta]);

  function manejarTeclasOferta(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      return;
    }
    if (event.key !== 'Tab') return;
    const controles = event.currentTarget.querySelectorAll('a[href], button:not([disabled])');
    if (!controles.length) {
      event.preventDefault();
      return;
    }
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    if (event.shiftKey && document.activeElement === primero) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && document.activeElement === ultimo) {
      event.preventDefault();
      primero.focus();
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-sage-50 via-white to-crema-100 p-6 sm:p-9">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-terracota-600"><CircleHelp size={16} /> Orienta Psicología</p>
        <h1 className="mt-3 font-serif text-3xl font-bold text-tierra-800 sm:text-4xl">Preguntas frecuentes</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-stone-600">
          Información sobre el acompañamiento a familiares y personas cuidadoras. Si tu pregunta no aparece aquí, puedes consultármela directamente.
        </p>
      </header>

      {mostrarOferta && (
        <div onKeyDown={manejarTeclasOferta} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-tierra-800/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="oferta-titulo" aria-describedby="oferta-descripcion">
          <div className="relative my-auto w-full max-w-xl overflow-hidden rounded-3xl bg-gradient-to-br from-sage-700 via-sage-600 to-terracota-500 p-6 text-white shadow-2xl sm:p-9">
            <div aria-hidden="true" className="absolute -right-8 -top-14 h-52 w-52 rounded-full border-[24px] border-white/10" />
            <div aria-hidden="true" className="absolute -bottom-12 right-24 h-36 w-36 rounded-full bg-oro-300/20 blur-sm" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-oro-200">Oferta promocional</p>
              <h2 id="oferta-titulo" className="mt-2 font-serif text-2xl font-bold sm:text-3xl">Bono de 10 sesiones</h2>
              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
                <span className="text-4xl font-extrabold sm:text-5xl">300 €</span>
                <span className="pb-1 text-sm font-semibold text-white/90">30 € por sesión</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">40 % de ahorro</span>
              </div>
              <p id="oferta-descripcion" className="mt-3 max-w-2xl text-sm leading-6 text-white/90">
                La primera sesión de acogida es totalmente gratuita.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/citas" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-sage-700 transition hover:bg-oro-100">
                  Solicitar consulta gratuita <ArrowRight size={16} />
                </Link>
                <button ref={cerrarOfertaRef} type="button" onClick={() => setMostrarOferta(false)} className="rounded-full border border-white/70 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-sage-600">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3" aria-label="Respuestas a preguntas frecuentes">
        {preguntas.map((item) => (
          <details key={item.pregunta} className="group rounded-2xl border border-crema-200 bg-white shadow-sm open:shadow-suave">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-tierra-800 marker:hidden sm:p-6">
              <span>{item.pregunta}</span>
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sage-700 transition group-open:rotate-45">+</span>
            </summary>
            <div className="border-t border-crema-100 px-5 pb-5 pt-4 text-sm leading-7 text-stone-600 sm:px-6 sm:pb-6">
              <p>{item.respuesta}</p>
              {item.enlaces && <p className="mt-3 text-xs text-stone-500">
                Más información: <a className="font-medium text-sage-700 underline" href="https://www.sanidad.gob.es/linea024/home.htm" target="_blank" rel="noopener noreferrer">Línea 024 del Ministerio de Sanidad</a> · <a className="font-medium text-sage-700 underline" href="https://administracion.gob.es/tu-espacio-europeo/derechos-obligaciones/ciudadanos/asistencia-sanitaria/numeros-urgencia" target="_blank" rel="noopener noreferrer">Teléfono de emergencias 112</a>.
              </p>}
            </div>
          </details>
        ))}
      </section>

      <section className="rounded-3xl border border-crema-200 bg-white p-6 text-center shadow-suave sm:p-8">
        <h2 className="font-serif text-xl font-bold text-tierra-800">¿Quieres hablar sobre tu situación?</h2>
        <p className="mt-2 text-sm text-stone-600">Puedes solicitar una cita o escribirme si necesitas resolver una duda antes.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/citas" className="btn-primary inline-flex items-center gap-2">Solicitar cita <ArrowRight size={16} /></Link>
          <a href="https://wa.me/34678766839" target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center gap-2"><MessageCircle size={16} />Consultar por WhatsApp</a>
        </div>
      </section>
    </div>
  );
}