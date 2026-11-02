'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { formatearRut } from '@/lib/rut';
import { MAX_LUGAR, MAX_OBSERVACION, validarSocio, type CampoSocio, type ErroresCampo, type SocioFormRaw } from '@/lib/validation';
import type { SocioInput } from '@/types/socio';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Field, FieldArea } from './ui/Field';

export const FORM_VACIO: SocioFormRaw = {
  nombreCompleto: '',
  rut: '',
  numeroSocio: '',
  paginaLibro: '',
  fechaIngreso: '',
  lugarVotacion: '',
  observacion: '',
};

const ORDEN: CampoSocio[] = ['nombreCompleto', 'rut', 'numeroSocio', 'paginaLibro', 'fechaIngreso', 'lugarVotacion', 'observacion'];

const ETIQUETAS: Record<CampoSocio, string> = {
  nombreCompleto: 'Nombre completo',
  rut: 'RUT',
  numeroSocio: 'N° de socio',
  paginaLibro: 'N° de página del libro',
  fechaIngreso: 'Fecha de ingreso',
  lugarVotacion: 'Lugar de votación',
  observacion: 'Observación',
};

export function hoyISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface SocioFormProps {
  inicial: SocioFormRaw;
  textoGuardar: string;
  textoGuardando: string;
  hrefCancelar: string;
  /** RUT guardado (edicion). Si no se modifica, se acepta aunque este incompleto (datos migrados). */
  rutOriginal?: string;
  /** Edicion: el boton Guardar se deshabilita sin cambios. */
  exigirCambios?: boolean;
  /** Errores devueltos por el servidor (duplicados, etc.) tras el envio. */
  erroresServidor?: ErroresCampo;
  errorGeneral?: string | null;
  conflicto?: boolean;
  enviando: boolean;
  onEnviar(datos: SocioInput): void;
  onRecargar?(): void;
  onCambiar?(): void;
  onSalir(href: string): void;
  /** Contenido de solo lectura (p. ej. estado) mostrado antes de los botones. */
  pie?: ReactNode;
}

