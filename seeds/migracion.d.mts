export const MAX_OBSERVACION: number;
export interface RegistroMigracion {
  id: string;
  numeroSocio: string;
  rut: string;
  nombreCompleto: string;
  fecha: { y: number; m: number; d: number };
  paginaLibro: number;
  retirado: boolean;
  observacion: string | null;
  notas: string[];
  reservaRut: boolean;
  busqueda: string;
}
export function parsearCsv(texto: string): string[][];
export function normalizarTexto(s: string): string;
export function parsearFecha(texto: string): { y: number; m: number; d: number; aproximada: boolean } | null;
export function interpretarRut(crudo: string): { rut: string; nota?: string };
export function construirRegistros(textoCsv: string): {
  registros: RegistroMigracion[];
  anomalias: { numeroSocio: string; nombre: string; notas: string[] }[];
};
