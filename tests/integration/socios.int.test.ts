import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { describe, expect, it } from 'vitest';
import { getAuthInstance } from '@/lib/firebase';
import { actualizarSocio, cambiarEstado, crearSocio, listarSocios, obtenerSocio } from '@/lib/socios';
import { validarSocio } from '@/lib/validation';
import { filtrarSocios } from '@/lib/search';

function datos(over: Record<string, string> = {}) {
  const r = validarSocio({ nombreCompleto: 'Ana Pérez', rut: '12.345.678-5', numeroSocio: 'A-1', paginaLibro: '10', fechaIngreso: '2025-03-12', lugarVotacion: '', observacion: '', ...over }, new Date());
  if (!r.ok) throw new Error(JSON.stringify(r.errores));
  return r.datos;
}

describe('integracion socios.ts contra emuladores', () => {
  it('flujo completo', async () => {
    const auth = getAuthInstance();
    const cred = await createUserWithEmailAndPassword(auth, 'admin@test.cl', 'Password-123456');
    const r = await fetch('http://127.0.0.1:8080/v1/projects/demo-socios/databases/(default)/documents/admins?documentId=' + cred.user.uid, {
      method: 'POST', headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { creado: { booleanValue: true } } }),
    });
    expect(r.status).toBe(200);
    await signInWithEmailAndPassword(auth, 'admin@test.cl', 'Password-123456');

    const s = await crearSocio(datos());
    expect(s.estado).toBe('ACTIVO');
    expect(s.rut).toBe('12345678-5');
    await expect(crearSocio(datos({ numeroSocio: 'B-2' }))).rejects.toMatchObject({ codigo: 'RUT_DUPLICADO' });
    await expect(crearSocio(datos({ rut: '11.111.111-1', numeroSocio: 'a-1' }))).rejects.toMatchObject({ codigo: 'NUMERO_DUPLICADO' });
    await expect(crearSocio(datos({ numeroSocio: 'A-1' }))).rejects.toMatchObject({ codigo: 'DUPLICADO_MULTIPLE' });

    // concurrencia: mismo RUT en paralelo
    const par = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => crearSocio(datos({ rut: '9876543-3', numeroSocio: 'P' + i, nombreCompleto: 'Par ' + i }))));
    expect(par.filter((x) => x.status === 'fulfilled')).toHaveLength(1);

    // editar sin cambio de claves y con cambio
    const e1 = await actualizarSocio(s.id, datos({ nombreCompleto: 'Ana María Pérez', numeroSocio: 'a-1' }), s.updatedAt);
    expect(e1.nombreCompleto).toBe('Ana María Pérez');
    await expect(actualizarSocio(s.id, datos(), s.updatedAt)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    const e2 = await actualizarSocio(s.id, datos({ rut: '7654321-6', numeroSocio: 'Z-9', lugarVotacion: 'Escuela 12' }), e1.updatedAt);
    expect(e2.rut).toBe('7654321-6');
    // el rut viejo queda libre
    const n = await crearSocio(datos({ numeroSocio: 'N-1', nombreCompleto: 'Nuevo Socio' }));
    expect(n.rut).toBe('12345678-5');
    // editar a rut ocupado
    await expect(actualizarSocio(n.id, datos({ rut: '7654321-6', numeroSocio: 'N-1', nombreCompleto: 'Nuevo Socio' }), n.updatedAt)).rejects.toMatchObject({ codigo: 'RUT_DUPLICADO' });

    // retirar / reactivar
    const ret = await cambiarEstado(e2.id, 'RETIRADO', e2.updatedAt);
    expect(ret.estado).toBe('RETIRADO');
    expect(ret.fechaRetiro).not.toBeNull();
    await expect(cambiarEstado(e2.id, 'RETIRADO', ret.updatedAt)).rejects.toMatchObject({ codigo: 'ESTADO_INVALIDO' });
    const re = await cambiarEstado(e2.id, 'ACTIVO', ret.updatedAt);
    expect(re.fechaRetiro).toBeNull();

    const todos = await listarSocios();
    expect(todos).toHaveLength(3);
    expect(filtrarSocios(todos, { texto: '7.654.321-6', estado: 'TODOS' })).toHaveLength(1);
    expect(filtrarSocios(todos, { texto: 'escuela 12', estado: 'ACTIVO' })).toHaveLength(1);
    await expect(obtenerSocio('noexiste')).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});
