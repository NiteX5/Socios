'use client';

import { CircleAlert, RefreshCw, SearchX } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSocios } from '@/providers/SociosProvider';
import type { Socio } from '@/types/socio';
import { Button, LinkButton } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { SkeletonFicha } from './ui/Skeleton';

/** Resuelve el socio desde la cache por id de la URL y maneja carga/error/no existe. */
export function SocioCargado({ children }: { children: (socio: Socio) => ReactNode }) {
  const params = useParams<{ id: string }>();
  const { socios, cargando, error, recargar } = useSocios();
  const socio = socios.find((s) => s.id === params.id);

  if (socio) return <>{children(socio)}</>;
  if (cargando) return <SkeletonFicha />;
  if (error) {
    return (
      <EmptyState
        alerta
        icono={<CircleAlert size={40} />}
        titulo="No pudimos cargar los socios"
        texto="Revisa tu conexión a internet e inténtalo de nuevo."
        accion={
          <Button variante="secondary" onClick={() => void recargar()} icono={<RefreshCw size={20} aria-hidden="true" />}>
            Reintentar
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icono={<SearchX size={40} />}
      titulo="No encontramos este socio"
      texto="Puede que el enlace sea incorrecto."
      accion={<LinkButton href="/socios" variante="primary">Volver al índice</LinkButton>}
    />
  );
}
