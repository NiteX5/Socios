'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Alert } from './Alert';
import { Button, type VarianteBoton } from './Button';

interface ConfirmDialogProps {
  abierto: boolean;
  titulo: string;
  descripcion: ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  varianteConfirmar?: VarianteBoton;
  iconoConfirmar?: ReactNode;
  cargando?: boolean;
  error?: string | null;
  alerta?: boolean;
  onConfirmar(): void;
  onCancelar(): void;
}

/** Dialogo modal sobre <dialog> nativo: trap de foco, Esc, foco vuelve al disparador. */
export function ConfirmDialog({
  abierto,
  titulo,
  descripcion,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  varianteConfirmar = 'primary',
  iconoConfirmar,
  cargando = false,
  error = null,
  alerta = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const uid = useId();
  const idTitulo = `${uid}-titulo`;
  const idDesc = `${uid}-desc`;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) {
      d.showModal();
      cancelarRef.current?.focus();
      document.documentElement.style.overflow = 'hidden';
    } else if (!abierto && d.open) {
      d.close();
    }
    if (!abierto) document.documentElement.style.overflow = '';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      role={alerta ? 'alertdialog' : 'dialog'}
      aria-labelledby={idTitulo}
      aria-describedby={idDesc}
      onCancel={(e) => {
        e.preventDefault();
        if (!cargando) onCancelar();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !cargando) onCancelar();
      }}
      className="animar-aparecer m-auto w-[min(92vw,440px)] rounded-lg bg-surface p-6 text-ink shadow-dialog backdrop:bg-overlay"
    >
      <h2 id={idTitulo} className="font-serif text-xl font-semibold">
        {titulo}
      </h2>
      <div id={idDesc} className="mt-3">
        {descripcion}
      </div>
      {error && <Alert variante="error" className="mt-4">{error}</Alert>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button ref={cancelarRef} variante="secondary" onClick={onCancelar} disabled={cargando}>
          {textoCancelar}
        </Button>
        <Button variante={varianteConfirmar} icono={iconoConfirmar} cargando={cargando} onClick={onConfirmar}>
          {textoConfirmar}
        </Button>
      </div>
    </dialog>
  );
}
