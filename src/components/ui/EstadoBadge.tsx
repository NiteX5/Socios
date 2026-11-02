import { CircleCheck, CircleMinus } from 'lucide-react';
import type { Estado } from '@/types/socio';

export function EstadoBadge({ estado }: { estado: Estado }) {
  const activo = estado === 'ACTIVO';
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-sm border px-2.5 text-sm font-semibold ${
        activo
          ? 'border-activo/35 bg-activo-bg text-activo'
          : 'border-retirado/35 bg-retirado-bg text-retirado'
      }`}
    >
      {activo ? <CircleCheck size={16} aria-hidden="true" /> : <CircleMinus size={16} aria-hidden="true" />}
      {activo ? 'Activo' : 'Retirado'}
    </span>
  );
}
