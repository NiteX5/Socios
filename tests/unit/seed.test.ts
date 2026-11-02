import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { construirBusqueda } from '@/lib/search';
import { MAX_OBSERVACION, construirRegistros, interpretarRut, parsearFecha } from '../../seeds/migracion.mjs';

const CSV = `N°,Nombre,Edad,Estado Civil,Fecha Ingreso,Profesion,Domicilio,Rut,Observacion,Retirado(1/0),pagina libro
1,Ana Pérez,49,Soltera,Abril-2013,Profesora,"Calle 1, Nº 2",9.684.252-K,,0,1
2,Bea Soto,28,Soltera,20-04-2013,,X,12.345.678-5,Apoderada 4º A,0,1
3,Cata Díaz,33,Casada,21-04-2013,,X,12.345.678-5,Retirada,1,1
4,Dora Ruiz,33,Casada,,,X,10.510.504-?,,0,1
5,Eva Mora,33,Casada,22-04-2013,,X,,,0,2
6,Fia Paz,33,Casada,22-04-2013,,X,12.345.678-0,,0,2
`;

describe('seed: interpretacion de datos del libro', () => {
  it('fechas exactas y aproximadas', () => {
    expect(parsearFecha('20-04-2013')).toEqual({ y: 2013, m: 4, d: 20, aproximada: false });
    expect(parsearFecha('Abril-2013')).toEqual({ y: 2013, m: 4, d: 1, aproximada: true });
    expect(parsearFecha('31-02-2013')).toBeNull();
    expect(parsearFecha('')).toBeNull();
  });
  it('RUT valido, con DV malo, ilegible y vacio', () => {
    expect(interpretarRut('9.684.252-K')).toEqual({ rut: '9684252-K' });
    expect(interpretarRut('12.345.678-0').rut).toBe('12345678-0');
    expect(interpretarRut('12.345.678-0').nota).toMatch(/verificador/);
    expect(interpretarRut('10.510.504-?')).toMatchObject({ rut: '' });
    expect(interpretarRut('')).toMatchObject({ rut: '' });
  });
});

describe('seed: construirRegistros', () => {
  const { registros, anomalias } = construirRegistros(CSV);
  const por = (n: string) => registros.find((r) => r.numeroSocio === n)!;

  it('importa todas las filas, sin descartar anomalias', () => {
    expect(registros).toHaveLength(6);
    expect(anomalias.map((a) => a.numeroSocio)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
  it('RUT repetido: se anota en ambos y solo el primero lo reserva', () => {
    expect(por('2').observacion).toContain('Apoderada 4º A');
    expect(por('2').observacion).toContain('RUT repetido con el socio N° 3');
    expect(por('3').observacion).toContain('RUT repetido con el socio N° 2');
    expect(por('2').reservaRut).toBe(true);
    expect(por('3').reservaRut).toBe(false);
  });
  it('fecha faltante hereda la del socio anterior; aproximada se anota', () => {
    expect(por('4').fecha).toEqual({ y: 2013, m: 4, d: 21 });
    expect(por('4').observacion).toContain('Sin fecha de ingreso');
    expect(por('1').observacion).toContain('aproximada');
  });
  it('estado, pagina y observacion nula cuando no hay nada que anotar', () => {
    expect(por('3').retirado).toBe(true);
    expect(por('5').paginaLibro).toBe(2);
    const limpio = construirRegistros(`N°,Nombre,Fecha Ingreso,Rut,Observacion,Retirado(1/0),pagina libro\n1,Ana Pérez,20-04-2013,9.684.252-K,,0,1\n`);
    expect(limpio.registros[0]!.observacion).toBeNull();
  });
  it('busqueda coincide con construirBusqueda de la app', () => {
    for (const r of registros) {
      expect(r.busqueda).toBe(construirBusqueda({ nombreCompleto: r.nombreCompleto, rut: r.rut, numeroSocio: r.numeroSocio, lugarVotacion: null }));
    }
  });
});

describe('seed: CSV real', () => {
  it('se procesa completo y respeta los limites de las reglas', () => {
    const { registros } = construirRegistros(readFileSync(resolve(process.cwd(), 'seeds/Registro_Socios_Colegio_Vicente.csv'), 'utf8'));
    expect(registros.length).toBeGreaterThan(700);
    for (const r of registros) {
      expect(r.observacion === null || r.observacion.length <= MAX_OBSERVACION).toBe(true);
      expect(r.nombreCompleto.length).toBeGreaterThan(0);
      expect(r.numeroSocio).toMatch(/^[A-Za-z0-9._-]{1,20}$/);
      expect(r.busqueda.length).toBeLessThanOrEqual(600);
    }
    expect(new Set(registros.map((r) => r.id)).size).toBe(registros.length);
  });
});
