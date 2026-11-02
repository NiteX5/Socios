import { MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import { formatearRut } from '@/lib/rut';
import type { Socio } from '@/types/socio';
import { EstadoBadge } from './EstadoBadge';
import { Resaltado } from './Resaltado';

/** Tabla para escritorio (>= 1024 px). Sin RUT en las URLs: el enlace usa el id del documento. */
export function SociosTable({ socios, busqueda }: { socios: readonly Socio[]; busqueda: string }) {
  return (
    <div className="hidden overflow-hidden rounded-md border border-border lg:block">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Resultados de la búsqueda de socios</caption>
        <thead>
          <tr className="border-b-2 border-primary bg-bg text-sm font-semibold text-muted">
            <th scope="col" className="px-4 py-3 text-right whitespace-nowrap">N° socio</th>
            <th scope="col" className="px-4 py-3">Nombre</th>
            <th scope="col" className="w-[150px] px-4 py-3">RUT</th>
            <th scope="col" className="w-[140px] px-4 py-3">Estado</th>
            <th scope="col" className="w-[110px] px-4 py-3 text-right">Página</th>
          </tr>
        </thead>
        <tbody>
          {socios.map((s) => (
            <tr
              key={s.id}
              className="relative min-h-14 border-b border-border bg-surface last:border-b-0 hover:bg-primary-soft focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-focus"
            >
              <td className="tabular whitespace-nowrap px-4 py-3 text-right">{s.numeroSocio}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/socios/${s.id}`}
                  className={`font-semibold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none ${
                    s.estado === 'RETIRADO' ? 'text-muted' : 'text-ink'
                  }`}
                >
                  <Resaltado texto={s.nombreCompleto} busqueda={busqueda} />
                </Link>
                {s.lugarVotacion && <p className="text-sm text-muted">Votación: {s.lugarVotacion}</p>}
                {s.observacion && (
                  <p className="flex items-center gap-1 text-sm text-muted" title={s.observacion}>
                    <MessageSquareText size={14} aria-hidden="true" />
                    Con observación
                  </p>
                )}
              </td>
              <td className="tabular px-4 py-3">{s.rut ? formatearRut(s.rut) : <span className="text-muted">—</span>}</td>
              <td className="px-4 py-3">
                <EstadoBadge estado={s.estado} />
              </td>
              <td className="tabular px-4 py-3 text-right font-serif text-xl font-bold text-accent-text">
                {s.paginaLibro}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
