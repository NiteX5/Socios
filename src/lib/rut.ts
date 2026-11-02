/** Utilidades puras de RUT chileno (modulo 11). No importan Firebase. */

/** "12.345.678-k" | "12345678k" -> "12345678-K". No valida el DV. '' si hay menos de 2 caracteres. */
export function normalizarRut(raw: string): string {
  const limpio = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return '';
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

/** Digito verificador (modulo 11) de un cuerpo numerico: '0'-'9' o 'K'. */
export function calcularDv(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

/** Cuerpo de 7 u 8 digitos sin ceros a la izquierda y DV correcto. */
export function validarRut(raw: string): boolean {
  const n = normalizarRut(raw);
  if (!/^[0-9]{7,8}-[0-9K]$/.test(n)) return false;
  const [cuerpo, dv] = n.split('-') as [string, string];
  if (cuerpo.startsWith('0')) return false;
  return calcularDv(cuerpo) === dv;
}

/** "12345678-K" -> "12.345.678-K" (solo para mostrar). */
export function formatearRut(normalizado: string): string {
  const n = normalizarRut(normalizado);
  if (!n) return normalizado;
  const [cuerpo, dv] = n.split('-') as [string, string];
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

/** Solo [0-9K], sin guion: forma usada en el campo de busqueda. */
export function claveBusquedaRut(raw: string): string {
  return raw.replace(/[^0-9kK]/g, '').toUpperCase();
}
