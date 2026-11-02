import { describe, expect, it } from 'vitest';
import { calcularDv, claveBusquedaRut, formatearRut, normalizarRut, validarRut } from '@/lib/rut';
import { validarSocio } from '@/lib/validation';

const conDv = (cuerpo: string) => `${cuerpo}-${calcularDv(cuerpo)}`;

function buscarCuerpoConDv(dv: string, largo: number): string {
  for (let n = 10 ** (largo - 1); n < 10 ** largo; n += 7) {
    if (calcularDv(String(n)) === dv) return String(n);
  }
  throw new Error('no encontrado');
}

describe('QA rut: casos validos', () => {
  it('acepta con/sin puntos, guion, espacios y minuscula', () => {
    for (const r of ['12.345.678-5', '12345678-5', '123456785', ' 12 345 678 - 5 ', '12.345.678 5']) {
      expect(validarRut(r), r).toBe(true);
    }
  });
  it('DV K (mayuscula y minuscula) en 7 y 8 digitos', () => {
    for (const largo of [7, 8]) {
      const c = buscarCuerpoConDv('K', largo);
      expect(validarRut(`${c}-K`)).toBe(true);
      expect(validarRut(`${c}-k`)).toBe(true);
      expect(validarRut(`${c}k`)).toBe(true);
      expect(normalizarRut(`${c}-k`)).toBe(`${c}-K`);
    }
  });
  it('DV 0 se calcula (resto 11)', () => {
    const c = buscarCuerpoConDv('0', 8);
    expect(validarRut(`${c}-0`)).toBe(true);
  });
  it('formatea con puntos para 7 y 8 digitos', () => {
    expect(formatearRut('1234567-K')).toBe('1.234.567-K');
    expect(formatearRut('12345678-5')).toBe('12.345.678-5');
  });
  it('claveBusquedaRut', () => {
    expect(claveBusquedaRut('12.345.678-k')).toBe('12345678K');
  });
});

describe('QA rut: casos invalidos', () => {
  it('DV incorrecto (todos los DV distintos del correcto)', () => {
    const c = '12345678';
    for (const dv of '0123456789K') {
      expect(validarRut(`${c}-${dv}`), dv).toBe(dv === calcularDv(c));
    }
  });
  it('ceros', () => {
    for (const r of ['00000000-0', '0-0', '0000000-0', '00000000-5', '012345678-5', '01234567-4']) {
      expect(validarRut(r), r).toBe(false);
    }
  });
  it('cuerpos de 6 y 9 digitos con DV correcto se rechazan (solo 7-8)', () => {
    expect(validarRut(conDv('123456'))).toBe(false);
    expect(validarRut(conDv('123456789'))).toBe(false);
    expect(validarRut(conDv('1234567'))).toBe(true);
    expect(validarRut(conDv('99999999'))).toBe(true);
  });
  it('basura y vacios', () => {
    for (const r of ['', ' ', '-', 'K', 'abc', '1234K678-5', '12345678-', '-5', '１２３４５６７８-５', '12345678-55']) {
      expect(validarRut(r), JSON.stringify(r)).toBe(false);
    }
  });
});

describe('QA rut via validarSocio (formulario)', () => {
  const base = { nombreCompleto: 'Ana Pérez', numeroSocio: '1', paginaLibro: '3', fechaIngreso: '2025-01-10', lugarVotacion: '', observacion: '' };
  it('rechaza letras ajenas aunque el normalizador las descarte', () => {
    for (const rut of ['abc12345678-5', '12345678-5xyz', '12/345/678-5', '12_345_678-5']) {
      const r = validarSocio({ ...base, rut });
      expect(r.ok, rut).toBe(false);
    }
  });
  it('normaliza a 12345678-5', () => {
    const r = validarSocio({ ...base, rut: ' 12.345.678 - 5 ' });
    expect(r.ok && r.datos.rut).toBe('12345678-5');
  });
  it('mensajes distintos: formato vs DV', () => {
    const f = validarSocio({ ...base, rut: '123' });
    const d = validarSocio({ ...base, rut: '12345678-4' });
    expect(!f.ok && f.errores.rut).toMatch(/formato/);
    expect(!d.ok && d.errores.rut).toMatch(/verificador/);
  });
});
