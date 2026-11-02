import { describe, expect, it } from 'vitest';
import {
  claveNumero,
  claveRut,
  parsearFechaLocal,
  validarSocio,
  type SocioFormRaw,
} from '@/lib/validation';

const HOY = new Date(2026, 9, 26, 15, 30);

const valido: SocioFormRaw = {
  nombreCompleto: '  María   Pérez  Soto ',
  rut: '12.345.678-5',
  numeroSocio: ' A-231 ',
  paginaLibro: '142',
  fechaIngreso: '2025-03-12',
  lugarVotacion: '',
  observacion: '',
};

function errores(parcial: Partial<SocioFormRaw>) {
  const r = validarSocio({ ...valido, ...parcial }, HOY);
  return r.ok ? {} : r.errores;
}

describe('validarSocio', () => {
  it('normaliza datos validos', () => {
    const r = validarSocio(valido, HOY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.datos.nombreCompleto).toBe('María Pérez Soto');
    expect(r.datos.rut).toBe('12345678-5');
    expect(r.datos.numeroSocio).toBe('A-231');
    expect(r.datos.paginaLibro).toBe(142);
    expect(r.datos.lugarVotacion).toBeNull();
    expect(r.datos.fechaIngreso.getFullYear()).toBe(2025);
    expect(r.datos.fechaIngreso.getHours()).toBe(0); // medianoche local
  });

  it('lugar de votacion se conserva y recorta', () => {
    const r = validarSocio({ ...valido, lugarVotacion: '  Escuela  N° 12 ' }, HOY);
    expect(r.ok && r.datos.lugarVotacion).toBe('Escuela N° 12');
  });

  it('exige los campos obligatorios', () => {
    const e = errores({ nombreCompleto: '', rut: '', numeroSocio: '', paginaLibro: '', fechaIngreso: '' });
    expect(Object.keys(e).sort()).toEqual(['fechaIngreso', 'nombreCompleto', 'numeroSocio', 'paginaLibro', 'rut']);
  });

  it('nombre: corto y largo', () => {
    expect(errores({ nombreCompleto: 'Al' }).nombreCompleto).toMatch(/demasiado corto/);
    expect(errores({ nombreCompleto: 'a'.repeat(121) }).nombreCompleto).toMatch(/120/);
    expect(errores({ nombreCompleto: 'a'.repeat(120) }).nombreCompleto).toBeUndefined();
    expect(errores({ nombreCompleto: 'Ana\u0000 Ruiz' }).nombreCompleto).toBeDefined();
  });

  it('RUT: formato y digito verificador', () => {
    expect(errores({ rut: '12345' }).rut).toMatch(/formato/);
    expect(errores({ rut: 'abc12345678-5' }).rut).toMatch(/formato/);
    expect(errores({ rut: '12345678-4' }).rut).toMatch(/verificador/);
    expect(errores({ rut: '10.000.013-k' }).rut).toBeUndefined();
  });

  it('numero de socio: solo caracteres permitidos y maximo 20', () => {
    expect(errores({ numeroSocio: 'a b' }).numeroSocio).toBeDefined();
    expect(errores({ numeroSocio: 'a/b' }).numeroSocio).toBeDefined();
    expect(errores({ numeroSocio: 'x'.repeat(21) }).numeroSocio).toBeDefined();
    expect(errores({ numeroSocio: 'x'.repeat(20) }).numeroSocio).toBeUndefined();
  });

  it('pagina: entero positivo hasta 1.000.000', () => {
    for (const p of ['0', '-3', '1.5', '1e3', 'abc', '1000001', '']) {
      expect(errores({ paginaLibro: p }).paginaLibro, p).toBeDefined();
    }
    expect(errores({ paginaLibro: '1000000' }).paginaLibro).toBeUndefined();
    expect(errores({ paginaLibro: '1' }).paginaLibro).toBeUndefined();
  });

  it('fecha: invalida, futura, anterior a 1900; hoy es valido', () => {
    expect(errores({ fechaIngreso: '2025-02-30' }).fechaIngreso).toMatch(/no es válida/);
    expect(errores({ fechaIngreso: '12/03/2025' }).fechaIngreso).toMatch(/no es válida/);
    expect(errores({ fechaIngreso: '1899-12-31' }).fechaIngreso).toMatch(/no es válida/);
    expect(errores({ fechaIngreso: '2026-10-27' }).fechaIngreso).toMatch(/posterior a hoy/);
    expect(errores({ fechaIngreso: '2026-10-26' }).fechaIngreso).toBeUndefined();
    expect(errores({ fechaIngreso: '1900-01-01' }).fechaIngreso).toBeUndefined();
  });

  it('lugar de votacion: maximo 120', () => {
    expect(errores({ lugarVotacion: 'x'.repeat(121) }).lugarVotacion).toMatch(/120/);
    expect(errores({ lugarVotacion: 'x'.repeat(120) }).lugarVotacion).toBeUndefined();
  });
});

describe('claves de unicidad', () => {
  it('numero en minuscula y rut tal cual', () => {
    expect(claveNumero(' A-231 ')).toBe('num_a-231');
    expect(claveRut('12345678-5')).toBe('rut_12345678-5');
  });
});

describe('parsearFechaLocal', () => {
  it('rechaza fechas inexistentes y acepta bisiestos', () => {
    expect(parsearFechaLocal('2025-02-29')).toBeNull();
    expect(parsearFechaLocal('2024-02-29')).not.toBeNull();
    expect(parsearFechaLocal('2025-13-01')).toBeNull();
  });
});

describe('observacion y RUT heredado', () => {
  it('observacion vacia -> null, con texto se recorta', () => {
    const a = validarSocio({ ...valido, observacion: '   ' }, HOY);
    expect(a.ok && a.datos.observacion).toBeNull();
    const b = validarSocio({ ...valido, observacion: '  Apoderada 4º A \r\n x ' }, HOY);
    expect(b.ok && b.datos.observacion).toBe('Apoderada 4º A \n x');
  });
  it('rechaza mas de 500 caracteres y caracteres de control', () => {
    const largo = validarSocio({ ...valido, observacion: 'x'.repeat(501) }, HOY);
    expect(!largo.ok && largo.errores.observacion).toMatch(/500/);
    const ctl = validarSocio({ ...valido, observacion: 'a\u0000b' }, HOY);
    expect(!ctl.ok && ctl.errores.observacion).toBeTruthy();
  });
  it('RUT sin cambios se acepta aunque este vacio o con DV malo; si cambia se valida', () => {
    const vacio = validarSocio({ ...valido, rut: '' }, HOY, { rutOriginal: '' });
    expect(vacio.ok && vacio.datos.rut).toBe('');
    const dvMalo = validarSocio({ ...valido, rut: '12.345.678-0' }, HOY, { rutOriginal: '12345678-0' });
    expect(dvMalo.ok).toBe(true);
    const cambiado = validarSocio({ ...valido, rut: '12.345.678-0' }, HOY, { rutOriginal: '11111111-1' });
    expect(cambiado.ok).toBe(false);
    expect(validarSocio({ ...valido, rut: '' }, HOY).ok).toBe(false);
  });
});
