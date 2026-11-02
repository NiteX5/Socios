'use client';

import { Search, X } from 'lucide-react';
import type { Ref } from 'react';

export function SearchBox({
  valor,
  onCambio,
  inputRef,
}: {
  valor: string;
  onCambio(v: string): void;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <div>
      <label htmlFor="buscar" className="mb-1.5 block text-sm font-semibold">
        Buscar socio
      </label>
      <div className="relative">
        <Search size={24} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 sm:left-4 -translate-y-1/2 text-primary" />
        <input
          ref={inputRef}
          id="buscar"
          type="search"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (valor) onCambio('');
              else e.currentTarget.blur();
            }
          }}
          placeholder="Nombre, RUT, N° de socio o página"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="block h-14 w-full rounded-md border-2 border-primary bg-surface pl-12 pr-12 text-base text-ink placeholder:text-placeholder placeholder:text-sm sm:pl-14 sm:text-lg sm:placeholder:text-lg lg:pr-24"
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-1">
          {!valor && (
            <kbd className="mr-3 hidden rounded-sm border border-border-input px-1.5 text-caption text-muted lg:inline">/</kbd>
          )}
          {valor && (
            <button
              type="button"
              onClick={() => {
                onCambio('');
                document.getElementById('buscar')?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="flex size-11 items-center justify-center rounded-md text-primary hover:bg-primary-soft"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
