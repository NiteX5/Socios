'use client';

import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconoVariante, type VarianteAlerta } from './Alert';

interface ToastItem {
  id: number;
  variante: VarianteAlerta;
  mensaje: string;
}

interface ToastApi {
  mostrar(mensaje: string, variante?: VarianteAlerta): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const estilos: Record<VarianteAlerta, string> = {
  error: 'border-error bg-error-bg',
  warn: 'border-warn bg-warn-bg',
  info: 'border-info bg-info-bg',
  success: 'border-activo bg-activo-bg',
};

function ToastView({ item, cerrar }: { item: ToastItem; cerrar: (id: number) => void }) {
  const pausado = useRef(false);

  useEffect(() => {
    if (item.variante === 'error') return;
    const t = setInterval(() => {
      if (!pausado.current) {
        clearInterval(t);
        cerrar(item.id);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [item, cerrar]);

  return (
    <div
      onMouseEnter={() => (pausado.current = true)}
      onMouseLeave={() => (pausado.current = false)}
      onFocus={() => (pausado.current = true)}
      onBlur={() => (pausado.current = false)}
      className={`animar-aparecer pointer-events-auto flex items-start gap-3 rounded-md border-l-4 px-4 py-3 text-ink shadow-dialog ${estilos[item.variante]}`}
    >
      <span className="mt-0.5 shrink-0">
        <IconoVariante variante={item.variante} />
      </span>
      <p className="min-w-0 flex-1 py-0.5">{item.mensaje}</p>
      <button
        type="button"
        onClick={() => cerrar(item.id)}
        aria-label="Cerrar aviso"
        className="-my-2 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const contador = useRef(0);

  const cerrar = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const mostrar = useCallback((mensaje: string, variante: VarianteAlerta = 'success') => {
    contador.current += 1;
    const id = contador.current;
    setItems((l) => [...l.slice(-2), { id, variante, mensaje }]);
  }, []);
  const api = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-6 sm:w-90"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} cerrar={cerrar} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
