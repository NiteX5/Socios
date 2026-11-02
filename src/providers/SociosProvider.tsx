'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SocioError } from '@/lib/errors';
import { traducirErrorFirebase } from '@/lib/errors';
import type { FiltroSocios } from '@/lib/search';
import { listarSocios } from '@/lib/socios';
import type { Socio } from '@/types/socio';

export interface VistaIndice extends FiltroSocios {
  pagina: number;
}

interface SociosContextValue {
  socios: Socio[];
  cargando: boolean;
  error: SocioError | null;
  ultimaActualizacion: Date | null;
  recargar(): Promise<void>;
  upsert(s: Socio): void;
  /** Estado de busqueda/filtro/pagina del indice (vive en memoria, nunca en la URL). */
  vista: VistaIndice;
  setVista(v: VistaIndice): void;
}

const SociosContext = createContext<SociosContextValue | null>(null);

/** Cache en memoria de los socios. Se monta solo para administradores; al cerrar sesion se desmonta. */
export function SociosProvider({ children }: { children: ReactNode }) {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<SocioError | null>(null);
  const [ultima, setUltima] = useState<Date | null>(null);
  const [vista, setVista] = useState<VistaIndice>({
    texto: '',
    estado: 'TODOS',
    conObservaciones: false,
    pagina: 1,
  });
  const montado = useRef(true);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarSocios();
      if (!montado.current) return;
      setSocios(lista);
      setUltima(new Date());
    } catch (e) {
      if (montado.current) setError(traducirErrorFirebase(e));
    } finally {
      if (montado.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos externos
    void recargar();
    return () => {
      montado.current = false;
    };
  }, [recargar]);

  const upsert = useCallback((s: Socio) => {
    setSocios((lista) => {
      const i = lista.findIndex((x) => x.id === s.id);
      if (i === -1) return [...lista, s];
      const copia = lista.slice();
      copia[i] = s;
      return copia;
    });
  }, []);

  const value = useMemo(
    () => ({ socios, cargando, error, ultimaActualizacion: ultima, recargar, upsert, vista, setVista }),
    [socios, cargando, error, ultima, recargar, upsert, vista],
  );
  return <SociosContext.Provider value={value}>{children}</SociosContext.Provider>;
}

export function useSocios(): SociosContextValue {
  const ctx = useContext(SociosContext);
  if (!ctx) throw new Error('useSocios debe usarse dentro de SociosProvider');
  return ctx;
}
