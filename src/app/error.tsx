'use client';

import { CircleAlert } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

// No se muestra ni registra el detalle del error: podria contener datos personales.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="contenido" className="mx-auto max-w-[1100px] px-4 py-12">
      <h1 className="sr-only">Algo salió mal</h1>
      <EmptyState
        alerta
        icono={<CircleAlert size={40} />}
        titulo="Algo salió mal"
        texto="Ocurrió un error inesperado. Puedes intentarlo de nuevo."
        accion={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variante="secondary" onClick={retry}>
              Reintentar
            </Button>
            <LinkButton href="/socios" variante="ghost">
              Ir al índice
            </LinkButton>
          </div>
        }
      />
    </main>
  );
}
