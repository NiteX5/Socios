import type { SocioInput } from '@/types/socio';
import { normalizarRut, validarRut } from './rut';

export type CampoSocio = keyof SocioInput;
export type ErroresCampo = Partial<Record<CampoSocio, string>>;

export type ResultadoValidacion =
  | { ok: true; datos: SocioInput }
  | { ok: false; errores: ErroresCampo };

/** Entrada cruda de formulario (todo string). */
export interface SocioFormRaw {
  numeroSocio: string;
  rut: string;
  nombreCompleto: string;
  fechaIngreso: string; // YYYY-MM-DD
  paginaLibro: string;
  lugarVotacion: string;
  observacion: string;
}

export interface OpcionesValidacion {
  /** RUT guardado del socio que se edita. Si el RUT no cambia se acepta aunque este incompleto o con DV malo (datos migrados). */
  rutOriginal?: string;
}

export const MAX_NOMBRE = 120;
export const MAX_LUGAR = 120;
export const MAX_OBSERVACION = 500;
/** Como CONTROL pero permite salto de linea (la observacion es multilinea). */
const CONTROL_TEXTO = new RegExp('[\\u0000-\\u0009\\u000b-\\u001f\\u007f-\\u009f]');
const MAX_PAGINA = 1_000_000;
const REGEX_NUMERO = /^[A-Za-z0-9._-]{1,20}$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

export function normalizarNumeroSocio(s: string): string {
  return s.trim();
}
export function claveNumero(numero: string): string {
  return 'num_' + numero.trim().toLowerCase();
}
export function claveRut(rutNormalizado: string): string {
  return 'rut_' + rutNormalizado;
}

/** Interpreta "YYYY-MM-DD" como medianoche LOCAL. null si no es una fecha real. */
export function parsearFechaLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(y, mo - 1, d);
  if (fecha.getFullYear() !== y || fecha.getMonth() !== mo - 1 || fecha.getDate() !== d) return null;
  return fecha;
}

export function validarSocio(
  raw: SocioFormRaw,
  hoy: Date = new Date(),
  opciones: OpcionesValidacion = {},
): ResultadoValidacion {
  const errores: ErroresCampo = {};

  const nombre = raw.nombreCompleto.replace(/\s+/g, ' ').trim();
  if (!nombre) errores.nombreCompleto = 'Ingresa el nombre completo.';
  else if (CONTROL.test(nombre)) errores.nombreCompleto = 'El nombre contiene caracteres no permitidos.';
  else if (nombre.length < 3) errores.nombreCompleto = 'El nombre es demasiado corto.';
  else if (nombre.length > MAX_NOMBRE)
    errores.nombreCompleto = `El nombre no puede superar los ${MAX_NOMBRE} caracteres.`;

  const rutTexto = raw.rut.trim();
  let rut = '';
  const rutSinCambios =
    opciones.rutOriginal !== undefined && normalizarRut(rutTexto) === normalizarRut(opciones.rutOriginal);
  if (rutSinCambios) rut = normalizarRut(rutTexto);
  else if (!rutTexto) errores.rut = 'Ingresa el RUT.';
  else {
    rut = normalizarRut(rutTexto);
    if (!/^[0-9]{7,8}-[0-9K]$/.test(rut) || rut.startsWith('0') || /[^0-9kK.\-\s]/.test(rutTexto)) {
      errores.rut = 'El RUT no tiene un formato válido. Ejemplo: 12.345.678-5.';
    } else if (!validarRut(rut)) {
      errores.rut = 'El dígito verificador no corresponde a este RUT. Revísalo.';
    }
  }

  const numero = normalizarNumeroSocio(raw.numeroSocio);
  if (!numero) errores.numeroSocio = 'Ingresa el número de socio.';
  else if (!REGEX_NUMERO.test(numero))
    errores.numeroSocio = 'Usa solo letras, números, punto, guion o guion bajo (máximo 20).';

  const paginaTxt = raw.paginaLibro.trim();
  let pagina = 0;
  if (!paginaTxt) errores.paginaLibro = 'Ingresa el número de página.';
  else {
    pagina = /^[0-9]+$/.test(paginaTxt) ? Number(paginaTxt) : 0;
    if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > MAX_PAGINA)
      errores.paginaLibro = 'Ingresa un número de página válido (entero mayor que 0).';
  }

  let fecha: Date | null = null;
  if (!raw.fechaIngreso.trim()) errores.fechaIngreso = 'Ingresa la fecha de ingreso.';
  else {
    fecha = parsearFechaLocal(raw.fechaIngreso.trim());
    if (!fecha || fecha.getFullYear() < 1900) {
      errores.fechaIngreso = 'La fecha de ingreso no es válida.';
      fecha = null;
    } else {
      const finDeHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
      if (fecha.getTime() > finDeHoy.getTime()) {
        errores.fechaIngreso = 'La fecha de ingreso no puede ser posterior a hoy.';
      }
    }
  }

  const lugar = raw.lugarVotacion.replace(/\s+/g, ' ').trim();
  if (lugar.length > MAX_LUGAR)
    errores.lugarVotacion = `El lugar de votación no puede superar los ${MAX_LUGAR} caracteres.`;
  else if (CONTROL.test(lugar)) errores.lugarVotacion = 'El lugar de votación contiene caracteres no permitidos.';

  const observacion = raw.observacion.replace(/\r\n?/g, '\n').trim();
  if (observacion.length > MAX_OBSERVACION)
    errores.observacion = `La observación no puede superar los ${MAX_OBSERVACION} caracteres.`;
  else if (CONTROL_TEXTO.test(observacion)) errores.observacion = 'La observación contiene caracteres no permitidos.';

  if (Object.keys(errores).length > 0 || !fecha) return { ok: false, errores };
  return {
    ok: true,
    datos: {
      numeroSocio: numero,
      rut,
      nombreCompleto: nombre,
      fechaIngreso: fecha,
      paginaLibro: pagina,
      lugarVotacion: lugar === '' ? null : lugar,
      observacion: observacion === '' ? null : observacion,
    },
  };
}
