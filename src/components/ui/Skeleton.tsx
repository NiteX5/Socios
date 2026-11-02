export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonLista({ filas = 6 }: { filas?: number }) {
  return (
    <div aria-busy="true" role="status" className="space-y-2">
      <span className="sr-only">Cargando socios…</span>
      {Array.from({ length: filas }, (_, i) => (
        <Skeleton key={i} className="h-[72px] w-full lg:h-14" />
      ))}
    </div>
  );
}

export function SkeletonFicha() {
  return (
    <div aria-busy="true" role="status" className="space-y-4">
      <span className="sr-only">Cargando socio…</span>
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-40 w-full max-w-xs" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full max-w-md" />
      ))}
    </div>
  );
}
