import type { ReactNode } from 'react';

export function EmptyState({
  icono,
  titulo,
  texto,
  accion,
  alerta = false,
}: {
  icono: ReactNode;
  titulo: string;
  texto?: string;
  accion?: ReactNode;
  alerta?: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-110 flex-col items-center px-4 py-12 text-center">
      <span className="text-muted" aria-hidden="true">
        {icono}
      </span>
      <h2 role={alerta ? 'alert' : undefined} className="mt-4 font-serif text-xl font-semibold">
        {titulo}
      </h2>
      {texto && <p className="mt-2 text-muted">{texto}</p>}
      {accion && <div className="mt-6">{accion}</div>}
    </div>
  );
}
