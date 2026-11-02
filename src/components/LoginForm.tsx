'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Wordmark } from '@/components/ui/Wordmark';
import { mensajeLogin, useAuth } from '@/lib/auth';
import { useTitulo } from '@/lib/useTitulo';

export function LoginForm({ sesionTerminada }: { sesionTerminada: boolean }) {
  useTitulo('Ingresar');
  const { auth, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (auth.estado !== 'cargando' && auth.estado !== 'no-autenticado') router.replace('/socios');
  }, [auth.estado, router]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  function validarEmail(v: string): string | undefined {
    if (!v.trim()) return 'Ingresa tu correo electrónico.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Revisa el correo: falta el @ o el dominio.';
    return undefined;
  }
  function validarPass(v: string): string | undefined {
    return v ? undefined : 'Ingresa tu contraseña.';
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (enviando) return;
    const e = { email: validarEmail(email), password: validarPass(password) };
    const limpio: { email?: string; password?: string } = {};
    if (e.email) limpio.email = e.email;
    if (e.password) limpio.password = e.password;
    setErrores(limpio);
    setErrorGeneral(null);
    if (e.email) return emailRef.current?.focus();
    if (e.password) return passRef.current?.focus();
    setEnviando(true);
    try {
      await login(email, password);
      router.replace('/socios');
    } catch (err) {
      setErrorGeneral(mensajeLogin(err));
      setPassword('');
      setEnviando(false);
    }
  }

  const redirigiendo = auth.estado !== 'cargando' && auth.estado !== 'no-autenticado';

  return (
    <main
      id="contenido"
      className="mx-auto flex min-h-dvh w-full max-w-100 flex-col items-center px-4 pb-8 pt-[12vh] max-sm:pt-8"
    >
      <Wordmark grande />
      <p className="mb-6 mt-2 text-muted">Registro digital de socios</p>
      <div className="w-full rounded-md bg-bg p-0 sm:border sm:border-border sm:bg-surface sm:p-8">
        <h1 className="mb-4 font-serif text-2xl font-semibold">Ingresar</h1>
        {sesionTerminada && (
          <Alert variante="info" className="mb-4">
            Tu sesión terminó. Ingresa nuevamente para continuar.
          </Alert>
        )}
        <form onSubmit={enviar} noValidate className="space-y-4">
          <Field
            ref={emailRef}
            id="email"
            type="email"
            etiqueta="Correo electrónico"
            obligatorio
            autoComplete="username"
            placeholder="nombre@ejemplo.cl"
            value={email}
            error={errores.email}
            disabled={enviando || redirigiendo}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setErrores((x) => ({ ...x, email: email ? validarEmail(email) : x.email }))}
          />
          <Field
            ref={passRef}
            id="password"
            type={verPassword ? 'text' : 'password'}
            etiqueta="Contraseña"
            obligatorio
            autoComplete="current-password"
            value={password}
            error={errores.password}
            disabled={enviando || redirigiendo}
            onChange={(e) => setPassword(e.target.value)}
            derecha={
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verPassword}
                className="flex size-11 items-center justify-center rounded-md text-muted hover:text-ink"
              >
                {verPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            }
          />
          {errorGeneral && <Alert variante="error">{errorGeneral}</Alert>}
          <Button type="submit" className="w-full" cargando={enviando || redirigiendo}>
            {enviando || redirigiendo ? 'Ingresando…' : 'Ingresar'}
          </Button>
          <p className="text-caption text-muted">
            Si olvidaste tu contraseña, pide ayuda al administrador responsable.
          </p>
        </form>
      </div>
      <p className="mt-6 text-sm text-muted">Acceso solo para administradores autorizados.</p>
    </main>
  );
}
