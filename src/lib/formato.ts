import type { Timestamp } from 'firebase/firestore';

const fmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

/** "12 mar 2025" en zona local. */
export function formatearFecha(ts: Timestamp): string {
  return fmt.format(ts.toDate()).replace(/\./g, '');
}

/** Timestamp -> "YYYY-MM-DD" local para <input type="date">. */
export function aFechaInput(ts: Timestamp): string {
  const d = ts.toDate();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
