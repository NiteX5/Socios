'use client';

import { useEffect } from 'react';

/**
 * Titulo de pagina; nunca debe incluir RUT. Next restablece el titulo de `metadata`
 * tras la navegacion del lado cliente, por eso se vigila <head> y se vuelve a aplicar.
 */
export function useTitulo(titulo: string): void {
  useEffect(() => {
    const deseado = `${titulo} · SocioÍndice`;
    const aplicar = () => {
      if (document.title !== deseado) document.title = deseado;
    };
    aplicar();
    const obs = new MutationObserver(aplicar);
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [titulo]);
}
