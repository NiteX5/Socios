import { MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import { formatearRut } from '@/lib/rut';
import type { Socio } from '@/types/socio';
import { EstadoBadge } from './EstadoBadge';
import { Resaltado } from './Resaltado';

/** Lista de tarjetas para movil/tablet (< 1024 px). */
export function SocioCards({ socios, busqueda }: { socios: readonly Socio[]; busqueda: string }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:hidden">
      {socios.map((s) => (
        <li key={s.id}>
          <Link
            href={`/socios/${s.id}`}
            className="flex min-h-[72px] flex-col gap-1 rounded-md border border-border bg-surface px-4 py-3 hover:bg-primary-soft active:bg-primary-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`text-lg font-semibold ${s.estado === 'RETIRADO' ? 'text-muted' : ''}`}>
                <Resaltado texto={s.nombreCompleto} busqueda={busqueda} />
              </span>
              <span className="min-w-16 shrink-0 rounded-sm bg-accent-soft px-2 py-1 text-center text-accent-text">
                <span className="block text-caption leading-none">Pág.</span>
                <span className="tabular font-serif text-[1.375rem] font-bold leading-tight">{s.paginaLibro}</span>
              </span>
            </div>
            <p className="text-sm text-muted">
              N° {s.numeroSocio} · {s.rut ? formatearRut(s.rut) : 'Sin RUT'}
            </p>
            {s.lugarVotacion && <p className="text-sm text-muted">Votación: {s.lugarVotacion}</p>}
            {s.observacion && (
              <p className="flex items-center gap-1 text-sm text-muted">
                <MessageSquareText size={14} aria-hidden="true" />
                Con observación
              </p>
            )}
            <div>
              <EstadoBadge estado={s.estado} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
