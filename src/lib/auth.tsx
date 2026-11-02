'use client';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAuthInstance, getDb } from './firebase';

export type EstadoAuth =
  | { estado: 'cargando' }
  | { estado: 'no-autenticado' }
  | { estado: 'error-conexion'; user: User }
  | { estado: 'sin-permiso'; user: User }
  | { estado: 'admin'; user: User };

let cerrandoSesion = false;
/** true mientras el usuario cierra sesion a proposito (para no mostrar "sesion terminada"). */
export function estaCerrandoSesion(): boolean {
  return cerrandoSesion;
}

export type CodigoLogin = 'CREDENCIALES' | 'DEMASIADOS_INTENTOS' | 'RED';

export class LoginError extends Error {
  readonly codigo: CodigoLogin;
  constructor(codigo: CodigoLogin) {
    super(codigo);
    this.name = 'LoginError';
    this.codigo = codigo;
  }
}

export function mensajeLogin(e: unknown): string {
  const codigo = e instanceof LoginError ? e.codigo : 'CREDENCIALES';
  if (codigo === 'DEMASIADOS_INTENTOS') return 'Demasiados intentos. Espera unos minutos e inténtalo otra vez.';
  if (codigo === 'RED') return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'Correo o contraseña incorrectos. Inténtalo de nuevo.';
}

interface AuthContextValue {
  auth: EstadoAuth;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  reintentar(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<EstadoAuth>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    const unsub = onAuthStateChanged(getAuthInstance(), (user) => {
      if (!user) {
        setAuth({ estado: 'no-autenticado' });
        return;
      }
      setAuth({ estado: 'cargando' });
      getDoc(doc(getDb(), 'admins', user.uid))
        .then((snap) => {
          if (vigente) setAuth(snap.exists() ? { estado: 'admin', user } : { estado: 'sin-permiso', user });
        })
        .catch((e: unknown) => {
          if (!vigente) return;
          const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
          setAuth(
            code === 'permission-denied' ? { estado: 'sin-permiso', user } : { estado: 'error-conexion', user },
          );
        });
    });
    return () => {
      vigente = false;
      unsub();
    };
  }, [intento]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(getAuthInstance(), email.trim(), password);
    } catch (e) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (code === 'auth/network-request-failed') throw new LoginError('RED');
      if (code === 'auth/too-many-requests') throw new LoginError('DEMASIADOS_INTENTOS');
      throw new LoginError('CREDENCIALES');
    }
  }, []);

  const logout = useCallback(async () => {
    cerrandoSesion = true;
    try {
      await signOut(getAuthInstance());
    } finally {
      // Recarga completa: descarta el estado en memoria (socios) y la cache del SDK de Firestore,
      // importante en equipos compartidos.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- recarga completa intencional
      window.location.assign('/login');
    }
  }, []);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  const value = useMemo(() => ({ auth, login, logout, reintentar }), [auth, login, logout, reintentar]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
