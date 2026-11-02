import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import type { Estado, Socio, SocioDoc, SocioInput } from '@/types/socio';
import { SocioError, traducirErrorFirebase } from './errors';
import { getDb } from './firebase';
import { construirBusqueda } from './search';
import { claveNumero, claveRut } from './validation';

export function sociosCol(): CollectionReference<DocumentData> {
  return collection(getDb(), 'socios');
}

function unicoRef(clave: string): DocumentReference<DocumentData> {
  return doc(getDb(), 'unicos', clave);
}

function aSocio(id: string, d: DocumentData): Socio {
  const base = d as Partial<SocioDoc>;
  return {
    ...(base as SocioDoc),
    lugarVotacion: base.lugarVotacion ?? null,
    observacion: base.observacion ?? null,
    fechaRetiro: base.fechaRetiro ?? null,
    id,
  };
}

export async function listarSocios(): Promise<Socio[]> {
  try {
    const snap = await getDocsFromServer(sociosCol());
    return snap.docs.map((d) => aSocio(d.id, d.data()));
  } catch (e) {
    throw traducirErrorFirebase(e);
  }
}

export async function obtenerSocio(id: string): Promise<Socio> {
  try {
    const snap = await getDoc(doc(getDb(), 'socios', id));
    if (!snap.exists()) throw new SocioError('NO_ENCONTRADO', 'No encontrado');
    return aSocio(snap.id, snap.data());
  } catch (e) {
    throw traducirErrorFirebase(e);
  }
}

function errorDuplicado(rut: boolean, num: boolean): SocioError {
  if (rut && num) {
    return new SocioError('DUPLICADO_MULTIPLE', 'Duplicado', {
      rut: 'Ya existe un socio con este RUT.',
      numeroSocio: 'Ya existe un socio con este número.',
    });
  }
  if (rut) return new SocioError('RUT_DUPLICADO', 'RUT duplicado', { rut: 'Ya existe un socio con este RUT.' });
  return new SocioError('NUMERO_DUPLICADO', 'Número duplicado', {
    numeroSocio: 'Ya existe un socio con este número.',
  });
}

export async function crearSocio(datos: SocioInput): Promise<Socio> {
  const db = getDb();
  const socioRef = doc(sociosCol());
  const rutRef = unicoRef(claveRut(datos.rut));
  const numRef = unicoRef(claveNumero(datos.numeroSocio));
  try {
    await runTransaction(db, async (tx) => {
      const [rutSnap, numSnap] = await Promise.all([tx.get(rutRef), tx.get(numRef)]);
      if (rutSnap.exists() || numSnap.exists()) throw errorDuplicado(rutSnap.exists(), numSnap.exists());
      tx.set(rutRef, { socioId: socioRef.id });
      tx.set(numRef, { socioId: socioRef.id });
      tx.set(socioRef, {
        numeroSocio: datos.numeroSocio,
        rut: datos.rut,
        nombreCompleto: datos.nombreCompleto,
        fechaIngreso: Timestamp.fromDate(datos.fechaIngreso),
        paginaLibro: datos.paginaLibro,
        lugarVotacion: datos.lugarVotacion,
        observacion: datos.observacion,
        estado: 'ACTIVO',
        fechaRetiro: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        busqueda: construirBusqueda(datos),
      });
    });
    return await obtenerSocio(socioRef.id);
  } catch (e) {
    throw traducirErrorFirebase(e);
  }
}

export async function actualizarSocio(
  id: string,
  datos: SocioInput,
  esperadoUpdatedAt: Timestamp,
): Promise<Socio> {
  const db = getDb();
  const socioRef = doc(db, 'socios', id);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(socioRef);
      if (!snap.exists()) throw new SocioError('NO_ENCONTRADO', 'No encontrado');
      const actual = snap.data() as SocioDoc;
      if (!actual.updatedAt.isEqual(esperadoUpdatedAt)) throw new SocioError('CONFLICTO', 'Conflicto');

      const rutCambia = actual.rut !== datos.rut;
      const numCambia = actual.numeroSocio.toLowerCase() !== datos.numeroSocio.toLowerCase();
      const nuevoRutRef = unicoRef(claveRut(datos.rut));
      const nuevoNumRef = unicoRef(claveNumero(datos.numeroSocio));

      // Socios migrados pueden no tener RUT, o compartirlo con otro socio (la reserva es del otro).
      // Solo se libera la reserva vieja si realmente pertenece a este socio.
      const viejoRutRef = rutCambia && actual.rut ? unicoRef(claveRut(actual.rut)) : null;

      // Todas las lecturas antes de cualquier escritura.
      const [rutSnap, numSnap, viejoRutSnap] = await Promise.all([
        rutCambia && datos.rut ? tx.get(nuevoRutRef) : Promise.resolve(null),
        numCambia ? tx.get(nuevoNumRef) : Promise.resolve(null),
        viejoRutRef ? tx.get(viejoRutRef) : Promise.resolve(null),
      ]);
      const rutOcupado = rutSnap?.exists() ?? false;
      const numOcupado = numSnap?.exists() ?? false;
      if (rutOcupado || numOcupado) throw errorDuplicado(rutOcupado, numOcupado);

      if (rutCambia) {
        if (viejoRutRef && viejoRutSnap?.exists() && viejoRutSnap.data()?.socioId === id) tx.delete(viejoRutRef);
        if (datos.rut) tx.set(nuevoRutRef, { socioId: id });
      }
      if (numCambia) {
        tx.delete(unicoRef(claveNumero(actual.numeroSocio)));
        tx.set(nuevoNumRef, { socioId: id });
      }
      tx.update(socioRef, {
        numeroSocio: datos.numeroSocio,
        rut: datos.rut,
        nombreCompleto: datos.nombreCompleto,
        fechaIngreso: Timestamp.fromDate(datos.fechaIngreso),
        paginaLibro: datos.paginaLibro,
        lugarVotacion: datos.lugarVotacion,
        observacion: datos.observacion,
        busqueda: construirBusqueda(datos),
        updatedAt: serverTimestamp(),
      });
    });
    return await obtenerSocio(id);
  } catch (e) {
    throw traducirErrorFirebase(e);
  }
}

export async function cambiarEstado(
  id: string,
  nuevo: Estado,
  esperadoUpdatedAt: Timestamp,
): Promise<Socio> {
  const db = getDb();
  const socioRef = doc(db, 'socios', id);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(socioRef);
      if (!snap.exists()) throw new SocioError('NO_ENCONTRADO', 'No encontrado');
      const actual = snap.data() as SocioDoc;
      if (!actual.updatedAt.isEqual(esperadoUpdatedAt)) throw new SocioError('CONFLICTO', 'Conflicto');
      if (actual.estado === nuevo) throw new SocioError('ESTADO_INVALIDO', 'Estado invalido');
      tx.update(socioRef, {
        estado: nuevo,
        fechaRetiro: nuevo === 'RETIRADO' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    });
    return await obtenerSocio(id);
  } catch (e) {
    throw traducirErrorFirebase(e);
  }
}
