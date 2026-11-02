import { normalizarTexto } from '@/lib/search';

function normalizarCaracter(c: string): string {
  return c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Resalta con <mark> las coincidencias de los terminos buscados dentro de un texto. */
export function Resaltado({ texto, busqueda }: { texto: string; busqueda: string }) {
  const tokens = normalizarTexto(busqueda).split(' ').filter((t) => t.length >= 1);
  if (tokens.length === 0) return <>{texto}</>;

  // Mapa caracter a caracter: solo si la normalizacion conserva el largo.
  const normalizado: string[] = Array.from(texto, normalizarCaracter);
  if (normalizado.some((n) => n.length !== 1)) return <>{texto}</>;
  const plano = normalizado.join('');
  const marcado = new Array<boolean>(plano.length).fill(false);
  for (const t of tokens) {
    let desde = 0;
    for (;;) {
      const i = plano.indexOf(t, desde);
      if (i === -1) break;
      for (let k = i; k < i + t.length; k++) marcado[k] = true;
      desde = i + t.length;
    }
  }
  const partes: { texto: string; marca: boolean }[] = [];
  const chars = Array.from(texto);
  chars.forEach((c, i) => {
    const marca = marcado[i] ?? false;
    const ultima = partes[partes.length - 1];
    if (ultima && ultima.marca === marca) ultima.texto += c;
    else partes.push({ texto: c, marca });
  });
  return (
    <>
      {partes.map((p, i) =>
        p.marca ? (
          <mark key={i} className="bg-accent-soft text-ink">
            {p.texto}
          </mark>
        ) : (
          <span key={i}>{p.texto}</span>
        ),
      )}
    </>
  );
}
