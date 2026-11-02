// Logica pura de la migracion CSV -> documentos de Firestore (sin dependencias ni red).
// La usan seeds/migrar-socios.mjs (CLI) y tests/unit/seed.test.ts.

export const MAX_OBSERVACION = 500;

/** Parser CSV minimo (comillas dobles, saltos de linea dentro de comillas, BOM). */
export function parsearCsv(texto) {
  const t = texto.replace(/^﻿/, '');
  const filas = [];
  let fila = [];
  let campo = '';
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"';
          i++;
        } else comillas = false;
      } else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else campo += c;
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((x) => x.trim() !== ''));
}

const quitarTildes = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Misma normalizacion que src/lib/search.ts (normalizarTexto). */
export function normalizarTexto(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function calcularDv(cuerpo) {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
}

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/** "20-04-2013" | "Abril-2013" -> { y, m, d, aproximada } | null */
export function parsearFecha(texto) {
  const t = quitarTildes(texto);
  let m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(t);
  if (m) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const f = new Date(y, mo - 1, d);
    if (f.getFullYear() === y && f.getMonth() === mo - 1 && f.getDate() === d) return { y, m: mo, d, aproximada: false };
    return null;
  }
  m = /^([a-z]+)[-/ ](\d{4})$/.exec(t);
  if (m && MESES[m[1]]) return { y: Number(m[2]), m: MESES[m[1]], d: 1, aproximada: true };
  return null;
}

/** Interpreta la columna Rut. Devuelve { rut, nota? }: rut '' si falta o es ilegible. */
export function interpretarRut(crudo) {
  const original = crudo.trim();
  if (!original) return { rut: '', nota: 'Sin RUT registrado en el libro.' };
  const limpio = original.replace(/[.\s]/g, '').toUpperCase();
  if (!/^\d{7,8}-[\dK]$/.test(limpio)) {
    return { rut: '', nota: `RUT ilegible o incompleto en el libro: "${original}".` };
  }
  const [cuerpo, dv] = limpio.split('-');
  if (calcularDv(cuerpo) !== dv) {
    return { rut: limpio, nota: `RUT con dígito verificador incorrecto en el libro: "${original}".` };
  }
  return { rut: limpio };
}

function recortar(texto) {
  return texto.length <= MAX_OBSERVACION ? texto : `${texto.slice(0, MAX_OBSERVACION - 1)}…`;
}

function indiceColumna(cabecera, ...candidatos) {
  const norm = cabecera.map((c) => quitarTildes(c));
  for (const cand of candidatos) {
    const i = norm.findIndex((c) => c.startsWith(cand));
    if (i !== -1) return i;
  }
  throw new Error(`Falta la columna "${candidatos[0]}" en el CSV (cabecera: ${cabecera.join(' | ')})`);
}

/**
 * Convierte el texto del CSV en registros listos para escribir.
 * Nunca descarta filas: lo anomalo (RUT vacio/ilegible/repetido/DV malo, fecha faltante) se importa
 * y queda anotado en `observacion`.
 * @returns {{ registros: object[], anomalias: object[] }}
 */
export function construirRegistros(textoCsv) {
  const filas = parsearCsv(textoCsv);
  const cab = filas[0];
  if (!cab) throw new Error('CSV vacio');
  const col = {
    num: indiceColumna(cab, 'n°', 'n', 'numero'),
    nombre: indiceColumna(cab, 'nombre'),
    fecha: indiceColumna(cab, 'fecha ingreso', 'fecha'),
    rut: indiceColumna(cab, 'rut'),
    obs: indiceColumna(cab, 'observacion'),
    retirado: indiceColumna(cab, 'retirado'),
    pagina: indiceColumna(cab, 'pagina'),
  };

  const registros = [];
  let ultimaFecha = null;
  for (const f of filas.slice(1)) {
    const numeroSocio = (f[col.num] ?? '').trim();
    if (!numeroSocio) throw new Error(`Fila sin N°: ${JSON.stringify(f)}`);
    const notas = [];

    let nombreCompleto = (f[col.nombre] ?? '').replace(/\s+/g, ' ').trim();
    if (!nombreCompleto) {
      nombreCompleto = `Socio N° ${numeroSocio}`;
      notas.push('Sin nombre en el libro.');
    }

    const rutInfo = interpretarRut(f[col.rut] ?? '');
    if (rutInfo.nota) notas.push(rutInfo.nota);

    const textoFecha = (f[col.fecha] ?? '').trim();
    let fecha = parsearFecha(textoFecha);
    if (!fecha) {
      fecha = ultimaFecha ?? { y: 2013, m: 4, d: 20, aproximada: true };
      notas.push(
        textoFecha
          ? `Fecha de ingreso ilegible ("${textoFecha}"); se asignó la del socio anterior.`
          : 'Sin fecha de ingreso en el libro; se asignó la del socio anterior.',
      );
    } else if (fecha.aproximada) {
      notas.push(`Fecha de ingreso aproximada: el libro indica "${textoFecha}" (se usó el día 1).`);
    }
    ultimaFecha = { ...fecha };

    const pagina = Number((f[col.pagina] ?? '').trim());
    if (!Number.isInteger(pagina) || pagina < 1) throw new Error(`Pagina invalida en socio N° ${numeroSocio}`);

    registros.push({
      id: `mig-${numeroSocio.padStart(4, '0')}`,
      numeroSocio,
      rut: rutInfo.rut,
      nombreCompleto,
      fecha: { y: fecha.y, m: fecha.m, d: fecha.d },
      paginaLibro: pagina,
      retirado: (f[col.retirado] ?? '').trim() === '1',
      observacionOriginal: (f[col.obs] ?? '').replace(/\s+/g, ' ').trim(),
      notas,
    });
  }

  // RUT repetido: se anota en TODOS los socios del grupo; solo el primero reserva el RUT.
  const porRut = new Map();
  for (const r of registros) {
    if (!r.rut) continue;
    if (!porRut.has(r.rut)) porRut.set(r.rut, []);
    porRut.get(r.rut).push(r);
  }
  for (const grupo of porRut.values()) {
    grupo.forEach((r, i) => {
      r.reservaRut = i === 0;
      if (grupo.length > 1) {
        const otros = grupo.filter((x) => x !== r).map((x) => x.numeroSocio).join(', ');
        r.notas.push(`RUT repetido con el socio N° ${otros}.`);
      }
    });
  }
  for (const r of registros) r.reservaRut ??= false;

  const nums = new Set();
  for (const r of registros) {
    const k = r.numeroSocio.toLowerCase();
    if (nums.has(k)) throw new Error(`N° de socio repetido en el CSV: ${r.numeroSocio}`);
    nums.add(k);
  }

  for (const r of registros) {
    const partes = [];
    if (r.observacionOriginal) partes.push(r.observacionOriginal);
    if (r.notas.length > 0) partes.push(`[Migración] ${r.notas.join(' ')}`);
    r.observacion = partes.length ? recortar(partes.join('\n')) : null;
    r.busqueda = [normalizarTexto(r.nombreCompleto), r.rut.replace(/[^0-9kK]/g, '').toLowerCase(), normalizarTexto(r.numeroSocio)]
      .filter(Boolean)
      .join(' ');
  }

  const anomalias = registros
    .filter((r) => r.notas.length > 0)
    .map((r) => ({ numeroSocio: r.numeroSocio, nombre: r.nombreCompleto, notas: r.notas }));
  return { registros, anomalias };
}
