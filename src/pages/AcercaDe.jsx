// src/pages/AcercaDe.jsx
import { Link } from 'react-router-dom';
import {
  GraduationCap, Award, BadgeCheck, HeartHandshake, Brain, MapPin,
  Phone, AtSign, ClipboardList, Route, RefreshCw,
} from 'lucide-react';

const credenciales = [
  { icon: GraduationCap, texto: 'Graduado en Psicología por la Universidad de Málaga.' },
  { icon: Award, texto: 'Máster en Neuropsicología del Desarrollo y Atención Temprana por la Universidad de Córdoba.' },
  { icon: BadgeCheck, texto: 'Colegiado nº AO14923 en el Colegio Oficial de Psicología de Andalucía Oriental (COPAO).' },
];

const servicios = [
  {
    icon: HeartHandshake,
    color: 'bg-terracota-100 text-terracota-600',
    titulo: 'Orientación y apoyo a cuidadores/as',
    texto:
      'Un espacio de respiro exclusivo para ti. Te ayudo a gestionar el estrés del día a día, a lidiar con la culpa, a adaptarte a los cambios de la enfermedad y a integrar pautas de autocuidado real en tu rutina.',
  },
  {
    icon: Brain,
    color: 'bg-sage-100 text-sage-600',
    titulo: 'Orientación familiar',
    texto:
      'Cuando hay tensión en la familia en torno al cuidado, ofrecemos pautas de comunicación clara y orientación del entorno para que todos remen en la misma dirección.',
  },
];

const pasos = [
  {
    icon: ClipboardList,
    titulo: 'Evaluación inicial',
    texto: 'Analizamos la situación del cuidador o cuidadora y de su familiar para identificar los focos de sobrecarga y las áreas prioritarias.',
  },
  {
    icon: Route,
    titulo: 'Plan de acción práctico',
    texto: 'Pautas claras, personalizadas y aplicables en el día a día, con atención presencial a domicilio u online.',
  },
  {
    icon: RefreshCw,
    titulo: 'Seguimiento y coordinación',
    texto: 'Revisamos la evolución y ajustamos las estrategias a las necesidades cambiantes del entorno familiar.',
  },
];

// Tarjeta "cristal" para que el texto se lea bien sobre la foto difuminada
const cristal = 'rounded-3xl border border-white/60 bg-white/75 p-6 shadow-suave backdrop-blur-sm sm:p-8';

export default function AcercaDe() {
  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-crema-200">
      {/* Fondo: foto difuminada */}
      <img
        src="/andando.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover blur-[3px]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-crema-50/45 via-crema-50/25 to-crema-100/55" />

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-8 sm:py-14">
        {/* Cabecera */}
        <header className={`${cristal} text-center`}>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-oro-600">Acerca de nosotros</p>
          <h1 className="mt-3 font-serif text-3xl font-bold text-tierra-800 sm:text-4xl">
            Un espacio humano, seguro y sin juicios para quienes cuidan con el corazón
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-stone-600">
            Acompañamiento cercano, con pautas prácticas de autocuidado y gestión del estrés para quien cuida de un familiar con una enfermedad neurodegenerativa. En Málaga, a domicilio u online.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/citas" className="btn-primary">Reserva una sesión de orientación</Link>
            <a href="#servicios" className="btn-outline">Conoce mis servicios</a>
          </div>
        </header>

        {/* Sobre mí */}
        <section className={cristal}>
          <h2 className="font-serif text-2xl font-bold text-tierra-800">Sobre mí y mi marco profesional</h2>
          <p className="mt-3 text-stone-600">
            Cuidar de un familiar con una enfermedad neurodegenerativa supone un desgaste invisible, y muchas veces quien cuida se olvida de sí mismo hasta llegar al límite. Mi objetivo es acompañarte para que encuentres respiro, alivies la tensión y recuperes el equilibrio en tu día a día, sin tecnicismos y con pautas que funcionan en casa.
          </p>

          <ul className="mt-5 space-y-3">
            {credenciales.map(({ icon: Icon, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-sm text-stone-700">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                  <Icon size={16} />
                </span>
                {texto}
              </li>
            ))}
          </ul>

          <blockquote className="mt-6 border-l-4 border-terracota-500 pl-4 font-serif italic text-stone-600">
            Mi labor se centra en el acompañamiento y atención individualizada 
            al cuidador/a, ofreciendo herramientas prácticas para el día a día, la gestión del estrés derivado de
            la atención prolongada y la mejora de la calidad de vida en el entorno familiar, trabajando en red
            con otros profesionales sociosanitarios cuando el caso lo requiere.
          </blockquote>
        </section>

        {/* Áreas de servicio */}
        <section id="servicios" className="scroll-mt-20">
          <h2 className="mb-4 px-1 font-serif text-2xl font-bold text-tierra-800 [text-shadow:0_1px_8px_rgba(255,255,255,0.9)]">
            Áreas de servicio
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {servicios.map(({ icon: Icon, color, titulo, texto }) => (
              <div key={titulo} className={cristal}>
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-tierra-800">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Metodología */}
        <section className={cristal}>
          <h2 className="font-serif text-2xl font-bold text-tierra-800">Cómo trabajamos</h2>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {pasos.map(({ icon: Icon, titulo, texto }, i) => (
              <div key={titulo}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-500 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <Icon size={20} className="text-oro-600" />
                </div>
                <h3 className="font-bold text-tierra-800">{titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Divulgación y contacto */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className={cristal}>
            <h2 className="font-serif text-xl font-bold text-tierra-800">Divulgación</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Pautas breves y recursos sobre hábitos de vida saludable y bienestar del cuidador/a.
            </p>
            <a
              href="https://www.instagram.com/orientamejoraemocional/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline mt-4"
            >
              <AtSign size={16} /> @orientamejoraemocional
            </a>
          </div>

          <div className={cristal}>
            <h2 className="font-serif text-xl font-bold text-tierra-800">Contacto y zona de actuación</h2>
            <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-stone-600">
              <MapPin size={16} className="mt-0.5 shrink-0 text-terracota-500" />
              Atención presencial a domicilio en Málaga capital y alrededores, o cómodamente online.
            </p>
            <a
              href="https://wa.me/34678766839"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-4"
            >
              <Phone size={16} /> Consultas por WhatsApp
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
