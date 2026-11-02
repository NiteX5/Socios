import type { Timestamp } from 'firebase/firestore';

export type Estado = 'ACTIVO' | 'RETIRADO';

/** Documento tal como esta en Firestore. */
export interface SocioDoc {
  numeroSocio: string;
  rut: string; // normalizado "12345678-K"
  nombreCompleto: string;
  fechaIngreso: Timestamp;
  estado: Estado;
  paginaLibro: number;
  lugarVotacion: string | null;
  /** Nota libre del libro o de la administracion. null = sin observacion. */
  observacion: string | null;
  fechaRetiro: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  busqueda: string;
}

export interface Socio extends SocioDoc {
  id: string;
}

/** Entrada del formulario ya validada y normalizada (sin campos de servidor). */
export interface SocioInput {
  numeroSocio: string;
  rut: string;
  nombreCompleto: string;
  fechaIngreso: Date;
  paginaLibro: number;
  lugarVotacion: string | null;
  observacion: string | null;
}
