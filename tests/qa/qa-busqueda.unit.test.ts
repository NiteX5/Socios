import { describe, expect, it } from 'vitest';
import { calcularDv } from '@/lib/rut';
import { construirBusqueda, filtrarSocios, normalizarTexto, paginar } from '@/lib/search';
import type { Socio } from '@/types/socio';

let n = 0;
function socio(o: {
  nombre: string;
  rut: string;
  numero: string;
  pagina?: number;
  lugar?: string | null;
  estado?: 'ACTIVO' | 'RETIRADO';
}): Socio {
  n++;
  return {
    id: 'id' + n,
    numeroSocio: o.numero,
    rut: o.rut,
    nombreCompleto: o.nombre,
    estado: o.estado ?? 'ACTIVO',
    paginaLibro: o.pagina ?? n,
    lugarVotacion: o.lugar ?? null,
    busqueda: construirBusqueda({
      nombreCompleto: o.nombre,
      rut: o.rut,
      numeroSocio: o.numero,
      lugarVotacion: o.lugar ?? null,
    }),
  } as unknown as Socio;
}
const rutK = (() => {
  for (let c = 1000000; ; c++) if (calcularDv(String(c)) === 'K') return `${c}-K`;
})();

const todos = [
  socio({ nombre: 'José Ñandú Muñoz', rut: '12345678-5', numero: 'A-100', pagina: 142, lugar: 'Escuela Básica N° 12' }),
  socio({ nombre: 'MARÍA PÉREZ SOTO', rut: rutK, numero: 'b-7', pagina: 9 }),
  socio({ nombre: 'Juan Rojas', rut: '7654321-6', numero: '231', pagina: 57, estado: 'RETIRADO' }),
  socio({ nombre: 'Ángela Pérez', rut: '9876543-3', numero: 'ABC', pagina: 500 }),
];
const q = (texto: string, estado: 'TODOS' | 'ACTIVO' | 'RETIRADO' = 'TODOS') =>
  filtrarSocios(todos, { texto, estado }).map((s) => s.nombreCompleto);

describe('QA busqueda por nombre', () => {
  it('parcial, mayusculas y acentos en ambos sentidos', () => {
    expect(q('jose')).toEqual(['José Ñandú Muñoz']);
    expect(q('JOSÉ')).toEqual(['José Ñandú Muñoz']);
    expect(q('mar')).toEqual(['MARÍA PÉREZ SOTO']);
    expect(q('maria')).toEqual(['MARÍA PÉREZ SOTO']);
    expect(q('María')).toEqual(['MARÍA PÉREZ SOTO']);
    expect(q('perez')).toEqual(['Ángela Pérez', 'MARÍA PÉREZ SOTO']);
    expect(q('angela')).toEqual(['Ángela Pérez']);
    expect(q('nandu')).toEqual(['José Ñandú Muñoz']);
    expect(q('ñandú')).toEqual(['José Ñandú Muñoz']);
  });
  it('acentos descompuestos (NFD) en la consulta', () => {
    expect(q('José')).toEqual(['José Ñandú Muñoz']);
  });
  it('multi-termino AND, en cualquier orden', () => {
    expect(q('perez maria')).toEqual(['MARÍA PÉREZ SOTO']);
    expect(q('soto   maria')).toEqual(['MARÍA PÉREZ SOTO']);
    expect(q('perez zzz')).toEqual([]);
  });
  it('vacio/espacios devuelve todo, ordenado alfabeticamente es', () => {
    expect(q('')).toHaveLength(4);
    expect(q('   ')).toHaveLength(4);
    expect(q('')[0]).toBe('Ángela Pérez');
  });
  it('caracteres especiales de regex no rompen', () => {
    for (const t of ['(', '[', '.*', '\\', '+', '?', '$', '^']) expect(() => q(t)).not.toThrow();
    expect(q('.*')).toEqual([]);
  });
});

describe('QA busqueda por RUT', () => {
  it('con y sin puntos/guion, parcial y minuscula k', () => {
    expect(q('12.345.678-5')).toEqual(['José Ñandú Muñoz']);
    expect(q('12345678-5')).toEqual(['José Ñandú Muñoz']);
    expect(q('123456785')).toEqual(['José Ñandú Muñoz']);
    expect(q('12345678')).toEqual(['José Ñandú Muñoz']);
    expect(q('12.345')).toEqual(['José Ñandú Muñoz']);
    expect(q('7.654.321-6')).toEqual(['Juan Rojas']);
  });
  it('RUT con K en minuscula/mayuscula, con puntos', () => {
    const [cuerpo] = rutK.split('-');
    const punteado = cuerpo!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    expect(q(`${punteado}-K`)).toEqual(['MARÍA PÉREZ SOTO']);
    expect(q(`${punteado}-k`)).toEqual(['MARÍA PÉREZ SOTO']);
    expect(q(`${cuerpo}k`)).toEqual(['MARÍA PÉREZ SOTO']);
  });
  it('RUT inexistente', () => {
    expect(q('11.111.111-1')).toEqual([]);
  });
});

describe('QA busqueda por numero, pagina y lugar', () => {
  it('numero de socio alfanumerico, case-insensitive', () => {
    expect(q('a-100')).toEqual(['José Ñandú Muñoz']);
    expect(q('A-100')).toEqual(['José Ñandú Muñoz']);
    expect(q('B-7')).toEqual(['MARÍA PÉREZ SOTO']);
    expect(q('abc')).toEqual(['Ángela Pérez']);
    expect(q('231')).toEqual(['Juan Rojas']);
  });
  it('pagina exacta', () => {
    expect(q('142')).toEqual(['José Ñandú Muñoz']);
    expect(q('500')).toEqual(['Ángela Pérez']);
  });
  it('lugar de votacion', () => {
    expect(q('escuela basica')).toEqual(['José Ñandú Muñoz']);
  });
  it('filtro de estado combinado', () => {
    expect(q('', 'RETIRADO')).toEqual(['Juan Rojas']);
    expect(q('rojas', 'ACTIVO')).toEqual([]);
    expect(q('', 'ACTIVO')).toHaveLength(3);
  });
});

describe('QA paginar', () => {
  it('limites', () => {
    expect(paginar([], 1, 25)).toEqual({ items: [], total: 0, paginas: 1 });
    const l = Array.from({ length: 51 }, (_, i) => i);
    expect(paginar(l, 3, 25).items).toEqual([50]);
    expect(paginar(l, 99, 25).items).toEqual([50]);
    expect(paginar(l, -4, 25).items).toHaveLength(25);
    expect(paginar(l, NaN, 25).items[0]).toBe(0);
    expect(paginar(l, 2.7, 25).items[0]).toBe(25);
  });
  it('normalizarTexto', () => {
    expect(normalizarTexto('  ÁÉÍÓÚ   Ñ  ')).toBe('aeiou n');
  });
});
