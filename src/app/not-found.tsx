import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main id="contenido" className="mx-auto max-w-[1100px] px-4 py-12">
      <h1 className="sr-only">Página no encontrada</h1>
      <EmptyState
        icono={<SearchX size={40} />}
        titulo="Página no encontrada"
        texto="La dirección no existe o fue movida."
        accion={<LinkButton href="/socios" variante="primary">Ir al índice</LinkButton>}
      />
    </main>
  );
}
