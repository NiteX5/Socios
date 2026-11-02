'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { SocioCargado } from '@/components/SocioCargado';
import { SocioForm } from '@/components/SocioForm';
import { EstadoBadge } from '@/components/ui/EstadoBadge';
import { useToast } from '@/components/ui/Toast';
import { mensajeUsuario, traducirErrorFirebase } from '@/lib/errors';
import { aFechaInput } from '@/lib/formato';
import { formatearRut } from '@/lib/rut';
import { actualizarSocio } from '@/lib/socios';
import { useTitulo } from '@/lib/useTitulo';
import type { ErroresCampo, SocioFormRaw } from '@/lib/validation';
import { useSocios } from '@/providers/SociosProvider';
import type { Socio, SocioInput } from '@/types/socio';

function Edicion({ socio }: { socio: Socio }) {
  useTitulo('Editar socio');
  const router = useRouter();
  const { upsert, recargar } = useSocios();
  const { mostrar } = useToast();
  const [enviando, setEnviando] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresCampo | undefined>();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState(false);
  const [version, setVersion] = useState(0);

  const inicial: SocioFormRaw = useMemo(
    () => ({
      nombreCompleto: socio.nombreCompleto,
      rut: formatearRut(socio.rut),
      numeroSocio: socio.numeroSocio,
      paginaLibro: String(socio.paginaLibro),
      fechaIngreso: aFechaInput(socio.fechaIngreso),
      lugarVotacion: socio.lugarVotacion ?? '',
      observacion: socio.observacion ?? '',
    }),
    [socio],
  );

  async function enviar(datos: SocioInput) {
    setEnviando(true);
    setErrorGeneral(null);
    setErroresServidor(undefined);
    try {
      const nuevo = await actualizarSocio(socio.id, datos, socio.updatedAt);
      upsert(nuevo);
      mostrar('Cambios guardados.');
      router.push(`/socios/${socio.id}`);
    } catch (e) {
      const err = traducirErrorFirebase(e);
      if (err.codigo === 'CONFLICTO') setConflicto(true);
      else if (err.errores) setErroresServidor(err.errores);
      else setErrorGeneral(`No se pudo guardar. ${mensajeUsuario(err)}`);
      setEnviando(false);
    }
  }

  async function recargarDatos() {
    await recargar();
    setConflicto(false);
    setVersion((v) => v + 1); // remonta el formulario con los datos nuevos
  }

  return (
    <div className="space-y-5">
      <Link
        href={`/socios/${socio.id}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={20} aria-hidden="true" />
        Volver a la ficha
      </Link>
      <div>
        <h1 className="font-serif text-2xl font-semibold">Editar socio</h1>
        <p className="mt-1 text-muted">{socio.nombreCompleto}</p>
      </div>
      <SocioForm
        key={`${socio.id}-${version}`}
        inicial={inicial}
        textoGuardar="Guardar cambios"
        textoGuardando="Guardando…"
        hrefCancelar={`/socios/${socio.id}`}
        exigirCambios
        rutOriginal={socio.rut}
        enviando={enviando}
        erroresServidor={erroresServidor}
        errorGeneral={errorGeneral}
        conflicto={conflicto}
        onEnviar={(d) => void enviar(d)}
        onRecargar={() => void recargarDatos()}
        onSalir={(href) => router.push(href)}
        pie={
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Estado</p>
            <EstadoBadge estado={socio.estado} />
            <p className="text-caption text-muted">Para cambiar el estado usa Retirar o Reactivar en la ficha.</p>
          </div>
        }
      />
    </div>
  );
}

export default function EditarPage() {
  return <SocioCargado>{(socio) => <Edicion socio={socio} />}</SocioCargado>;
}
