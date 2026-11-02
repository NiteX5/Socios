import { describe, expect, it } from 'vitest';
import { calcularDv, claveBusquedaRut, formatearRut, normalizarRut, validarRut } from '@/lib/rut';

// RUT de prueba ficticios; el DV fue calculado con modulo 11.
describe('normalizarRut', () => {
  it('quita puntos, guion y espacios y deja la K en mayuscula', () => {
    expect(normalizarRut('12.345.678-5')).toBe('12345678-5');
    expect(normalizarRut('12345678 5')).toBe('12345678-5');
    expect(normalizarRut('10.000.013-k')).toBe('10000013-K');
    expect(normalizarRut('10000013k')).toBe('10000013-K');
  });
  it('devuelve vacio con menos de 2 caracteres', () => {
    expect(normalizarRut('')).toBe('');
    expect(normalizarRut('5')).toBe('');
    expect(normalizarRut('..--')).toBe('');
  });
});

describe('calcularDv', () => {
  it('calcula digitos, 0 y K', () => {
    expect(calcularDv('12345678')).toBe('5');
    expect(calcularDv('7000004')).toBe('0');
    expect(calcularDv('10000013')).toBe('K');
    expect(calcularDv('9876543')).toBe('3');
  });
});

describe('validarRut', () => {
  it('acepta RUT validos de 7 y 8 digitos en varios formatos', () => {
    expect(validarRut('12.345.678-5')).toBe(true);
    expect(validarRut('12345678-5')).toBe(true);
    expect(validarRut('123456785')).toBe(true);
    expect(validarRut('9.876.543-3')).toBe(true);
    expect(validarRut('7000004-0')).toBe(true);
    expect(validarRut('10000013-K')).toBe(true);
    expect(validarRut('10000013-k')).toBe(true);
    expect(validarRut('1.000.005-K')).toBe(true);
  });
  it('rechaza DV incorrecto', () => {
    expect(validarRut('12345678-4')).toBe(false);
    expect(validarRut('10000013-1')).toBe(false);
    expect(validarRut('7000004-K')).toBe(false);
  });
  it('rechaza largos y formas no admitidas', () => {
    expect(validarRut('')).toBe(false);
    expect(validarRut('123456-5')).toBe(false); // 6 digitos
    expect(validarRut('123456789-5')).toBe(false); // 9 digitos
    expect(validarRut('012345678-5')).toBe(false); // cero a la izquierda en 9 digitos
    expect(validarRut('0123456-5')).toBe(false);
  });
});

describe('formatearRut y claveBusquedaRut', () => {
  it('formatea para mostrar', () => {
    expect(formatearRut('12345678-5')).toBe('12.345.678-5');
    expect(formatearRut('7000004-0')).toBe('7.000.004-0');
    expect(formatearRut('10000013-K')).toBe('10.000.013-K');
  });
  it('clave de busqueda solo [0-9K]', () => {
    expect(claveBusquedaRut('12.345.678-k')).toBe('12345678K');
  });
});
