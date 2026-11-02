'use client';

import { CircleAlert } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, Ref, TextareaHTMLAttributes } from 'react';

export const claseInput =
  'block min-h-11 w-full rounded-md border border-border-input bg-surface px-3 text-base text-ink placeholder:text-placeholder hover:border-ink focus:border-2 focus:border-primary disabled:bg-bg disabled:text-muted aria-[invalid=true]:border-2 aria-[invalid=true]:border-error';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string;
  opcional?: boolean;
  obligatorio?: boolean;
  derecha?: ReactNode;
  contador?: string;
  ref?: Ref<HTMLInputElement>;
}

export function Field({
  id,
  etiqueta,
  error,
  ayuda,
  opcional,
  obligatorio,
  derecha,
  contador,
  className = '',
  ref,
  ...rest
}: FieldProps) {
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describedBy = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {etiqueta}
        {obligatorio && (
          <>
            <span aria-hidden="true" className="ml-0.5 text-error">
              *
            </span>
            <span className="sr-only"> (obligatorio)</span>
          </>
        )}
        {opcional && <span className="ml-1 font-normal text-muted">(opcional)</span>}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${claseInput} ${derecha ? 'pr-12' : ''} ${className}`}
          {...rest}
        />
        {derecha && <div className="absolute inset-y-0 right-0 flex items-center">{derecha}</div>}
      </div>
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          {ayuda && (
            <p id={idAyuda} className="text-caption text-muted">
              {ayuda}
            </p>
          )}
          <p id={idError} role="alert" className="flex items-start gap-1.5 text-sm text-error">
            {error && <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />}
            <span>{error}</span>
          </p>
        </div>
        {contador && <p className="shrink-0 text-caption text-muted">{contador}</p>}
      </div>
    </div>
  );
}

interface FieldAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string;
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string;
  opcional?: boolean;
  contador?: string;
}

/** Campo de texto multilinea con la misma anatomia que Field. */
export function FieldArea({ id, etiqueta, error, ayuda, opcional, contador, className = '', ...rest }: FieldAreaProps) {
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describedBy = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {etiqueta}
        {opcional && <span className="ml-1 font-normal text-muted">(opcional)</span>}
      </label>
      <textarea
        id={id}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${claseInput} min-h-24 resize-y py-2 ${className}`}
        {...rest}
      />
      <div className="flex justify-between gap-3">
        <div className="min-w-0">
          {ayuda && (
            <p id={idAyuda} className="text-caption text-muted">
              {ayuda}
            </p>
          )}
          <p id={idError} role="alert" className="flex items-start gap-1.5 text-sm text-error">
            {error && <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />}
            <span>{error}</span>
          </p>
        </div>
        {contador && <p className="shrink-0 text-caption text-muted">{contador}</p>}
      </div>
    </div>
  );
}
