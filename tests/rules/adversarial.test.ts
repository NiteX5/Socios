// Pruebas adversarias (auditoria independiente). Ejecutar con npm run test:rules.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, writeBatch, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-socios-rules',
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'), host, port: Number(port) },
  });
});
afterAll(async () => {
  await env.cleanup();
});

const T0 = Timestamp.fromDate(new Date('2024-01-01'));
const base = (over: Record<string, unknown> = {}, ts: unknown = serverTimestamp()) => ({
  numeroSocio: '100', rut: '12345678-5', nombreCompleto: 'Ana', fechaIngreso: T0, estado: 'ACTIVO',
  paginaLibro: 5, lugarVotacion: null, fechaRetiro: null, createdAt: ts, updatedAt: ts, busqueda: 'ana', ...over,
});
async function seed(id: string, over: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const d = base(over, T0) as { rut: string; numeroSocio: string };
    await setDoc(doc(db, 'socios', id), d);
    await setDoc(doc(db, 'unicos', `rut_${d.rut}`), { socioId: id });
    await setDoc(doc(db, 'unicos', `num_${d.numeroSocio.toLowerCase()}`), { socioId: id });
  });
}
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins/adminUid'), { creado: true });
  });
});
const admin = () => env.authenticatedContext('adminUid').firestore();
const user = () => env.authenticatedContext('userUid').firestore();
const anon = () => env.unauthenticatedContext().firestore();
type Db = ReturnType<typeof admin>;
function mk(db: Db, id: string, over: Record<string, unknown> = {}) {
  const d = base(over) as { rut: string; numeroSocio: string };
  const b = writeBatch(db);
  b.set(doc(db, 'socios', id), d);
  b.set(doc(db, 'unicos', `rut_${d.rut}`), { socioId: id });
  b.set(doc(db, 'unicos', `num_${String(d.numeroSocio).toLowerCase()}`), { socioId: id });
  return b;
}

describe('adversarial: acceso', () => {
  it('no admin no puede list/collectionGroup/get', async () => {
    await seed('s1');
    for (const db of [anon(), user()]) {
      await assertFails(getDocs(collection(db, 'socios')));
      await assertFails(getDocs(collectionGroup(db, 'socios')));
      await assertFails(getDocs(query(collection(db, 'socios'), where('estado', '==', 'ACTIVO'))));
      await assertFails(getDoc(doc(db, 'unicos', 'rut_12345678-5')));
      await assertFails(getDocs(collection(db, 'admins')));
      await assertFails(getDoc(doc(db, 'admins', 'adminUid')));
    }
  });
  it('autoasignacion y escritura en admins (incluido admin real)', async () => {
    await assertFails(setDoc(doc(user(), 'admins', 'userUid'), { x: 1 }));
    await assertFails(setDoc(doc(admin(), 'admins', 'otro'), { x: 1 }));
    await assertFails(deleteDoc(doc(admin(), 'admins', 'adminUid')));
    await assertFails(setDoc(doc(user(), 'otra/x'), { a: 1 }));
    await assertFails(setDoc(doc(admin(), 'otra/x'), { a: 1 }));
  });
  it('subcoleccion bajo socios denegada', async () => {
    await assertFails(setDoc(doc(admin(), 'socios/s1/notas/n1'), { a: 1 }));
  });
});

