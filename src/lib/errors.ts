import type { ErroresCampo } from './validation';

export type CodigoError =
  | 'VALIDACION'
  | 'RUT_DUPLICADO'
  | 'NUMERO_DUPLICADO'
  | 'DUPLICADO_MULTIPLE'
  | 'NO_ENCONTRADO'
  | 'CONFLICTO'
  | 'ESTADO_INVALIDO'
  | 'NO_AUTORIZADO'
  | 'SIN_CONEXION'
  | 'CUOTA'
  | 'DESCONOCIDO';

export class SocioError extends Error {
  readonly codigo: CodigoError;
  readonly errores?: ErroresCampo;
  constructor(codigo: CodigoError, mensaje: string, errores?: ErroresCampo, cause?: unknown) {
    super(mensaje, cause === undefined ? undefined : { cause });
    this.name = 'SocioError';
    this.codigo = codigo;
    if (errores) this.errores = errores;
  }
}

function codigoFirebase(e: unknown): string | null {
  if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string') {
    return (e as { code: string }).code;
  }
  return null;
}

/** Convierte cualquier error en SocioError. Solo conserva el codigo, nunca datos del payload. */
export function traducirErrorFirebase(e: unknown): SocioError {
  if (e instanceof SocioError) return e;
  const code = codigoFirebase(e);
  switch (code) {
    case 'permission-denied':
    case 'unauthenticated':
      return new SocioError('NO_AUTORIZADO', 'No autorizado');
    case 'unavailable':
    case 'deadline-exceeded':
    case 'auth/network-request-failed':
      return new SocioError('SIN_CONEXION', 'Sin conexión');
    case 'resource-exhausted':
      return new SocioError('CUOTA', 'Cuota excedida');
    default:
      return new SocioError('DESCONOCIDO', code ?? 'Error desconocido');
  }
}

export function mensajeUsuario(e: unknown): string {
  const err = traducirErrorFirebase(e);
  switch (err.codigo) {
    case 'RUT_DUPLICADO':
      return 'Ya existe un socio con este RUT.';
    case 'NUMERO_DUPLICADO':
      return 'Ya existe un socio con este número.';
    case 'DUPLICADO_MULTIPLE':
      return 'Ya existe un socio con este RUT y con este número.';
    case 'NO_ENCONTRADO':
      return 'No encontramos este socio.';
    case 'CONFLICTO':
      return 'Otra persona modificó este socio mientras lo editabas. Recarga los datos para ver los cambios más recientes.';
    case 'ESTADO_INVALIDO':
      return 'El socio ya tiene ese estado. Recarga los datos e inténtalo de nuevo.';
    case 'NO_AUTORIZADO':
      return 'No tienes permiso para realizar esta acción.';
    case 'SIN_CONEXION':
      return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    case 'CUOTA':
      return 'Se alcanzó el límite diario de uso del servicio. Inténtalo más tarde.';
    case 'VALIDACION':
      return 'Revisa los campos marcados.';
    default:
      return 'No se pudo completar la operación. Revisa tu conexión e inténtalo de nuevo.';
  }
}
