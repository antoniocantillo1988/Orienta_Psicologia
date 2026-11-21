import { ArrowUpRight, BookOpen, HeartHandshake } from 'lucide-react';

const CONTACTO_TALLERES =
  'https://wa.me/34678766839?text=Hola%2C%20me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20los%20pr%C3%B3ximos%20talleres.';

export default function Talleres() {
  return (
    <div className="mx-auto max-w-5xl pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-sage-700 px-6 py-10 text-white shadow-suave sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 -top-6 h-44 w-44 rounded-full border border-white/10" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
            <BookOpen size={14} aria-hidden="true" />
            Orienta Psicología
          </span>
          <h1 className="mt-6 font-serif text-3xl font-bold leading-tight sm:text-5xl">
            Talleres para acompañar y aprender
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
            Un espacio para compartir herramientas y conocimientos que acompañen
            el bienestar de las personas cuidadoras y sus familias.
          </p>
        </div>
        <div className="pointer-events-none absolute bottom-7 right-10 hidden text-white/15 sm:block">
          <HeartHandshake size={112} strokeWidth={1} aria-hidden="true" />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="catalogo-talleres">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracota-600">
              Catálogo
            </p>
            <h2 id="catalogo-talleres" className="mt-1 font-serif text-2xl font-bold text-tierra-800">
              Próximos talleres
            </h2>
          </div>
          <p className="text-sm text-stone-500">La programación se publicará aquí.</p>
        </div>

        <div className="card-orienta mt-5 flex flex-col items-center px-6 py-10 text-center sm:px-12 sm:py-14">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-50 text-sage-600">
            <BookOpen size={30} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <h3 className="mt-5 font-serif text-xl font-bold text-tierra-800">
            Estamos preparando la programación
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-6 text-stone-600">
            En cuanto haya talleres disponibles, encontrarás aquí sus temas,
            fechas y detalles. Mientras tanto, puedes escribirnos para consultar
            novedades.
          </p>
          <a
            href={CONTACTO_TALLERES}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline mt-6"
          >
            Consultar novedades
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
