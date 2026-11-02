import { createUserWithEmailAndPassword, signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { getAuthInstance, getDb } from '@/lib/firebase';
import { actualizarSocio, cambiarEstado, crearSocio, listarSocios, obtenerSocio } from '@/lib/socios';
import { calcularDv } from '@/lib/rut';
import { filtrarSocios } from '@/lib/search';
import { claveNumero, claveRut, validarSocio } from '@/lib/validation';

const FS = 'http://127.0.0.1:8080/v1/projects/demo-socios/databases/(default)/documents';
const PASS = 'Password-123456';

function datos(over: Record<string, string> = {}) {
  const r = validarSocio(
    {
      nombreCompleto: 'Socio Base',
      rut: '12.345.678-5',
      numeroSocio: 'Q-1',
      paginaLibro: '10',
      fechaIngreso: '2025-03-12',
      lugarVotacion: '',
      observacion: '',
      ...over,
    },
    new Date(),
  );
  if (!r.ok) throw new Error(JSON.stringify(r.errores));
  return r.datos;
}
const rutN = (i: number) => {
  const c = String(20_000_000 + i);
  return `${c}-${calcularDv(c)}`;
};

async function sembrarAdmin(email: string) {
  const cred = await createUserWithEmailAndPassword(getAuthInstance(), email, PASS);
  const r = await fetch(`${FS}/admins?documentId=${cred.user.uid}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { creado: { booleanValue: true } } }),
  });
  expect(r.status).toBe(200);
  return cred.user.uid;
}

describe('QA acceso: anonimo, sin admin y admin', () => {
  it('sin sesion: leer y escribir devuelven NO_AUTORIZADO', async () => {
    await signOut(getAuthInstance());
    await expect(listarSocios()).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    await expect(crearSocio(datos())).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    await expect(obtenerSocio('x')).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
  });
  it('usuario anonimo de Firebase: NO_AUTORIZADO', async () => {
    try {
      await signInAnonymously(getAuthInstance());
    } catch {
      return; // proveedor anonimo deshabilitado tambien es aceptable
    }
    await expect(listarSocios()).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    await expect(crearSocio(datos())).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    await signOut(getAuthInstance());
  });
  it('usuario autenticado sin admins/{uid}: NO_AUTORIZADO y no puede autoconcederse admin', async () => {
    const cred = await createUserWithEmailAndPassword(getAuthInstance(), 'intruso@qa.cl', PASS);
    await expect(listarSocios()).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    await expect(crearSocio(datos())).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    const { setDoc } = await import('firebase/firestore');
    await expect(setDoc(doc(getDb(), 'admins', cred.user.uid), { creado: true })).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(listarSocios()).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
    await signOut(getAuthInstance());
  });
});

describe('QA flujo como admin', () => {
  beforeAll(async () => {
    await sembrarAdmin('admin@qa.cl');
    await signInWithEmailAndPassword(getAuthInstance(), 'admin@qa.cl', PASS);
  });

  it('admin crea; lugar opcional queda null; estado ACTIVO y fechaRetiro null', async () => {
    const s = await crearSocio(datos({ rut: rutN(1), numeroSocio: 'L-1', nombreCompleto: 'Sin Lugar' }));
    expect(s.lugarVotacion).toBeNull();
    expect(s.estado).toBe('ACTIVO');
    expect(s.fechaRetiro).toBeNull();
    const c = await crearSocio(datos({ rut: rutN(2), numeroSocio: 'L-2', nombreCompleto: 'Con Lugar', lugarVotacion: ' Liceo  7 ' }));
    expect(c.lugarVotacion).toBe('Liceo 7');
  });

  it('duplicados: RUT (distinto formato), numero que difiere solo en mayusculas, ambos', async () => {
    const base = await crearSocio(datos({ rut: rutN(10), numeroSocio: 'Dup-AbC', nombreCompleto: 'Base Dup' }));
    await expect(crearSocio(datos({ rut: rutN(10), numeroSocio: 'otro-1' }))).rejects.toMatchObject({ codigo: 'RUT_DUPLICADO' });
    for (const n of ['DUP-ABC', 'dup-abc', 'dUp-aBc']) {
      await expect(crearSocio(datos({ rut: rutN(11), numeroSocio: n }))).rejects.toMatchObject({ codigo: 'NUMERO_DUPLICADO' });
    }
    await expect(crearSocio(datos({ rut: rutN(10), numeroSocio: 'dup-abc' }))).rejects.toMatchObject({ codigo: 'DUPLICADO_MULTIPLE' });
    // RUT escrito con puntos/minusculas normaliza a la misma clave
    const k = validarSocio({ nombreCompleto: 'Zed', rut: rutN(10).replace(/(\d)(\d{3})(\d{3})-/, '$1.$2.$3-'), numeroSocio: 'zz', paginaLibro: '1', fechaIngreso: '2025-01-01', lugarVotacion: '', observacion: '' });
    expect(k.ok && k.datos.rut).toBe(rutN(10));
    // no quedaron socios fantasma del intento fallido
    const lista = await listarSocios();
    expect(lista.filter((x) => x.rut === rutN(10))).toHaveLength(1);
    expect(lista.filter((x) => x.numeroSocio.toLowerCase() === 'dup-abc')).toHaveLength(1);
    expect(base.id).toBeTruthy();
  });

  it('concurrencia: 40 creaciones distintas en paralelo', async () => {
    const res = await Promise.allSettled(
      Array.from({ length: 40 }, (_, i) => crearSocio(datos({ rut: rutN(100 + i), numeroSocio: 'C-' + i, nombreCompleto: 'Conc ' + i }))),
    );
    const fallos = res.filter((r) => r.status === 'rejected');
    expect(fallos.map((f) => (f as PromiseRejectedResult).reason?.codigo ?? String((f as PromiseRejectedResult).reason))).toEqual([]);
    const lista = await listarSocios();
    expect(lista.filter((x) => x.nombreCompleto.startsWith('Conc '))).toHaveLength(40);
  });

  it('concurrencia: mismo RUT x15 => 1 gana; mismo numero con mayusculas distintas x15 => 1 gana', async () => {
    const a = await Promise.allSettled(
      Array.from({ length: 15 }, (_, i) => crearSocio(datos({ rut: rutN(500), numeroSocio: 'R-' + i, nombreCompleto: 'MismoRut ' + i }))),
    );
    expect(a.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(a.filter((r) => r.status === 'rejected').every((r) => (r as PromiseRejectedResult).reason.codigo === 'RUT_DUPLICADO')).toBe(true);

    const casos = ['NumX', 'numx', 'NUMX', 'nUmX', 'Numx'];
    const b = await Promise.allSettled(
      Array.from({ length: 15 }, (_, i) => crearSocio(datos({ rut: rutN(600 + i), numeroSocio: casos[i % casos.length]!, nombreCompleto: 'MismoNum ' + i }))),
    );
    expect(b.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(b.filter((r) => r.status === 'rejected').every((r) => (r as PromiseRejectedResult).reason.codigo === 'NUMERO_DUPLICADO')).toBe(true);
    const lista = await listarSocios();
    expect(lista.filter((x) => x.numeroSocio.toLowerCase() === 'numx')).toHaveLength(1);
    expect(lista.filter((x) => x.rut === rutN(500))).toHaveLength(1);
  });

  it('edicion: no se bloquea a si mismo (mismos RUT y numero; cambio solo de mayusculas del numero)', async () => {
    const s = await crearSocio(datos({ rut: rutN(700), numeroSocio: 'self-1', nombreCompleto: 'Auto Edit' }));
    const e1 = await actualizarSocio(s.id, datos({ rut: rutN(700), numeroSocio: 'self-1', nombreCompleto: 'Auto Edit 2', paginaLibro: '99' }), s.updatedAt);
    expect(e1.paginaLibro).toBe(99);
    const e2 = await actualizarSocio(s.id, datos({ rut: rutN(700), numeroSocio: 'SELF-1', nombreCompleto: 'Auto Edit 2' }), e1.updatedAt);
    expect(e2.numeroSocio).toBe('SELF-1');
    // la reserva sigue protegiendo el numero en cualquier capitalizacion
    await expect(crearSocio(datos({ rut: rutN(701), numeroSocio: 'Self-1' }))).rejects.toMatchObject({ codigo: 'NUMERO_DUPLICADO' });
    const e3 = await actualizarSocio(s.id, datos({ rut: rutN(700), numeroSocio: 'SELF-1', lugarVotacion: 'Escuela 3' }), e2.updatedAt);
    expect(e3.lugarVotacion).toBe('Escuela 3');
    const e4 = await actualizarSocio(s.id, datos({ rut: rutN(700), numeroSocio: 'SELF-1', lugarVotacion: '' }), e3.updatedAt);
    expect(e4.lugarVotacion).toBeNull();
  });

  it('edicion: cambiar RUT/numero libera los antiguos y bloquea los nuevos; colision con otro socio', async () => {
    const a = await crearSocio(datos({ rut: rutN(800), numeroSocio: 'ED-A', nombreCompleto: 'Edit A' }));
    const b = await crearSocio(datos({ rut: rutN(801), numeroSocio: 'ED-B', nombreCompleto: 'Edit B' }));
    await expect(actualizarSocio(a.id, datos({ rut: rutN(801), numeroSocio: 'ED-A' }), a.updatedAt)).rejects.toMatchObject({ codigo: 'RUT_DUPLICADO' });
    await expect(actualizarSocio(a.id, datos({ rut: rutN(800), numeroSocio: 'ed-b' }), a.updatedAt)).rejects.toMatchObject({ codigo: 'NUMERO_DUPLICADO' });
    await expect(actualizarSocio(a.id, datos({ rut: rutN(801), numeroSocio: 'ED-B' }), a.updatedAt)).rejects.toMatchObject({ codigo: 'DUPLICADO_MULTIPLE' });
    const a2 = await actualizarSocio(a.id, datos({ rut: rutN(802), numeroSocio: 'ED-A2' }), a.updatedAt);
    expect(a2.rut).toBe(rutN(802));
    // antiguos libres
    const c = await crearSocio(datos({ rut: rutN(800), numeroSocio: 'ED-A', nombreCompleto: 'Reusa' }));
    expect(c.rut).toBe(rutN(800));
    expect(b.id).not.toBe(a.id);
    // reservas coherentes
    const db = getDb();
    const r1 = await getDoc(doc(db, 'unicos', claveRut(rutN(802))));
    expect(r1.exists() && r1.data().socioId).toBe(a.id);
    const r0 = await getDoc(doc(db, 'unicos', claveNumero('ED-A2')));
    expect(r0.exists()).toBe(true);
  });

  it('conflicto de edicion y de cambio de estado con updatedAt viejo', async () => {
    const s = await crearSocio(datos({ rut: rutN(900), numeroSocio: 'CF-1', nombreCompleto: 'Conflicto' }));
    const e1 = await actualizarSocio(s.id, datos({ rut: rutN(900), numeroSocio: 'CF-1', paginaLibro: '11' }), s.updatedAt);
    await expect(actualizarSocio(s.id, datos({ rut: rutN(900), numeroSocio: 'CF-1', paginaLibro: '12' }), s.updatedAt)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    await expect(cambiarEstado(s.id, 'RETIRADO', s.updatedAt)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect((await obtenerSocio(s.id)).paginaLibro).toBe(11);
    // dos ediciones concurrentes con el mismo token: solo una gana
    const par = await Promise.allSettled([
      actualizarSocio(s.id, datos({ rut: rutN(900), numeroSocio: 'CF-1', paginaLibro: '21' }), e1.updatedAt),
      actualizarSocio(s.id, datos({ rut: rutN(900), numeroSocio: 'CF-1', paginaLibro: '22' }), e1.updatedAt),
      cambiarEstado(s.id, 'RETIRADO', e1.updatedAt),
    ]);
    expect(par.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(par.filter((r) => r.status === 'rejected').every((r) => (r as PromiseRejectedResult).reason.codigo === 'CONFLICTO')).toBe(true);
  });

  it('retiro/reactivacion: fechaRetiro, edicion de retirado, claves siguen reservadas', async () => {
    const s = await crearSocio(datos({ rut: rutN(1000), numeroSocio: 'RT-1', nombreCompleto: 'Retirable' }));
    const antes = Date.now();
    const r = await cambiarEstado(s.id, 'RETIRADO', s.updatedAt);
    expect(r.estado).toBe('RETIRADO');
    expect(r.fechaRetiro).not.toBeNull();
    expect(Math.abs(r.fechaRetiro!.toMillis() - antes)).toBeLessThan(60_000);
    // retirar dos veces
    await expect(cambiarEstado(s.id, 'RETIRADO', r.updatedAt)).rejects.toMatchObject({ codigo: 'ESTADO_INVALIDO' });
    // editar retirado conserva estado y fechaRetiro
    const e = await actualizarSocio(s.id, datos({ rut: rutN(1000), numeroSocio: 'RT-1', nombreCompleto: 'Retirable Editado' }), r.updatedAt);
    expect(e.estado).toBe('RETIRADO');
    expect(e.fechaRetiro!.toMillis()).toBe(r.fechaRetiro!.toMillis());
    // RUT y numero de retirado siguen reservados
    await expect(crearSocio(datos({ rut: rutN(1000), numeroSocio: 'rt-1' }))).rejects.toMatchObject({ codigo: 'DUPLICADO_MULTIPLE' });
    // filtro por estado
    const lista = await listarSocios();
    expect(filtrarSocios(lista, { texto: 'retirable', estado: 'RETIRADO' })).toHaveLength(1);
    expect(filtrarSocios(lista, { texto: 'retirable', estado: 'ACTIVO' })).toHaveLength(0);
    // reactivar
    const re = await cambiarEstado(s.id, 'ACTIVO', e.updatedAt);
    expect(re.estado).toBe('ACTIVO');
    expect(re.fechaRetiro).toBeNull();
    await expect(cambiarEstado(s.id, 'ACTIVO', re.updatedAt)).rejects.toMatchObject({ codigo: 'ESTADO_INVALIDO' });
    // re-retirar da fecha nueva >= anterior
    const r2 = await cambiarEstado(s.id, 'RETIRADO', re.updatedAt);
    expect(r2.fechaRetiro!.toMillis()).toBeGreaterThanOrEqual(r.fechaRetiro!.toMillis());
  });

  it('busqueda sobre datos reales almacenados (acentos, RUT con puntos, numero)', async () => {
    await crearSocio(datos({ rut: rutN(1100), numeroSocio: 'BU-9', nombreCompleto: 'Ñuñoa Álvarez Güiñez' }));
    const lista = await listarSocios();
    const f = (t: string) => filtrarSocios(lista, { texto: t, estado: 'TODOS' }).filter((x) => x.nombreCompleto.startsWith('Ñuñoa'));
    expect(f('nunoa alvarez')).toHaveLength(1);
    expect(f('GUINEZ')).toHaveLength(1);
    expect(f('bu-9')).toHaveLength(1);
    const c = rutN(1100);
    const punt = c.replace(/(\d{2})(\d{3})(\d{3})-/, '$1.$2.$3-');
    expect(f(punt)).toHaveLength(1);
    expect(f(c)).toHaveLength(1);
    expect(f(c.replace('-', ''))).toHaveLength(1);
  });
});
