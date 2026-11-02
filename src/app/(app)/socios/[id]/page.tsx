'use client';

import { ArrowLeft, Pencil, UserCheck, UserMinus } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { SocioCargado } from '@/components/SocioCargado';
import { Alert } from '@/components/ui/Alert';
import { Button, LinkButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EstadoBadge } from '@/components/ui/EstadoBadge';
import { Folio } from '@/components/ui/Folio';
import { useToast } from '@/components/ui/Toast';
import { traducirErrorFirebase } from '@/lib/errors';
import { formatearFecha } from '@/lib/formato';
import { formatearRut } from '@/lib/rut';
import { cambiarEstado } from '@/lib/socios';
import { useTitulo } from '@/lib/useTitulo';
import { useSocios } from '@/providers/SociosProvider';
import type { Socio } from '@/types/socio';

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="py-2 sm:grid sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted">{etiqueta}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function Ficha({ socio }: { socio: Socio }) {
  useTitulo(socio.nombreCompleto);
  const { upsert, recargar } = useSocios();
  const { mostrar } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const retirado = socio.estado === 'RETIRADO';

  async function confirmar() {
    setCargando(true);
    setError(null);
    try {
      const nuevo = await cambiarEstado(socio.id, retirado ? 'ACTIVO' : 'RETIRADO', socio.updatedAt);
      upsert(nuevo);
      setAbierto(false);
      mostrar(retirado ? 'Socio reactivado.' : 'Socio retirado.');
      // El boton cambia de texto; el foco vuelve a el.
      setTimeout(() => botonRef.current?.focus(), 0);
    } catch (e) {
      const err = traducirErrorFirebase(e);
      if (err.codigo === 'CONFLICTO') {
        setError('Este socio fue modificado por otra persona. Recarga la ficha e inténtalo de nuevo.');
        void recargar();
      } else {
        setError(
          retirado
            ? 'No se pudo reactivar al socio. Inténtalo de nuevo.'
            : 'No se pudo retirar al socio. Inténtalo de nuevo.',
        );
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-180 space-y-6">
      <Link href="/socios" className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-primary hover:underline">
        <ArrowLeft size={20} aria-hidden="true" />
        Volver al índice
      </Link>

      <div className="space-y-4 max-lg:flex max-lg:flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3 max-lg:order-2">
          <h1 className="min-w-0 font-serif text-[1.75rem] font-bold leading-9 sm:text-[2rem] sm:leading-10">
            {socio.nombreCompleto}
          </h1>
          <EstadoBadge estado={socio.estado} />
        </div>

        {retirado && (
          <Alert variante="warn" className="max-lg:order-3">
            {socio.fechaRetiro
              ? `Este socio fue retirado el ${formatearFecha(socio.fechaRetiro)}.`
              : 'Este socio está retirado.'}
          </Alert>
        )}

        <div className="gap-8 lg:grid lg:grid-cols-[auto_1fr] max-lg:contents">
          <div className="max-lg:order-1">
            <Folio pagina={socio.paginaLibro} />
          </div>
          <dl className="max-lg:order-4 divide-y divide-border">
            <Dato etiqueta="RUT">
              <span className="tabular">{socio.rut ? formatearRut(socio.rut) : 'Sin RUT registrado'}</span>
            </Dato>
            <Dato etiqueta="N° de socio">
              <span className="tabular">{socio.numeroSocio}</span>
            </Dato>
            <Dato etiqueta="Estado">
              <EstadoBadge estado={socio.estado} />
            </Dato>
            <Dato etiqueta="Fecha de ingreso">{formatearFecha(socio.fechaIngreso)}</Dato>
            {socio.lugarVotacion && <Dato etiqueta="Lugar de votación">{socio.lugarVotacion}</Dato>}
            {socio.observacion && (
              <Dato etiqueta="Observación">
                <span className="whitespace-pre-line">{socio.observacion}</span>
              </Dato>
            )}
            {retirado && socio.fechaRetiro && (
              <Dato etiqueta="Fecha de retiro">{formatearFecha(socio.fechaRetiro)}</Dato>
            )}
          </dl>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row max-lg:order-5">
          <LinkButton href={`/socios/${socio.id}/editar`} variante="secondary" icono={<Pencil size={20} aria-hidden="true" />}>
            Editar
          </LinkButton>
          <Button
            ref={botonRef}
            variante={retirado ? 'secondary' : 'danger-outline'}
            icono={retirado ? <UserCheck size={20} aria-hidden="true" /> : <UserMinus size={20} aria-hidden="true" />}
            onClick={() => {
              setError(null);
              setAbierto(true);
            }}
          >
            {retirado ? 'Reactivar socio' : 'Retirar socio'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        abierto={abierto}
        alerta={!retirado}
        titulo={retirado ? 'Reactivar socio' : 'Retirar socio'}
        descripcion={
          retirado ? (
            <p>
              ¿Confirmas que quieres reactivar a <strong>{socio.nombreCompleto}</strong> (N° {socio.numeroSocio})? Volverá a
              aparecer con el estado “Activo”.
            </p>
          ) : (
            <>
              <p>
                ¿Confirmas que quieres retirar a <strong>{socio.nombreCompleto}</strong> (N° {socio.numeroSocio})?
              </p>
              <p className="mt-2 text-muted">
                Seguirá apareciendo en el índice con el estado “Retirado”. Puedes reactivarlo cuando quieras.
              </p>
            </>
          )
        }
        textoConfirmar={retirado ? 'Reactivar socio' : 'Retirar socio'}
        varianteConfirmar={retirado ? 'primary' : 'danger'}
        iconoConfirmar={retirado ? <UserCheck size={20} aria-hidden="true" /> : <UserMinus size={20} aria-hidden="true" />}
        cargando={cargando}
        error={error}
        onCancelar={() => setAbierto(false)}
        onConfirmar={() => void confirmar()}
      />
    </div>
  );
}

export default function FichaPage() {
  return <SocioCargado>{(socio) => <Ficha socio={socio} />}</SocioCargado>;
}
