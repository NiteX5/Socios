'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FORM_VACIO, SocioForm } from '@/components/SocioForm';
import { EstadoBadge } from '@/components/ui/EstadoBadge';
import { useToast } from '@/components/ui/Toast';
import { SocioError, mensajeUsuario, traducirErrorFirebase } from '@/lib/errors';
import { crearSocio } from '@/lib/socios';
import { useTitulo } from '@/lib/useTitulo';
import type { ErroresCampo } from '@/lib/validation';
import { useSocios } from '@/providers/SociosProvider';
import type { SocioInput } from '@/types/socio';

export default function NuevoSocioPage() {
  useTitulo('Registrar socio');
  const router = useRouter();
  const { upsert } = useSocios();
  const { mostrar } = useToast();
  const [enviando, setEnviando] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresCampo | undefined>();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  async function enviar(datos: SocioInput) {
    setEnviando(true);
    setErrorGeneral(null);
    setErroresServidor(undefined);
    try {
      const socio = await crearSocio(datos);
      upsert(socio);
      mostrar('Socio registrado correctamente.');
      router.push(`/socios/${socio.id}`);
    } catch (e) {
      const err: SocioError = traducirErrorFirebase(e);
      if (err.errores) setErroresServidor(err.errores);
      else setErrorGeneral(`No se pudo guardar el socio. ${mensajeUsuario(err)}`);
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/socios" className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-primary hover:underline">
        <ArrowLeft size={20} aria-hidden="true" />
        Volver al índice
      </Link>
      <div>
        <h1 className="font-serif text-2xl font-semibold">Registrar socio</h1>
        <p className="mt-1 text-muted">Los campos con * son obligatorios.</p>
      </div>
      <SocioForm
        inicial={FORM_VACIO}
        textoGuardar="Guardar socio"
        textoGuardando="Guardando…"
        hrefCancelar="/socios"
        enviando={enviando}
        erroresServidor={erroresServidor}
        errorGeneral={errorGeneral}
        onEnviar={(d) => void enviar(d)}
        onSalir={(href) => router.push(href)}
        pie={
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Estado</p>
            <div className="flex items-center gap-3">
              <EstadoBadge estado="ACTIVO" />
              <span className="text-caption text-muted">Fijo al crear.</span>
            </div>
          </div>
        }
      />
    </div>
  );
}
