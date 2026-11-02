import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { construirBusqueda, filtrarSocios, normalizarTexto, paginar } from '@/lib/search';
import type { Socio } from '@/types/socio';

function socio(id: string, nombre: string, rut: string, num: string, extra: Partial<Socio> = {}): Socio {
  const ts = Timestamp.fromDate(new Date(2025, 0, 1));
  const base = { nombreCompleto: nombre, rut, numeroSocio: num, lugarVotacion: null };
  return {
    id,
    ...base,
    fechaIngreso: ts,
    estado: 'ACTIVO',
    paginaLibro: 10,
    observacion: null,
    fechaRetiro: null,
    createdAt: ts,
    updatedAt: ts,
    busqueda: construirBusqueda(base),
    ...extra,
  };
}

const lista: Socio[] = [
  socio('1', 'María Fernanda Pérez Soto', '12345678-5', '231', { paginaLibro: 142 }),
  socio('2', 'Juan Ñancupil Rojas', '9876543-3', 'A-118', { estado: 'RETIRADO', fechaRetiro: Timestamp.now() }),
  socio('3', 'Ana Pérez Díaz', '10000013-K', '45', { lugarVotacion: 'Escuela Básica Nº 12' }),
  socio('4', 'Álvaro Abarca', '7000004-0', '7'),
];
// El lugar de votacion debe estar en `busqueda` (se reconstruye para el socio 3).
lista[2] = socio('3', 'Ana Pérez Díaz', '10000013-K', '45', {
  busqueda: construirBusqueda({
    nombreCompleto: 'Ana Pérez Díaz',
    rut: '10000013-K',
    numeroSocio: '45',
    lugarVotacion: 'Escuela Básica Nº 12',
  }),
  lugarVotacion: 'Escuela Básica Nº 12',
});

const ids = (r: Socio[]) => r.map((s) => s.id);
const buscar = (texto: string, estado: 'TODOS' | 'ACTIVO' | 'RETIRADO' = 'TODOS') =>
  ids(filtrarSocios(lista, { texto, estado }));

describe('normalizarTexto', () => {
  it('quita tildes, pasa a minusculas y colapsa espacios', () => {
    expect(normalizarTexto('  María   PÉREZ ')).toBe('maria perez');
    expect(normalizarTexto('Ñancupil')).toBe('nancupil');
  });
});

describe('construirBusqueda', () => {
  it('incluye nombre, rut sin guion en minuscula, numero y lugar', () => {
    const b = construirBusqueda({
      nombreCompleto: 'Ana Pérez',
      rut: '10000013-K',
      numeroSocio: 'A-1',
      lugarVotacion: 'Colegio Ñuñoa',
    });
    expect(b).toBe('ana perez 10000013k a-1 colegio nunoa');
  });
});

describe('filtrarSocios', () => {
  it('sin texto devuelve todos ordenados por nombre (es)', () => {
    expect(buscar('')).toEqual(['4', '3', '2', '1']);
  });
  it('ignora tildes y mayusculas', () => {
    expect(buscar('maria')).toEqual(['1']);
    expect(buscar('ALVARO')).toEqual(['4']);
    expect(buscar('nancupil')).toEqual(['2']);
  });
  it('todos los terminos deben coincidir (AND)', () => {
    expect(buscar('perez')).toEqual(['3', '1']);
    expect(buscar('perez ana')).toEqual(['3']);
    expect(buscar('perez zzz')).toEqual([]);
  });
  it('RUT con puntos, guion o K minuscula', () => {
    expect(buscar('12.345.678-5')).toEqual(['1']);
    expect(buscar('12345678')).toEqual(['1']);
    expect(buscar('10.000.013-k')).toEqual(['3']);
    expect(buscar('9876543-3')).toEqual(['2']);
  });
  it('numero de socio (case-insensitive) y pagina exacta', () => {
    expect(buscar('a-118')).toEqual(['2']);
    expect(buscar('142')).toEqual(['1']);
  });
  it('lugar de votacion', () => {
    expect(buscar('basica 12')).toEqual(['3']);
  });
  it('filtro de estado', () => {
    expect(buscar('', 'RETIRADO')).toEqual(['2']);
    expect(buscar('', 'ACTIVO')).toEqual(['4', '3', '1']);
    expect(buscar('juan', 'ACTIVO')).toEqual([]);
  });
  it('no muta la lista original', () => {
    const copia = ids(lista);
    filtrarSocios(lista, { texto: '', estado: 'TODOS' });
    expect(ids(lista)).toEqual(copia);
  });
});

describe('paginar', () => {
  const items = Array.from({ length: 60 }, (_, i) => i + 1);
  it('divide en paginas de 25', () => {
    const p1 = paginar(items, 1, 25);
    expect(p1.items).toHaveLength(25);
    expect(p1.paginas).toBe(3);
    expect(p1.total).toBe(60);
    expect(paginar(items, 3, 25).items).toEqual(items.slice(50));
  });
  it('limita la pagina fuera de rango', () => {
    expect(paginar(items, 99, 25).items[0]).toBe(51);
    expect(paginar(items, 0, 25).items[0]).toBe(1);
    expect(paginar(items, Number.NaN, 25).items[0]).toBe(1);
  });
  it('lista vacia', () => {
    expect(paginar([], 1, 25)).toEqual({ items: [], total: 0, paginas: 1 });
  });
});

describe('filtro con observaciones', () => {
  const lista = [
    socio('1', 'Ana', '10000013-K', '1', { observacion: 'RUT repetido' }),
    socio('2', 'Bea', '11111111-1', '2'),
  ];
  it('solo devuelve socios con observacion', () => {
    const r = filtrarSocios(lista, { texto: '', estado: 'TODOS', conObservaciones: true });
    expect(r.map((s) => s.id)).toEqual(['1']);
  });
  it('sin el filtro devuelve todos', () => {
    expect(filtrarSocios(lista, { texto: '', estado: 'TODOS' })).toHaveLength(2);
  });
});
