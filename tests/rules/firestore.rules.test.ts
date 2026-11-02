// Pruebas de firestore.rules con @firebase/rules-unit-testing + vitest.
// Ejecutar con emulador: firebase emulators:exec --only firestore "vitest run --config tests/rules/vitest.config.ts"
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest';

type Db = ReturnType<ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore']>;

let env: RulesTestEnvironment;

const RUT_A = '12345678-5';
const RUT_B = '11111111-1';
const RUT_C = '22222222-2';

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-socios-rules',
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      host,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins/adminUid'), { creado: true });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const user = () => env.authenticatedContext('userUid').firestore();
const admin = () => env.authenticatedContext('adminUid').firestore();

const socioData = (over: Record<string, unknown> = {}, ts: unknown = serverTimestamp()) => ({
  numeroSocio: '100',
  rut: RUT_A,
  nombreCompleto: 'Ana Perez',
  fechaIngreso: Timestamp.fromDate(new Date('2020-01-01')),
  estado: 'ACTIVO',
  paginaLibro: 5,
  lugarVotacion: 'Escuela 1',
  fechaRetiro: null,
  createdAt: ts,
  updatedAt: ts,
  busqueda: 'ana perez 123456785 100',
  ...over,
});

/** Crea socio + reservas en un batch (rutas del modelo). */
function createBatch(db: Db, id: string, over: Record<string, unknown> = {}, opts: { skipRut?: boolean; skipNum?: boolean; rutOwner?: string } = {}) {
  const d = socioData(over) as { rut: string; numeroSocio: string };
  const b = writeBatch(db);
  b.set(doc(db, 'socios', id), d);
  if (!opts.skipRut) b.set(doc(db, 'unicos', `rut_${d.rut}`), { socioId: opts.rutOwner ?? id });
  if (!opts.skipNum) b.set(doc(db, 'unicos', `num_${String(d.numeroSocio).toLowerCase().replaceAll('/', '_')}`), { socioId: id });
  return b;
}

/** Siembra un socio valido sin reglas. */
async function seed(id = 's1', over: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const d = socioData(over, Timestamp.fromDate(new Date('2024-01-01'))) as { rut: string; numeroSocio: string };
    await setDoc(doc(db, 'socios', id), d);
    await setDoc(doc(db, 'unicos', `rut_${d.rut}`), { socioId: id });
    await setDoc(doc(db, 'unicos', `num_${d.numeroSocio.toLowerCase()}`), { socioId: id });
  });
}

describe('lectura y acceso', () => {
  it('anonimo no puede leer ni escribir nada', async () => {
    await seed();
    await assertFails(getDoc(doc(anon(), 'socios/s1')));
    await assertFails(getDocs(collection(anon(), 'socios')));
    await assertFails(getDoc(doc(anon(), 'unicos/rut_' + RUT_A)));
    await assertFails(createBatch(anon(), 's2', { rut: RUT_B, numeroSocio: '200' }).commit());
  });

  it('autenticado sin admin no puede leer ni escribir', async () => {
    await seed();
    await assertFails(getDoc(doc(user(), 'socios/s1')));
    await assertFails(getDocs(collection(user(), 'socios')));
    await assertFails(createBatch(user(), 's2', { rut: RUT_B, numeroSocio: '200' }).commit());
  });

  it('admin puede leer y listar', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(admin(), 'socios/s1')));
    await assertSucceeds(getDocs(collection(admin(), 'socios')));
    await assertSucceeds(getDoc(doc(admin(), 'unicos/rut_' + RUT_A)));
  });

  it('coleccion arbitraria denegada incluso para admin', async () => {
    await assertFails(setDoc(doc(admin(), 'otra/x'), { a: 1 }));
    await assertFails(getDoc(doc(admin(), 'otra/x')));
  });
});

describe('admins', () => {
  it('usuario no puede auto-asignarse admin', async () => {
    await assertFails(setDoc(doc(user(), 'admins/userUid'), { creado: true }));
  });
  it('ni siquiera un admin escribe/borra admins', async () => {
    await assertFails(setDoc(doc(admin(), 'admins/otro'), { creado: true }));
    await assertFails(updateDoc(doc(admin(), 'admins/adminUid'), { x: 1 }));
    await assertFails(deleteDoc(doc(admin(), 'admins/adminUid')));
  });
  it('un usuario lee solo su propio doc admin; no lista', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'admins/adminUid')));
    await assertFails(getDoc(doc(user(), 'admins/adminUid')));
    await assertFails(getDocs(collection(admin(), 'admins')));
  });
});

