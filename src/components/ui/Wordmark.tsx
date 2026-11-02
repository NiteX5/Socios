import Link from 'next/link';

export function Wordmark({ enlace = false, grande = false }: { enlace?: boolean; grande?: boolean }) {
  const contenido = (
    <span
      className={`inline-flex items-stretch gap-2 font-serif font-semibold leading-none ${
        grande ? 'text-[2rem]' : 'text-[1.375rem] lg:text-2xl'
      }`}
    >
      <span aria-hidden="true" className="w-1 rounded-[1px] bg-accent" />
      <span>
        <span className="text-primary">Socio</span>
        <span className="text-accent-text">Índice</span>
      </span>
    </span>
  );
  if (!enlace) return contenido;
  return (
    <Link href="/socios" aria-label="SocioÍndice, ir al índice" className="inline-flex min-h-11 items-center rounded-md">
      {contenido}
    </Link>
  );
}
