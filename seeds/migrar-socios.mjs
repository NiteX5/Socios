#!/usr/bin/env node
// Migra seeds/Registro_Socios_Colegio_Vicente.csv a Firestore (colecciones `socios` y `unicos`).
//
// Uso:
//   node seeds/migrar-socios.mjs                       Simulacion: valida y escribe seeds/reporte-migracion.json
//   node seeds/migrar-socios.mjs --apply               Escribe en el EMULADOR (requiere FIRESTORE_EMULATOR_HOST)
//   node seeds/migrar-socios.mjs --apply --proyecto ID Escribe en el proyecto REAL ID (requiere credenciales:
//                                                      GOOGLE_APPLICATION_CREDENTIALS o `gcloud auth application-default login`)
//   Opciones: --csv <ruta>   CSV alternativo
//
// Es idempotente: los socios ya migrados (mismo id `mig-NNNN`) se omiten, nunca se sobreescriben.
// Escribe con Admin SDK (se salta las reglas), por eso crea tambien las reservas `unicos/*` que la app espera.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { construirRegistros } from './migracion.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valor = (n) => {
  const i = args.indexOf(n);
  return i !== -1 ? args[i + 1] : undefined;
};

const csvRuta = resolve(valor('--csv') ?? resolve(aqui, 'Registro_Socios_Colegio_Vicente.csv'));
const aplicar = flag('--apply');
const emulador = process.env.FIRESTORE_EMULATOR_HOST;
const proyectoReal = valor('--proyecto');

const { registros, anomalias } = construirRegistros(readFileSync(csvRuta, 'utf8'));

const resumen = {
  csv: csvRuta,
  totalFilas: registros.length,
  activos: registros.filter((r) => !r.retirado).length,
  retirados: registros.filter((r) => r.retirado).length,
  conObservacion: registros.filter((r) => r.observacion).length,
  conAnomalias: anomalias.length,
  sinRut: registros.filter((r) => !r.rut).length,
  rutReservado: registros.filter((r) => r.reservaRut).length,
};
console.log(resumen);

const reporte = resolve(aqui, 'reporte-migracion.json');
writeFileSync(reporte, JSON.stringify({ resumen, anomalias }, null, 2), 'utf8');
console.log(`Reporte de anomalias: ${reporte}`);

if (!aplicar) {
  console.log('\nSimulacion: no se escribio nada. Usa --apply para migrar.');
  process.exit(0);
}

if (!emulador && !proyectoReal) {
  console.error(
    '\nCon --apply debes indicar el destino: define FIRESTORE_EMULATOR_HOST (emulador) o pasa --proyecto <id> (proyecto real).',
  );
  process.exit(1);
}
const projectId = emulador ? (proyectoReal ?? process.env.GCLOUD_PROJECT ?? 'demo-socios') : proyectoReal;
console.log(emulador ? `\nDestino: EMULADOR ${emulador} (proyecto ${projectId})` : `\nDestino: PROYECTO REAL ${projectId}`);

const { initializeApp } = await import('firebase-admin/app');
const { Timestamp, getFirestore } = await import('firebase-admin/firestore');
initializeApp({ projectId });
const db = getFirestore();

const ahora = Timestamp.now();
const refSocio = (r) => db.collection('socios').doc(r.id);
const refRut = (r) => db.collection('unicos').doc(`rut_${r.rut}`);
const refNum = (r) => db.collection('unicos').doc(`num_${r.numeroSocio.toLowerCase()}`);

// Estado actual para ser idempotente.
const existentes = new Set((await db.getAll(...registros.map(refSocio))).filter((s) => s.exists).map((s) => s.id));
const numerosTomados = new Set(
  (await db.getAll(...registros.map(refNum))).filter((s) => s.exists).map((s) => s.id),
);
const rutsTomados = new Set(
  (await db.getAll(...registros.filter((r) => r.rut).map(refRut))).filter((s) => s.exists).map((s) => s.id),
);

let creados = 0;
let omitidos = 0;
const conflictos = [];
let batch = db.batch();
let enLote = 0;

for (const r of registros) {
  if (existentes.has(r.id)) {
    omitidos++;
    continue;
  }
  if (numerosTomados.has(`num_${r.numeroSocio.toLowerCase()}`)) {
    conflictos.push(`N° ${r.numeroSocio}: ya existe otro socio con ese número; no se importó.`);
    continue;
  }
  const fechaIngreso = Timestamp.fromDate(new Date(r.fecha.y, r.fecha.m - 1, r.fecha.d));
  batch.set(refSocio(r), {
    numeroSocio: r.numeroSocio,
    rut: r.rut,
    nombreCompleto: r.nombreCompleto,
    fechaIngreso,
    estado: r.retirado ? 'RETIRADO' : 'ACTIVO',
    paginaLibro: r.paginaLibro,
    lugarVotacion: null,
    observacion: r.observacion,
    // La fecha real de retiro no esta en el libro; se registra la de la migracion (las reglas exigen una).
    fechaRetiro: r.retirado ? ahora : null,
    createdAt: ahora,
    updatedAt: ahora,
    busqueda: r.busqueda,
  });
  batch.set(refNum(r), { socioId: r.id });
  if (r.reservaRut && !rutsTomados.has(`rut_${r.rut}`)) batch.set(refRut(r), { socioId: r.id });
  creados++;
  enLote++;
  if (enLote >= 150) {
    await batch.commit();
    batch = db.batch();
    enLote = 0;
  }
}
if (enLote > 0) await batch.commit();

console.log(`\nListo. Creados: ${creados} · Ya existian (omitidos): ${omitidos} · Conflictos: ${conflictos.length}`);
conflictos.forEach((c) => console.log(`  - ${c}`));
