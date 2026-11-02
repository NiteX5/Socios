import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export type VarianteAlerta = 'error' | 'warn' | 'info' | 'success';

const estilos: Record<VarianteAlerta, string> = {
  error: 'border-error bg-error-bg text-ink',
  warn: 'border-warn bg-warn-bg text-ink',
  info: 'border-info bg-info-bg text-ink',
  success: 'border-activo bg-activo-bg text-ink',
};
const colorIcono: Record<VarianteAlerta, string> = {
  error: 'text-error',
  warn: 'text-warn',
  info: 'text-info',
  success: 'text-activo',
};

export function IconoVariante({ variante, size = 20 }: { variante: VarianteAlerta; size?: number }) {
  const props = { size, 'aria-hidden': true, strokeWidth: 2 } as const;
  if (variante === 'error') return <CircleAlert {...props} />;
  if (variante === 'warn') return <TriangleAlert {...props} />;
  if (variante === 'success') return <CircleCheck {...props} />;
  return <Info {...props} />;
}

export function Alert({
  variante = 'info',
  titulo,
  children,
  className = '',
  id,
}: {
  variante?: VarianteAlerta;
  titulo?: string;
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      role={variante === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-md border-l-4 px-4 py-3 ${estilos[variante]} ${className}`}
    >
      <span className={`mt-0.5 shrink-0 ${colorIcono[variante]}`}>
        <IconoVariante variante={variante} />
      </span>
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
