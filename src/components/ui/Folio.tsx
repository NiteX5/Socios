import { BookOpen } from 'lucide-react';

/** Caja con el numero de pagina del libro (dato principal de la ficha). */
export function Folio({ pagina }: { pagina: number }) {
  return (
    <div
      role="group"
      aria-label={`Página ${pagina} del libro`}
      className="animar-aparecer inline-block rounded-md border border-accent bg-accent-soft px-6 py-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-accent-text">
        <BookOpen size={20} aria-hidden="true" />
        Página del libro
      </p>
      <p
        aria-hidden="true"
        className="tabular mt-1 font-serif font-bold leading-none text-accent-text"
        style={{ fontSize: 'var(--folio-size)' }}
      >
        {pagina}
      </p>
      <div aria-hidden="true" className="mt-2 h-[3px] w-12 bg-accent" />
    </div>
  );
}