export function SocioForm({
  inicial,
  textoGuardar,
  textoGuardando,
  hrefCancelar,
  exigirCambios = false,
  rutOriginal,
  erroresServidor,
  errorGeneral,
  conflicto,
  enviando,
  onEnviar,
  onRecargar,
  onCambiar,
  onSalir,
  pie,
}: SocioFormProps) {
  const [valores, setValores] = useState<SocioFormRaw>(inicial);
  const [errores, setErrores] = useState<ErroresCampo>({});
  const [tocados, setTocados] = useState<Partial<Record<CampoSocio, boolean>>>({});
  const [confirmaSalir, setConfirmaSalir] = useState(false);
  const [confirmaRecarga, setConfirmaRecarga] = useState(false);
  const enfocar = (k: CampoSocio) => document.getElementById(`campo-${k}`)?.focus();
  const [resumen, setResumen] = useState(false);
  const hoy = useMemo(() => hoyISO(), []);
  const validar = (raw: SocioFormRaw) => validarSocio(raw, new Date(), rutOriginal === undefined ? {} : { rutOriginal });

  const cambiado = useMemo(() => ORDEN.some((k) => valores[k] !== inicial[k]), [valores, inicial]);

  // Los errores del servidor se muestran en el campo y el foco va al primero.
  useEffect(() => {
    if (!erroresServidor) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza errores externos
    setErrores((e) => ({ ...e, ...erroresServidor }));
    const primero = ORDEN.find((k) => erroresServidor[k]);
    if (primero) enfocar(primero);
  }, [erroresServidor]);

  useEffect(() => {
    if (!cambiado) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [cambiado]);

  function cambiar(campo: CampoSocio, valor: string) {
    const nuevos = { ...valores, [campo]: valor };
    setValores(nuevos);
    onCambiar?.();
    if (tocados[campo] || errores[campo]) {
      const r = validar(nuevos);
      setErrores((e) => {
        const copia = { ...e };
        const msg = r.ok ? undefined : r.errores[campo];
        if (msg) copia[campo] = msg;
        else delete copia[campo];
        return copia;
      });
    }
  }

  function alSalirDeCampo(campo: CampoSocio) {
    setTocados((t) => ({ ...t, [campo]: true }));
    let actual = valores[campo];
    if (campo === 'rut' && actual.trim()) {
      const f = formatearRut(actual);
      if (f !== actual) {
        actual = f;
        setValores((v) => ({ ...v, rut: f }));
      }
    }
    const r = validar({ ...valores, [campo]: actual });
    setErrores((e) => {
      const copia = { ...e };
      const msg = r.ok ? undefined : r.errores[campo];
      if (msg) copia[campo] = msg;
      else delete copia[campo];
      return copia;
    });
  }

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (enviando) return;
    const r = validar(valores);
    if (!r.ok) {
      setErrores(r.errores);
      setResumen(true);
      const primero = ORDEN.find((k) => r.errores[k]);
      if (primero) enfocar(primero);
      return;
    }
    setResumen(false);
    setErrores({});
    onEnviar(r.datos);
  }

  function cancelar() {
    if (cambiado) setConfirmaSalir(true);
    else onSalir(hrefCancelar);
  }

  const camposConError = ORDEN.filter((k) => errores[k]);
  const idDe = (k: CampoSocio) => `campo-${k}`;
  const guardarDeshabilitado = exigirCambios && !cambiado;

  return (
    <>
      <form onSubmit={enviar} noValidate className="max-w-180 space-y-5">
        {conflicto && (
          <Alert variante="warn">
            <p>Otra persona modificó este socio mientras lo editabas. Recarga los datos para ver los cambios más recientes.</p>
            {onRecargar && (
              <Button variante="secondary" className="mt-3" onClick={() => (cambiado ? setConfirmaRecarga(true) : onRecargar())}>
                Recargar datos
              </Button>
            )}
          </Alert>
        )}
        {errorGeneral && <Alert variante="error">{errorGeneral}</Alert>}
        {resumen && camposConError.length > 0 && (
          <div>
            <Alert variante="error" titulo="Revisa estos campos">
              <ul className="list-disc pl-5">
                {camposConError.map((k) => (
                  <li key={k}>
                    <a href={`#${idDe(k)}`} className="underline" onClick={(e) => { e.preventDefault(); enfocar(k); }}>
                      {ETIQUETAS[k]}
                    </a>
                    : {errores[k]}
                  </li>
                ))}
              </ul>
            </Alert>
          </div>
        )}

        <Field
          id={idDe('nombreCompleto')}
          etiqueta={ETIQUETAS.nombreCompleto}
          obligatorio
          autoComplete="off"
          value={valores.nombreCompleto}
          error={errores.nombreCompleto}
          disabled={enviando}
          onChange={(e) => cambiar('nombreCompleto', e.target.value)}
          onBlur={() => alSalirDeCampo('nombreCompleto')}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id={idDe('rut')}
            etiqueta={ETIQUETAS.rut}
            obligatorio
            inputMode="text"
            autoComplete="off"
            placeholder="Ej.: 12.345.678-5"
            ayuda="Con o sin puntos y guion."
            value={valores.rut}
            error={errores.rut}
            disabled={enviando}
            onChange={(e) => cambiar('rut', e.target.value)}
            onBlur={() => alSalirDeCampo('rut')}
          />
          <Field
            id={idDe('numeroSocio')}
            etiqueta={ETIQUETAS.numeroSocio}
            obligatorio
            autoComplete="off"
            value={valores.numeroSocio}
            error={errores.numeroSocio}
            disabled={enviando}
            onChange={(e) => cambiar('numeroSocio', e.target.value)}
            onBlur={() => alSalirDeCampo('numeroSocio')}
          />
          <Field
            id={idDe('paginaLibro')}
            etiqueta={ETIQUETAS.paginaLibro}
            obligatorio
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={valores.paginaLibro}
            error={errores.paginaLibro}
            disabled={enviando}
            onChange={(e) => cambiar('paginaLibro', e.target.value)}
            onBlur={() => alSalirDeCampo('paginaLibro')}
          />
          <Field
            id={idDe('fechaIngreso')}
            etiqueta={ETIQUETAS.fechaIngreso}
            obligatorio
            type="date"
            min="1900-01-01"
            max={hoy}
            value={valores.fechaIngreso}
            error={errores.fechaIngreso}
            disabled={enviando}
            onChange={(e) => cambiar('fechaIngreso', e.target.value)}
            onBlur={() => alSalirDeCampo('fechaIngreso')}
          />
        </div>
        <Field
          id={idDe('lugarVotacion')}
          etiqueta={ETIQUETAS.lugarVotacion}
          opcional
          autoComplete="off"
          value={valores.lugarVotacion}
          error={errores.lugarVotacion}
          contador={`${valores.lugarVotacion.length} / ${MAX_LUGAR}`}
          disabled={enviando}
          onChange={(e) => cambiar('lugarVotacion', e.target.value)}
          onBlur={() => alSalirDeCampo('lugarVotacion')}
        />
        <FieldArea
          id={idDe('observacion')}
          etiqueta={ETIQUETAS.observacion}
          opcional
          value={valores.observacion}
          error={errores.observacion}
          contador={`${valores.observacion.length} / ${MAX_OBSERVACION}`}
          disabled={enviando}
          onChange={(e) => cambiar('observacion', e.target.value)}
          onBlur={() => alSalirDeCampo('observacion')}
        />

        {pie}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variante="secondary" onClick={cancelar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            cargando={enviando}
            disabled={guardarDeshabilitado}
            title={guardarDeshabilitado ? 'No hay cambios para guardar' : undefined}
          >
            {enviando ? textoGuardando : textoGuardar}
          </Button>
        </div>
        {guardarDeshabilitado && <p className="text-right text-caption text-muted">No hay cambios para guardar.</p>}
      </form>

      <ConfirmDialog
        abierto={confirmaSalir}
        titulo="Cambios sin guardar"
        descripcion={<p>Hay cambios sin guardar. ¿Salir de todos modos?</p>}
        textoConfirmar="Salir sin guardar"
        textoCancelar="Seguir editando"
        varianteConfirmar="danger"
        onCancelar={() => setConfirmaSalir(false)}
        onConfirmar={() => {
          setConfirmaSalir(false);
          onSalir(hrefCancelar);
        }}
      />
      <ConfirmDialog
        abierto={confirmaRecarga}
        titulo="Recargar datos"
        descripcion={<p>Se perderán tus cambios. ¿Recargar?</p>}
        textoConfirmar="Recargar"
        onCancelar={() => setConfirmaRecarga(false)}
        onConfirmar={() => {
          setConfirmaRecarga(false);
          onRecargar?.();
        }}
      />
    </>
  );
}
