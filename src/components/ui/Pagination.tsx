'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

function ventana(actual: number, total: number): (number | '…')[] {
  const set = new Set<number>([1, total, actual - 1, actual, actual + 1]);
  const orden = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const res: (number | '…')[] = [];
  orden.forEach((n, i) => {
    const prev = orden[i - 1];
    if (prev !== undefined && n - prev > 1) res.push('…');
    res.push(n);
  });
  return res;
}

const btn =
  'flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent'
const btnNormal = `${btn} text-primary hover:bg-primary-soft`
const btnActual = `${btn} bg-primary text-on-primary`;

export function Pagination({
  pagina,
  paginas,
  total,
  tam,
  onCambio,
}: {
  pagina: number;
  paginas: number;
  total: number;
  tam: number;
  onCambio(p: number): void;
}) {
  if (total <= tam) return null;
  const desde = (pagina - 1) * tam + 1;
  const hasta = Math.min(pagina * tam, total);
  return (
    <nav aria-label="Paginación de resultados" className="mt-6 space-y-2">
      <div className="flex items-center justify-between gap-2 lg:justify-center">
        <button type="button" className={btnNormal} disabled={pagina <= 1} onClick={() => onCambio(pagina - 1)}>
          <ChevronLeft size={20} aria-hidden="true" />
          <span className="max-lg:sr-only">Anterior</span>
        </button>
        <p className="text-center lg:hidden">
          Página {pagina} de {paginas}
        </p>
        <ul className="hidden items-center gap-1 lg:flex">
          {ventana(pagina, paginas).map((n, i) => (
            <li key={`${n}-${i}`}>
              {n === '…' ? (
                <span aria-hidden="true" className="px-2">…</span>
              ) : (
                <button
                  type="button"
                  aria-current={n === pagina ? 'page' : undefined}
                  aria-label={`Página ${n}`}
                  onClick={() => onCambio(n)}
                  className={n === pagina ? btnActual : btnNormal}
                >
                  {n}
                </button>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className={btnNormal} disabled={pagina >= paginas} onClick={() => onCambio(pagina + 1)}>
          <span className="max-lg:sr-only">Siguiente</span>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <p className="text-center text-caption text-muted">
        Mostrando {desde} a {hasta} de {total}
      </p>
    </nav>
  );
}
