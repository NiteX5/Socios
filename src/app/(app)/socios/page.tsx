'use client';

import { Check, CircleAlert, MessageSquareText, RefreshCw, SearchX, BookOpen, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBox } from '@/components/ui/SearchBox';
import { SegmentedFilter, type OpcionFiltro } from '@/components/ui/SegmentedFilter';
import { SkeletonLista } from '@/components/ui/Skeleton';
import { SocioCards } from '@/components/ui/SocioCard';
import { SociosTable } from '@/components/ui/SociosTable';
import { filtrarSocios, paginar, type FiltroSocios } from '@/lib/search';
import { useTitulo } from '@/lib/useTitulo';
import { useSocios } from '@/providers/SociosProvider';

const TAM_PAGINA = 25;

const OPCIONES: readonly OpcionFiltro<FiltroSocios['estado']>[] = [
  { valor: 'TODOS', etiqueta: 'Todos' },
  { valor: 'ACTIVO', etiqueta: 'Activos' },
  { valor: 'RETIRADO', etiqueta: 'Retirados' },
];

function contador(n: number, texto: string): string {
  const base = n === 0 ? 'Ningún socio' : n === 1 ? '1 socio' : `${n} socios`;
  return texto.trim() && n > 0 ? `${base} que coinciden con “${texto.trim()}”` : base;
}

function formatoHora(d: Date): string {
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(d);
}

export default function IndicePage() {
  useTitulo('Índice de socios');
  const { socios, cargando, error, recargar, ultimaActualizacion, vista, setVista } = useSocios();
  const [entrada, setEntrada] = useState(vista.texto);
  const buscadorRef = useRef<HTMLInputElement>(null);
  const resultadosRef = useRef<HTMLHeadingElement>(null);

  // Debounce 150 ms (el filtrado es local, no hay red).
  useEffect(() => {
    if (entrada === vista.texto) return;
    const t = setTimeout(() => setVista({ ...vista, texto: entrada, pagina: 1 }), 150);
    return () => clearTimeout(t);
  }, [entrada, vista, setVista]);

  // Foco inicial solo en escritorio (en movil abriria el teclado).
  useEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) buscadorRef.current?.focus();
  }, []);

  // Atajo "/" para ir al buscador.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      const editable =
        el instanceof HTMLElement &&
        (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
      if (editable) return;
      e.preventDefault();
      buscadorRef.current?.focus();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtrados = useMemo(
    () => filtrarSocios(socios, { texto: vista.texto, estado: vista.estado, conObservaciones: vista.conObservaciones }),
    [socios, vista.texto, vista.estado, vista.conObservaciones],
  );
  const pag = paginar(filtrados, vista.pagina, TAM_PAGINA);
  const paginaActual = Math.min(vista.pagina, pag.paginas);

  function cambiarPagina(p: number) {
    setVista({ ...vista, pagina: p });
    resultadosRef.current?.scrollIntoView({ block: 'start' });
    resultadosRef.current?.focus();
  }

  function limpiar() {
    setEntrada('');
    setVista({ texto: '', estado: 'TODOS', conObservaciones: false, pagina: 1 });
  }

  const hayFiltros = vista.texto.trim() !== '' || vista.estado !== 'TODOS' || vista.conObservaciones;
  const primeraCarga = cargando && socios.length === 0 && !error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[1.375rem] font-semibold leading-[1.875rem] sm:text-2xl sm:leading-8">
          Índice de socios
        </h1>
        <LinkButton href="/socios/nuevo" variante="primary" icono={<UserPlus size={20} aria-hidden="true" />}>
          Registrar socio
        </LinkButton>
      </div>

      <div className="space-y-4">
        <SearchBox valor={entrada} onCambio={setEntrada} inputRef={buscadorRef} />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-semibold sm:inline" id="lbl-estado">
            Estado:
          </span>
          <div className="w-full sm:w-auto">
            <SegmentedFilter
              etiqueta="Filtrar por estado"
              opciones={OPCIONES}
              valor={vista.estado}
              onCambio={(estado) => setVista({ ...vista, estado, pagina: 1 })}
            />
          </div>
          <button
            type="button"
            aria-pressed={vista.conObservaciones}
            onClick={() => setVista({ ...vista, conObservaciones: !vista.conObservaciones, pagina: 1 })}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 text-base font-semibold transition-colors duration-[120ms] ${
              vista.conObservaciones
                ? 'border-primary bg-primary text-on-primary'
                : 'border-border-input bg-surface text-ink hover:bg-primary-soft'
            }`}
          >
            {vista.conObservaciones ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <MessageSquareText size={16} aria-hidden="true" />
            )}
            Con observaciones
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 ref={resultadosRef} tabIndex={-1} aria-live="polite" className="text-base font-semibold outline-offset-4">
          {primeraCarga || error ? 'Socios' : contador(filtrados.length, vista.texto)}
        </h2>
        <div className="flex items-center gap-3">
          {ultimaActualizacion && (
            <span className="text-caption text-muted">Última actualización: {formatoHora(ultimaActualizacion)}</span>
          )}
          <Button
            variante="ghost"
            onClick={() => void recargar()}
            disabled={cargando}
            icono={<RefreshCw size={20} aria-hidden="true" className={cargando ? 'girar' : ''} />}
          >
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {primeraCarga ? (
        <SkeletonLista />
      ) : error ? (
        <EmptyState
          alerta
          icono={<CircleAlert size={40} />}
          titulo="No pudimos cargar los socios"
          texto={
            error.codigo === 'NO_AUTORIZADO'
              ? 'Tu cuenta no está autorizada para ver estos datos.'
              : 'Revisa tu conexión a internet e inténtalo de nuevo.'
          }
          accion={
            <Button variante="secondary" onClick={() => void recargar()} icono={<RefreshCw size={20} aria-hidden="true" />}>
              Reintentar
            </Button>
          }
        />
      ) : socios.length === 0 ? (
        <EmptyState
          icono={<BookOpen size={40} />}
          titulo="Aún no hay socios registrados"
          texto="Registra el primer socio para empezar a usar el índice."
          accion={
            <LinkButton href="/socios/nuevo" variante="primary" icono={<UserPlus size={20} aria-hidden="true" />}>
              Registrar socio
            </LinkButton>
          }
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icono={<SearchX size={40} />}
          titulo="No encontramos socios con esa búsqueda"
          texto='Revisa la ortografía o prueba con otro nombre, RUT o número. Si filtraste por estado, prueba con "Todos".'
          accion={
            hayFiltros ? (
              <Button variante="ghost" onClick={limpiar}>
                Limpiar búsqueda y filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <SociosTable socios={pag.items} busqueda={vista.texto} />
          <SocioCards socios={pag.items} busqueda={vista.texto} />
          <Pagination
            pagina={paginaActual}
            paginas={pag.paginas}
            total={pag.total}
            tam={TAM_PAGINA}
            onCambio={cambiarPagina}
          />
        </>
      )}
    </div>
  );
}
