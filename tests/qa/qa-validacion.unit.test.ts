import { describe, expect, it } from 'vitest';
import { claveNumero, parsearFechaLocal, validarSocio, type SocioFormRaw } from '@/lib/validation';

const ok: SocioFormRaw = {
  nombreCompleto: 'María Pérez',
  rut: '12.345.678-5',
  numeroSocio: 'A-1',
  paginaLibro: '10',
  fechaIngreso: '2025-03-12',
  lugarVotacion: '',
  observacion: '',
};
const hoy = new Date(2026, 5, 15, 12);
const v = (o: Partial<SocioFormRaw>) => validarSocio({ ...ok, ...o }, hoy);
const err = (o: Partial<SocioFormRaw>) => {
  const r = v(o);
  return r.ok ? {} : r.errores;
};

describe('QA campos obligatorios', () => {
  it('cada campo obligatorio vacio o solo espacios produce error en ese campo', () => {
    for (const campo of ['nombreCompleto', 'rut', 'numeroSocio', 'paginaLibro', 'fechaIngreso'] as const) {
      expect(err({ [campo]: '' }), campo + ' vacio').toHaveProperty(campo);
      expect(err({ [campo]: '   ' }), campo + ' espacios').toHaveProperty(campo);
    }
  });
  it('todo vacio => 5 errores y lugar NO es obligatorio', () => {
    const e = err({ nombreCompleto: '', rut: '', numeroSocio: '', paginaLibro: '', fechaIngreso: '', lugarVotacion: '', observacion: '' });
    expect(Object.keys(e).sort()).toEqual(['fechaIngreso', 'nombreCompleto', 'numeroSocio', 'paginaLibro', 'rut']);
  });
});

describe('QA lugar de votacion opcional', () => {
  it('vacio y solo espacios => null', () => {
    for (const l of ['', '   ', '\t \n']) {
      const r = v({ lugarVotacion: l });
      expect(r.ok && r.datos.lugarVotacion).toBeNull();
    }
  });
  it('120 ok, 121 error, colapsa espacios', () => {
    expect(v({ lugarVotacion: 'x'.repeat(120) }).ok).toBe(true);
    expect(err({ lugarVotacion: 'x'.repeat(121) })).toHaveProperty('lugarVotacion');
    const r = v({ lugarVotacion: '  Escuela   N°  12 ' });
    expect(r.ok && r.datos.lugarVotacion).toBe('Escuela N° 12');
  });
  it('caracteres de control rechazados', () => {
    expect(err({ lugarVotacion: 'a\u0000b' })).toHaveProperty('lugarVotacion');
  });
});

describe('QA nombre', () => {
  it('2 chars error, 3 ok, 120 ok, 121 error', () => {
    expect(err({ nombreCompleto: 'Al' })).toHaveProperty('nombreCompleto');
    expect(v({ nombreCompleto: 'Ali' }).ok).toBe(true);
    expect(v({ nombreCompleto: 'a'.repeat(120) }).ok).toBe(true);
    expect(err({ nombreCompleto: 'a'.repeat(121) })).toHaveProperty('nombreCompleto');
  });
  it('colapsa espacios y tabs; rechaza control', () => {
    const r = v({ nombreCompleto: '  Ana\t\t  María   Soto ' });
    expect(r.ok && r.datos.nombreCompleto).toBe('Ana María Soto');
    expect(err({ nombreCompleto: 'Ana\u0007 Soto' })).toHaveProperty('nombreCompleto');
  });
  it('nombre con HTML se conserva como texto (React escapa)', () => {
    const r = v({ nombreCompleto: '<img src=x onerror=alert(1)>' });
    expect(r.ok && r.datos.nombreCompleto).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('QA numero de socio', () => {
  it('limites y caracteres', () => {
    expect(v({ numeroSocio: 'A'.repeat(20) }).ok).toBe(true);
    expect(err({ numeroSocio: 'A'.repeat(21) })).toHaveProperty('numeroSocio');
    for (const n of ['A B', 'ñ1', 'a/b', 'a#1', '1,2', '٣']) {
      expect(err({ numeroSocio: n }), n).toHaveProperty('numeroSocio');
    }
    for (const n of ['a.b_c-d', '007', 'abc']) expect(v({ numeroSocio: n }).ok, n).toBe(true);
  });
  it('trim', () => {
    const r = v({ numeroSocio: '  X-9  ' });
    expect(r.ok && r.datos.numeroSocio).toBe('X-9');
  });
  it('clave unica case-insensitive: solo difiere en mayusculas', () => {
    expect(claveNumero('ABC')).toBe(claveNumero('abc'));
    expect(claveNumero(' Abc ')).toBe(claveNumero('aBC'));
    expect(claveNumero('007')).not.toBe(claveNumero('7'));
  });
});

describe('QA pagina', () => {
  it('rechaza 0, negativos, decimales, notacion, texto, enormes', () => {
    for (const p of ['0', '-1', '1.5', '1e3', 'abc', '1000001', '99999999999999999999', '+5', '0x10', '1 2']) {
      expect(err({ paginaLibro: p }), p).toHaveProperty('paginaLibro');
    }
  });
  it('acepta 1, 1000000, con espacios y ceros a la izquierda', () => {
    for (const [p, n] of [['1', 1], ['1000000', 1_000_000], [' 12 ', 12], ['007', 7]] as const) {
      const r = v({ paginaLibro: p });
      expect(r.ok && r.datos.paginaLibro, p).toBe(n);
    }
  });
});

describe('QA fecha de ingreso', () => {
  it('fechas imposibles o fuera de rango', () => {
    for (const f of ['2025-02-30', '2025-13-01', '2025-00-10', '1899-12-31', '2026-06-16', '9999-12-31', '12/03/2025', '2025-3-1', 'hoy']) {
      expect(err({ fechaIngreso: f }), f).toHaveProperty('fechaIngreso');
    }
  });
  it('validas: hoy, bisiesto, 1900-01-01', () => {
    for (const f of ['2026-06-15', '2024-02-29', '1900-01-01']) expect(v({ fechaIngreso: f }).ok, f).toBe(true);
    expect(err({ fechaIngreso: '2025-02-29' })).toHaveProperty('fechaIngreso');
  });
  it('se interpreta como medianoche local (sin corrimiento de dia)', () => {
    const d = parsearFechaLocal('2025-03-12')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2025, 2, 12, 0]);
  });
});
