import type { Estado, Socio, SocioInput } from '@/types/socio';
import { claveBusquedaRut } from './rut';

/** Minusculas, sin diacriticos ("n" por "ñ" incluido), espacios colapsados. */
export function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Unica funcion que produce el campo derivado `busqueda`. */
export function construirBusqueda(
  d: Pick<SocioInput, 'nombreCompleto' | 'rut' | 'numeroSocio' | 'lugarVotacion'>,
): string {
  const partes = [
    normalizarTexto(d.nombreCompleto),
    claveBusquedaRut(d.rut).toLowerCase(),
    normalizarTexto(d.numeroSocio),
  ];
  if (d.lugarVotacion) partes.push(normalizarTexto(d.lugarVotacion));
  return partes.filter(Boolean).join(' ');
}

export interface FiltroSocios {
  texto: string;
  estado: Estado | 'TODOS';
  /** true = solo socios con observacion. */
  conObservaciones?: boolean;
}

/** Un token con forma de RUT (con puntos/guion) se compara tambien sin ellos. */
function variantes(token: string): string[] {
  if (/^[0-9][0-9.]*-?[0-9k]?$/.test(token)) {
    const sinSeparadores = token.replace(/[.-]/g, '');
    if (sinSeparadores !== token) return [token, sinSeparadores];
  }
  return [token];
}

export function filtrarSocios(socios: readonly Socio[], f: FiltroSocios): Socio[] {
  const tokens = normalizarTexto(f.texto)
    .split(' ')
    .filter((t) => t.length > 0)
    .map(variantes);
  const resultado = socios.filter((s) => {
    if (f.estado !== 'TODOS' && s.estado !== f.estado) return false;
    if (f.conObservaciones && !s.observacion) return false;
    return tokens.every(
      (opciones) =>
        opciones.some((t) => s.busqueda.includes(t)) ||
        opciones.some((t) => t === String(s.paginaLibro)),
    );
  });
  return resultado.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));
}

export function paginar<T>(
  items: readonly T[],
  pagina: number,
  tam: number,
): { items: T[]; total: number; paginas: number } {
  const total = items.length;
  const paginas = Math.max(1, Math.ceil(total / tam));
  const p = Math.min(Math.max(1, Math.floor(pagina) || 1), paginas);
  return { items: items.slice((p - 1) * tam, p * tam), total, paginas };
}
