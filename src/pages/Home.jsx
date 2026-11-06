// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Brain, BadgeCheck, HeartHandshake } from 'lucide-react';

const testimonios = [
  { texto: 'Las sesiones con Antonio han sido un antes y un después. Me ha ayudado a gestionar mi ansiedad de una forma muy práctica.', autor: 'María G.', perfil: 'Estudiante de Derecho' },
  { texto: 'Gracias al trabajo en neurodesarrollo con mi hijo, hemos notado una mejora increíble en su autonomía y confianza.', autor: 'Carlos R.', perfil: 'Padre de familia' },
  { texto: 'El enfoque resolutivo de Antonio es lo que más destaco. Herramientas reales para el día a día.', autor: 'Laura M.', perfil: 'Profesional en activo' },
];

const especialidades = [
  { icon: Brain, titulo: 'Alivio del estrés diario', texto: 'Herramientas sencillas para calmar la mente cuando la situación te desborda.', color: 'bg-sage-100 text-sage-600' },
  { icon: LifeBuoy, titulo: 'Menos agotamiento', texto: 'Aprende a poner límites y a recuperar espacios de respiro para ti.', color: 'bg-terracota-100 text-terracota-600' },
  { icon: BadgeCheck, titulo: 'Recupera tu autoestima', texto: 'Vuelve a conectar con tu propia identidad más allá de ser cuidador o cuidadora.', color: 'bg-oro-100 text-oro-600' },
  { icon: HeartHandshake, titulo: 'Paz en el entorno familiar', texto: 'Pautas de comunicación para que las decisiones del día a día se lleven en equipo.', color: 'bg-sage-100 text-sage-600' },
];

// Activa solo con testimonios reales y autorización por escrito de cada persona
const MOSTRAR_TESTIMONIOS = false;

export default function Home() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonios.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-crema-200 bg-gradient-to-br from-white via-crema-50 to-crema-200 p-8 sm:p-12">
        <img
          src="/orienta-icon.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 object-contain opacity-[0.07]"
        />
        <div className="relative flex flex-col-reverse items-center gap-8 md:flex-row md:justify-between">
          <div className="text-center md:text-left">
            <span className="inline-block rounded-full bg-sage-100 px-4 py-1 text-xs font-semibold tracking-wide text-sage-700">
              Antonio Cantillo Rueda · Psicólogo colegiado AO 14923
            </span>
            <h1 className="mt-4 font-serif text-3xl font-bold text-tierra-800 sm:text-4xl">
              ¿Cuidas de alguien y sientes que ya no te queda energía para ti?
            </h1>
            <p className="mt-4 text-stone-600">
              No tienes que llevar este peso a solas. Te acompaño de forma cercana con estrategias prácticas de autocuidado, gestión del estrés y apoyo familiar en Málaga, a domicilio y online.
            </p>
            <p className="mt-3 font-serif text-2xl font-bold text-sage-600">
              Acompañamiento a personas que cuidan
            </p>
            <p className="mt-1 font-serif italic text-terracota-500">Acompañamos a quien cuida</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              <Link to="/citas" className="btn-primary">Pedir cita</Link>
              <Link to="/registro" className="btn-outline">Crear cuenta</Link>
            </div>
          </div>
          <img
            src="/foto-perfil.jpg"
            alt="Antonio Cantillo"
            className="h-48 w-48 shrink-0 rounded-full border-4 border-oro-400 object-cover shadow-suave sm:h-56 sm:w-56"
          />
        </div>
      </section>

      {/* Imagen de la consulta */}
      <section>
        <img src="/foto-sala.jpg" alt="Consulta" className="h-80 w-full rounded-3xl object-cover shadow-suave" />
        <p className="mt-4 text-center font-serif italic text-stone-500">
          Un espacio diseñado para tu bienestar y tranquilidad.
        </p>
      </section>

      {/* Especialidades */}
      <section className="grid gap-6 md:grid-cols-2">
        {especialidades.map(({ icon: Icon, titulo, texto, color }) => (
          <div key={titulo} className="card-orienta transition hover:-translate-y-1 hover:shadow-suave">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
              <Icon size={24} />
            </div>
            <h3 className="mb-2 font-bold text-tierra-800">{titulo}</h3>
            <p className="text-sm text-stone-600">{texto}</p>
          </div>
        ))}
      </section>

      {/* Llamada a la acción */}
      <section className="rounded-3xl border border-crema-200 bg-white p-8 text-center shadow-suave sm:p-10">
        <h2 className="font-serif text-2xl font-bold text-tierra-800">No tienes que cargar con todo solo o sola. </h2>        
        <p className="mt-3 text-stone-600">
            Cuidar de un familiar con una enfermedad neurodegenerativa supone un desgaste invisible, y muchas veces quien cuida se olvida de sí mismo hasta llegar al límite. Mi objetivo es acompañarte para que encuentres respiro, alivies la tensión y recuperes el equilibrio en tu día a día, sin tecnicismos y con pautas que te funcionen en casa.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/citas" className="btn-primary">Pedir cita previa</Link>
          <a href="https://wa.me/34678766839" target="_blank" rel="noopener noreferrer" className="btn-outline">Consultar dudas por WhatsApp</a>
        </div>
        <p className="mx-auto mt-3 max-w-xl text-stone-600">
          Atención a domicilio en Málaga capital y online, adaptadas a tus horarios y necesidades.
        </p>
      </section>

      {/* Carrusel de testimonios (desactivado hasta tener testimonios reales) */}
      <section className="overflow-hidden rounded-3xl bg-sage-500 px-6 py-12 text-center text-white">
        <h2 className="mb-8 font-serif text-2xl font-bold">Lo que dicen de nosotros</h2>
        <div className="relative flex h-44 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="absolute w-full max-w-lg"
            >
              <p className="mb-3 font-serif text-lg italic">“{testimonios[index].texto}”</p>
              <div className="font-bold text-oro-300">{testimonios[index].autor}</div>
              <div className="text-sm text-sage-100">{testimonios[index].perfil}</div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-2 flex justify-center gap-2">
          {testimonios.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i === index ? 'bg-oro-400' : 'bg-white/40'}`} />
          ))}
        </div>
      </section>
  
    </div>
  );
}