describe('crear socio', () => {
  it('admin crea socio con sus dos reservas', async () => {
    await assertSucceeds(createBatch(admin(), 's1').commit());
  });

  it('lugarVotacion opcional (ausente o null)', async () => {
    const db = admin();
    const d = socioData({ numeroSocio: '300', rut: RUT_C }) as Record<string, unknown>;
    delete d.lugarVotacion;
    delete d.fechaRetiro;
    const b = writeBatch(db);
    b.set(doc(db, 'socios', 's3'), d);
    b.set(doc(db, 'unicos', 'rut_' + RUT_C), { socioId: 's3' });
    b.set(doc(db, 'unicos', 'num_300'), { socioId: 's3' });
    await assertSucceeds(b.commit());
  });

  it('socio sin reservas es rechazado', async () => {
    const db = admin();
    const b = writeBatch(db);
    b.set(doc(db, 'socios', 's1'), socioData());
    await assertFails(b.commit());
    await assertFails(setDoc(doc(admin(), 'socios/s1'), socioData()));
  });

  it('socio con solo una reserva es rechazado', async () => {
    await assertFails(createBatch(admin(), 's1', {}, { skipNum: true }).commit());
    await assertFails(createBatch(admin(), 's1', {}, { skipRut: true }).commit());
  });

  it('reserva que apunta a otro socio es rechazada', async () => {
    await assertFails(createBatch(admin(), 's1', {}, { rutOwner: 'otro' }).commit());
  });

  it('reserva huerfana (sin socio) es rechazada', async () => {
    await assertFails(setDoc(doc(admin(), 'unicos/rut_' + RUT_A), { socioId: 's1' }));
  });

  it('reserva con clave que el socio no posee es rechazada', async () => {
    const db = admin();
    const b = createBatch(db, 's1');
    b.set(doc(db, 'unicos', 'rut_' + RUT_B), { socioId: 's1' });
    await assertFails(b.commit());
  });

  it('no se puede pisar la reserva de otro socio (RUT duplicado)', async () => {
    await seed('s1');
    await assertFails(createBatch(admin(), 's2', { numeroSocio: '200' }).commit());
  });

  it('no se puede pisar la reserva de otro socio (numero duplicado, otra capitalizacion)', async () => {
    await seed('s1', { numeroSocio: 'A1' });
    await assertFails(createBatch(admin(), 's2', { rut: RUT_B, numeroSocio: 'a1' }).commit());
  });

  it('no se puede secuestrar la reserva ajena reescribiendo socioId', async () => {
    await seed('s1');
    await assertFails(setDoc(doc(admin(), 'unicos/rut_' + RUT_A), { socioId: 'mio' }));
  });

  it('concurrencia: N creaciones paralelas con el mismo RUT -> exactamente 1 gana', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        createBatch(admin(), `p${i}`, { numeroSocio: `n${i}` }).commit(),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it.each([
    ['campo extra', { extra: 1 }],
    ['rut mal formado', { rut: '12.345.678-5' }],
    ['rut con k minuscula', { rut: '1234567-k' }],
    ['estado invalido', { estado: 'PENDIENTE' }],
    ['paginaLibro 0', { paginaLibro: 0 }],
    ['paginaLibro negativa', { paginaLibro: -3 }],
    ['paginaLibro decimal', { paginaLibro: 1.5 }],
    ['paginaLibro string', { paginaLibro: '5' }],
    ['nombre vacio', { nombreCompleto: '' }],
    ['nombre muy largo', { nombreCompleto: 'x'.repeat(201) }],
    ['numero con caracteres invalidos', { numeroSocio: 'a/b' }],
    ['numero numerico', { numeroSocio: 100 }],
    ['fechaIngreso string', { fechaIngreso: '2020-01-01' }],
    ['lugarVotacion numerico', { lugarVotacion: 5 }],
    ['busqueda muy larga', { busqueda: 'x'.repeat(601) }],
    ['ACTIVO con fechaRetiro', { fechaRetiro: Timestamp.now() }],
    ['RETIRADO sin fechaRetiro', { estado: 'RETIRADO', fechaRetiro: null }],
    ['RETIRADO con fechaRetiro string', { estado: 'RETIRADO', fechaRetiro: 'hoy' }],
    ['createdAt de cliente', { createdAt: Timestamp.fromDate(new Date('2000-01-01')) }],
    ['updatedAt de cliente', { updatedAt: Timestamp.fromDate(new Date('2000-01-01')) }],
  ])('rechaza datos invalidos: %s', async (_n, over) => {
    await assertFails(createBatch(admin(), 's1', over).commit());
  });

  it('RETIRADO con fechaRetiro valida es aceptado', async () => {
    await assertSucceeds(createBatch(admin(), 's1', { estado: 'RETIRADO', fechaRetiro: Timestamp.now() }).commit());
  });

  it('campo faltante obligatorio es rechazado', async () => {
    const db = admin();
    const d = socioData() as Record<string, unknown>;
    delete d.paginaLibro;
    const b = writeBatch(db);
    b.set(doc(db, 'socios', 's1'), d);
    b.set(doc(db, 'unicos', 'rut_' + RUT_A), { socioId: 's1' });
    b.set(doc(db, 'unicos', 'num_100'), { socioId: 's1' });
    await assertFails(b.commit());
  });

  it('reserva con campos extra es rechazada', async () => {
    const db = admin();
    const b = writeBatch(db);
    b.set(doc(db, 'socios', 's1'), socioData());
    b.set(doc(db, 'unicos', 'rut_' + RUT_A), { socioId: 's1', extra: true });
    b.set(doc(db, 'unicos', 'num_100'), { socioId: 's1' });
    await assertFails(b.commit());
  });
});

describe('editar socio', () => {
  beforeEach(async () => {
    await seed('s1');
  });

  it('edita nombre sin tocar reservas', async () => {
    await assertSucceeds(
      updateDoc(doc(admin(), 'socios/s1'), { nombreCompleto: 'Ana Maria', updatedAt: serverTimestamp() }),
    );
  });

  it('retira (ACTIVO -> RETIRADO con fechaRetiro) y reactiva (fechaRetiro null)', async () => {
    const db = admin();
    await assertSucceeds(
      updateDoc(doc(db, 'socios/s1'), { estado: 'RETIRADO', fechaRetiro: Timestamp.now(), updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      updateDoc(doc(db, 'socios/s1'), { estado: 'ACTIVO', fechaRetiro: null, updatedAt: serverTimestamp() }),
    );
  });

  it('rechaza estado/fechaRetiro inconsistentes', async () => {
    const db = admin();
    await assertFails(updateDoc(doc(db, 'socios/s1'), { estado: 'RETIRADO', updatedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(doc(db, 'socios/s1'), { estado: 'RETIRADO', fechaRetiro: null, updatedAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(doc(db, 'socios/s1'), { fechaRetiro: Timestamp.now(), updatedAt: serverTimestamp() }));
  });

  it('rechaza campos extra en update', async () => {
    await assertFails(updateDoc(doc(admin(), 'socios/s1'), { extra: 1, updatedAt: serverTimestamp() }));
  });

  it('createdAt es inmutable', async () => {
    await assertFails(
      updateDoc(doc(admin(), 'socios/s1'), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });

  it('updatedAt debe ser request.time', async () => {
    await assertFails(updateDoc(doc(admin(), 'socios/s1'), { nombreCompleto: 'X', updatedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(admin(), 'socios/s1'), { nombreCompleto: 'X' }));
  });

  it('no admin no puede editar', async () => {
    await assertFails(updateDoc(doc(user(), 'socios/s1'), { nombreCompleto: 'X', updatedAt: serverTimestamp() }));
  });

  it('cambiar RUT sin tocar reservas es rechazado', async () => {
    await assertFails(updateDoc(doc(admin(), 'socios/s1'), { rut: RUT_B, updatedAt: serverTimestamp() }));
  });

  it('cambiar RUT tomando la reserva nueva pero sin liberar la vieja es rechazado', async () => {
    const db = admin();
    const b = writeBatch(db);
    b.update(doc(db, 'socios/s1'), { rut: RUT_B, updatedAt: serverTimestamp() });
    b.set(doc(db, 'unicos', 'rut_' + RUT_B), { socioId: 's1' });
    await assertFails(b.commit());
  });

  it('cambiar RUT liberando la vieja sin tomar la nueva es rechazado', async () => {
    const db = admin();
    const b = writeBatch(db);
    b.update(doc(db, 'socios/s1'), { rut: RUT_B, updatedAt: serverTimestamp() });
    b.delete(doc(db, 'unicos', 'rut_' + RUT_A));
    await assertFails(b.commit());
  });

  it('cambiar RUT y numero atomicamente (libera viejas, toma nuevas) es aceptado', async () => {
    const db = admin();
    const b = writeBatch(db);
    b.update(doc(db, 'socios/s1'), { rut: RUT_B, numeroSocio: '999', updatedAt: serverTimestamp() });
    b.delete(doc(db, 'unicos', 'rut_' + RUT_A));
    b.delete(doc(db, 'unicos', 'num_100'));
    b.set(doc(db, 'unicos', 'rut_' + RUT_B), { socioId: 's1' });
    b.set(doc(db, 'unicos', 'num_999'), { socioId: 's1' });
    await assertSucceeds(b.commit());
  });

  it('cambiar a un RUT que ya posee otro socio es rechazado', async () => {
    await seed('s2', { rut: RUT_B, numeroSocio: '200' });
    const db = admin();
    const b = writeBatch(db);
    b.update(doc(db, 'socios/s1'), { rut: RUT_B, updatedAt: serverTimestamp() });
    b.delete(doc(db, 'unicos', 'rut_' + RUT_A));
    b.set(doc(db, 'unicos', 'rut_' + RUT_B), { socioId: 's1' });
    await assertFails(b.commit());
  });
});

describe('delete', () => {
  beforeEach(async () => {
    await seed('s1');
  });
  it('nadie borra socios (ni admin)', async () => {
    await assertFails(deleteDoc(doc(admin(), 'socios/s1')));
    await assertFails(deleteDoc(doc(user(), 'socios/s1')));
    await assertFails(deleteDoc(doc(anon(), 'socios/s1')));
  });
  it('no se borra una reserva en uso (dejaria al socio sin reserva)', async () => {
    await assertFails(deleteDoc(doc(admin(), 'unicos/rut_' + RUT_A)));
    await assertFails(deleteDoc(doc(admin(), 'unicos/num_100')));
  });
  it('no se puede editar una reserva existente', async () => {
    await assertFails(updateDoc(doc(admin(), 'unicos/rut_' + RUT_A), { socioId: 'x' }));
  });
  it('no admin no borra reservas', async () => {
    await assertFails(deleteDoc(doc(user(), 'unicos/rut_' + RUT_A)));
  });
});

describe('observacion', () => {
  it('se crea con observacion de texto, null o ausente', async () => {
    await assertSucceeds(createBatch(admin(), 'o1', { observacion: 'Apoderada 4º A' }).commit());
    await assertSucceeds(createBatch(admin(), 'o2', { rut: RUT_B, numeroSocio: '2', observacion: null }).commit());
  });
  it('rechaza observacion no string o de mas de 500 caracteres', async () => {
    await assertFails(createBatch(admin(), 'o3', { observacion: 5 }).commit());
    await assertFails(createBatch(admin(), 'o4', { observacion: 'x'.repeat(501) }).commit());
    await assertSucceeds(createBatch(admin(), 'o5', { observacion: 'x'.repeat(500) }).commit());
  });
  it('se edita sin tocar reservas', async () => {
    await seed('s1');
    await assertSucceeds(updateDoc(doc(admin(), 'socios/s1'), { observacion: 'Nota', updatedAt: serverTimestamp() }));
  });
});

describe('socios migrados (RUT vacio o compartido)', () => {
  it('socio con RUT compartido (reserva ajena) puede editar su observacion', async () => {
    await seed('s1');
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const d = socioData({ numeroSocio: '300' }, Timestamp.fromDate(new Date('2024-01-01')));
      await setDoc(doc(db, 'socios', 's3'), d);
      await setDoc(doc(db, 'unicos', 'num_300'), { socioId: 's3' });
    });
    await assertSucceeds(updateDoc(doc(admin(), 'socios/s3'), { observacion: 'Revisar RUT', updatedAt: serverTimestamp() }));
  });
  it('socio con RUT vacio puede editarse sin cambiar el RUT, pero no cambiarlo a basura', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'socios', 's4'), socioData({ rut: '', numeroSocio: '400' }, Timestamp.fromDate(new Date('2024-01-01'))));
      await setDoc(doc(db, 'unicos', 'num_400'), { socioId: 's4' });
    });
    await assertSucceeds(updateDoc(doc(admin(), 'socios/s4'), { observacion: 'Sin RUT', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(admin(), 'socios/s4'), { rut: 'abc', updatedAt: serverTimestamp() }));
  });
  it('socio con RUT vacio puede recibir un RUT valido reservandolo', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'socios', 's4'), socioData({ rut: '', numeroSocio: '400' }, Timestamp.fromDate(new Date('2024-01-01'))));
      await setDoc(doc(db, 'unicos', 'num_400'), { socioId: 's4' });
    });
    const db = admin();
    const b = writeBatch(db);
    b.update(doc(db, 'socios/s4'), { rut: RUT_C, updatedAt: serverTimestamp() });
    b.set(doc(db, 'unicos', 'rut_' + RUT_C), { socioId: 's4' });
    await assertSucceeds(b.commit());
  });
  it('un RUT sin reservar sigue rechazado al cambiar', async () => {
    await seed('s1');
    await assertFails(updateDoc(doc(admin(), 'socios/s1'), { rut: RUT_C, updatedAt: serverTimestamp() }));
  });
  it('la creacion sigue exigiendo RUT con formato valido', async () => {
    await assertFails(createBatch(admin(), 's5', { rut: '', numeroSocio: '500' }, { skipRut: true }).commit());
  });
});