describe('adversarial: reservas', () => {
  it('reserva huerfana y reserva de otro socio rechazadas', async () => {
    await seed('s1');
    await assertFails(setDoc(doc(admin(), 'unicos', 'rut_99999999-9'), { socioId: 's1' }));
    await assertFails(setDoc(doc(admin(), 'unicos', 'rut_99999999-9'), { socioId: 'noexiste' }));
    await assertFails(setDoc(doc(admin(), 'unicos', 'x'), { socioId: 's1' }));
  });
  it('no se pisa, actualiza ni libera reserva viva', async () => {
    await seed('s1');
    await seed('s2', { rut: '11111111-1', numeroSocio: '200' });
    await assertFails(setDoc(doc(admin(), 'unicos', 'rut_12345678-5'), { socioId: 's2' }));
    await assertFails(updateDoc(doc(admin(), 'unicos', 'rut_12345678-5'), { socioId: 's2' }));
    await assertFails(deleteDoc(doc(admin(), 'unicos', 'rut_12345678-5')));
    await assertFails(deleteDoc(doc(admin(), 'unicos', 'num_100')));
  });
  it('robo de RUT: s2 cambia a rut de s1', async () => {
    await seed('s1');
    await seed('s2', { rut: '11111111-1', numeroSocio: '200' });
    const db = admin();
    const b = writeBatch(db);
    b.update(doc(db, 'socios', 's2'), { rut: '12345678-5', updatedAt: serverTimestamp() });
    b.delete(doc(db, 'unicos', 'rut_11111111-1'));
    await assertFails(b.commit());
  });
  it('robo de RUT borrando y recreando reserva ajena', async () => {
    await seed('s1');
    await seed('s2', { rut: '11111111-1', numeroSocio: '200' });
    const db = admin();
    const b = writeBatch(db);
    b.update(doc(db, 'socios', 's2'), { rut: '12345678-5', updatedAt: serverTimestamp() });
    b.delete(doc(db, 'unicos', 'rut_11111111-1'));
    b.delete(doc(db, 'unicos', 'rut_12345678-5'));
    b.set(doc(db, 'unicos', 'rut_12345678-5'), { socioId: 's2' });
    await assertFails(b.commit());
  });
  it('update de rut sin tocar reservas / dejando la vieja', async () => {
    await seed('s1');
    await assertFails(updateDoc(doc(admin(), 'socios', 's1'), { rut: '11111111-1', updatedAt: serverTimestamp() }));
    const db = admin();
    const b = writeBatch(db);
    b.update(doc(db, 'socios', 's1'), { rut: '11111111-1', updatedAt: serverTimestamp() });
    b.set(doc(db, 'unicos', 'rut_11111111-1'), { socioId: 's1' });
    await assertFails(b.commit());
  });
  it('update de numero sin reservas; cambio solo de mayusculas permitido', async () => {
    await seed('s1');
    await assertFails(updateDoc(doc(admin(), 'socios', 's1'), { numeroSocio: '101', updatedAt: serverTimestamp() }));
    await seed('s3', { rut: '33333333-3', numeroSocio: 'ab1' });
    await assertSucceeds(updateDoc(doc(admin(), 'socios', 's3'), { numeroSocio: 'AB1', updatedAt: serverTimestamp() }));
  });
  it('numero duplicado con distinto caso rechazado', async () => {
    await seed('s1', { numeroSocio: 'ab1' });
    await assertFails(mk(admin(), 's9', { rut: '44444444-4', numeroSocio: 'AB1' }).commit());
  });
  it('mismo rut en otro socio rechazado; creacion legitima OK', async () => {
    await seed('s1');
    await assertFails(mk(admin(), 's9', { numeroSocio: '999' }).commit());
    await assertSucceeds(mk(admin(), 's8', { rut: '44444444-4', numeroSocio: '888' }).commit());
  });
  it('reserva con campos extra', async () => {
    const db = admin();
    const b = writeBatch(db);
    b.set(doc(db, 'socios', 'sx'), base());
    b.set(doc(db, 'unicos', 'rut_12345678-5'), { socioId: 'sx', extra: 1 });
    b.set(doc(db, 'unicos', 'num_100'), { socioId: 'sx' });
    await assertFails(b.commit());
  });
});

describe('adversarial: forma del socio', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['campo extra', { admin: true }],
    ['rut minuscula k', { rut: '12345678-k' }],
    ['rut con puntos', { rut: '12.345.678-5' }],
    ['rut con newline', { rut: '12345678-5\n' }],
    ['numero con espacio', { numeroSocio: '10 0' }],
    ['numero 21 chars', { numeroSocio: 'a'.repeat(21) }],
    ['pagina float', { paginaLibro: 5.5 }],
    ['pagina 0', { paginaLibro: 0 }],
    ['pagina string', { paginaLibro: '5' }],
    ['estado invalido', { estado: 'activo' }],
    ['retirado sin fecha', { estado: 'RETIRADO' }],
    ['activo con fecha', { fechaRetiro: T0 }],
    ['retirado con fecha string', { estado: 'RETIRADO', fechaRetiro: '2024' }],
    ['nombre vacio', { nombreCompleto: '' }],
    ['nombre 201', { nombreCompleto: 'a'.repeat(201) }],
    ['fechaIngreso string', { fechaIngreso: '2020-01-01' }],
    ['lugar numerico', { lugarVotacion: 3 }],
    ['busqueda 601', { busqueda: 'a'.repeat(601) }],
    ['createdAt de cliente', { createdAt: T0 }],
    ['updatedAt de cliente', { updatedAt: T0 }],
  ];
  for (const [n, over] of cases) {
    it(`create rechaza: ${n}`, async () => {
      await assertFails(mk(admin(), 'sx', over).commit());
    });
  }
  it('update no puede mutar createdAt ni agregar campos ni updatedAt falso', async () => {
    await seed('s1');
    await assertFails(updateDoc(doc(admin(), 'socios', 's1'), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(admin(), 'socios', 's1'), { extra: 1, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(admin(), 'socios', 's1'), { nombreCompleto: 'Z', updatedAt: T0 }));
    await assertSucceeds(updateDoc(doc(admin(), 'socios', 's1'), { nombreCompleto: 'Z', updatedAt: serverTimestamp() }));
  });
  it('retiro consistente en update; delete prohibido; no admin no actualiza', async () => {
    await seed('s1');
    await assertFails(updateDoc(doc(admin(), 'socios', 's1'), { estado: 'RETIRADO', updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(admin(), 'socios', 's1'), { estado: 'RETIRADO', fechaRetiro: T0, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(admin(), 'socios', 's1')));
    await assertFails(updateDoc(doc(user(), 'socios', 's1'), { nombreCompleto: 'H', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(anon(), 'socios', 's1'), { nombreCompleto: 'H', updatedAt: serverTimestamp() }));
  });
  it('create sin reservas y overwrite de socio existente', async () => {
    await assertFails(setDoc(doc(admin(), 'socios', 'sy'), base()));
    await seed('s1');
    await assertFails(setDoc(doc(admin(), 'socios', 's1'), base({ nombreCompleto: 'Pisado' })));
  });
});
