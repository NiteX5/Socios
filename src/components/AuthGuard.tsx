'use client';

import { LogOut, RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { estaCerrandoSesion, useAuth } from '@/lib/auth';
import { SociosProvider } from '@/providers/SociosProvider';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Wordmark } from './ui/Wordmark';

function PantallaCentrada({ children }: { children: ReactNode }) {
  return (
    <main id="contenido" className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Wordmark grande />
      {children}
    </main>
  );
}

function useSinConexion(): boolean {
  const [sinConexion, setSinConexion] = useState(false);
  useEffect(() => {
    const actualizar = () => setSinConexion(!navigator.onLine);
    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);
  return sinConexion;
}

function Cabecera({ email }: { email: string | null }) {
  const { logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Wordmark enlace />
        <div className="flex min-w-0 items-center gap-2">
          {email && <span className="hidden max-w-64 truncate text-sm text-muted sm:inline">{email}</span>}
          <Button variante="ghost" onClick={() => void logout()} icono={<LogOut size={20} aria-hidden="true" />} aria-label="Cerrar sesión">
            <span className="max-sm:sr-only">Cerrar sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Guard de UX: la proteccion real son las reglas de Firestore. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { auth, logout, reintentar } = useAuth();
  const router = useRouter();
  const sinConexion = useSinConexion();
  const tuvoSesion = useRef(false);

  useEffect(() => {
    if (auth.estado === 'admin') tuvoSesion.current = true;
    if (auth.estado === 'no-autenticado') {
      router.replace(tuvoSesion.current && !estaCerrandoSesion() ? '/login?sesion=terminada' : '/login');
    }
  }, [auth.estado, router]);

  if (auth.estado === 'cargando' || auth.estado === 'no-autenticado') {
    return (
      <PantallaCentrada>
        <p role="status" className="text-muted">
          Verificando tu sesión…
        </p>
      </PantallaCentrada>
    );
  }

  if (auth.estado === 'sin-permiso') {
    return (
      <PantallaCentrada>
        <EmptyState
          alerta
          icono={<ShieldAlert size={40} />}
          titulo="Tu cuenta no tiene acceso a SocioÍndice"
          texto={`Iniciaste sesión como ${auth.user.email ?? 'esta cuenta'}, pero no está autorizada como administradora. Pide a la persona responsable que habilite tu acceso.`}
          accion={
            <Button
              variante="secondary"
              autoFocus
              onClick={() => void logout()}
              icono={<LogOut size={20} aria-hidden="true" />}
            >
              Cerrar sesión
            </Button>
          }
        />
      </PantallaCentrada>
    );
  }

  if (auth.estado === 'error-conexion') {
    return (
      <PantallaCentrada>
        <EmptyState
          alerta
          icono={<TriangleAlert size={40} />}
          titulo="No pudimos verificar tu acceso"
          texto="Revisa tu conexión a internet e inténtalo de nuevo."
          accion={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variante="secondary" onClick={reintentar} icono={<RefreshCw size={20} aria-hidden="true" />}>
                Reintentar
              </Button>
              <Button variante="ghost" onClick={() => void logout()}>
                Cerrar sesión
              </Button>
            </div>
          }
        />
      </PantallaCentrada>
    );
  }

  return (
    <SociosProvider>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Saltar al contenido
      </a>
      <Cabecera email={auth.user.email} />
      {sinConexion && (
        <div className="sticky top-14 z-20">
          <Alert variante="warn" className="rounded-none">
            Sin conexión. Los cambios no se guardarán hasta que vuelva internet.
          </Alert>
        </div>
      )}
      <main id="contenido" className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </SociosProvider>
  );
}
