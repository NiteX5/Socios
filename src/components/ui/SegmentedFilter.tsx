'use client';

import { Check } from 'lucide-react';
import { useRef } from 'react';

export interface OpcionFiltro<T extends string> {
  valor: T;
  etiqueta: string;
}

export function SegmentedFilter<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: readonly OpcionFiltro<T>[];
  valor: T;
  onCambio(v: T): void;
  etiqueta: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function mover(i: number, delta: number) {
    const n = (i + delta + opciones.length) % opciones.length;
    const op = opciones[n];
    if (!op) return;
    onCambio(op.valor);
    refs.current[n]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex gap-2 sm:inline-flex">
      {opciones.map((op, i) => {
        const sel = op.valor === valor;
        return (
          <button
            key={op.valor}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={sel}
            tabIndex={sel ? 0 : -1}
            onClick={() => onCambio(op.valor)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                mover(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                mover(i, -1);
              }
            }}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-base font-semibold transition-colors duration-[120ms] sm:min-w-24 sm:flex-none ${
              sel
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border-input bg-surface text-ink hover:bg-primary-soft'
            }`}
          >
            {sel && <Check size={16} aria-hidden="true" />}
            {op.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
