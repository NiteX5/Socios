import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import Link from 'next/link';

export type VarianteBoton = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-semibold transition-colors duration-[120ms] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

const variantes: Record<VarianteBoton, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-primary bg-surface text-primary hover:bg-primary-soft',
  ghost: 'text-primary hover:bg-primary-soft',
  danger: 'bg-error text-white hover:bg-error-hover dark:text-[#10161f]',
  'danger-outline': 'border border-error bg-surface text-error hover:bg-error-bg',
};

export function claseBoton(variante: VarianteBoton, extra = ''): string {
  return `${base} ${variantes[variante]} ${extra}`.trim();
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  cargando?: boolean;
  icono?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variante = 'primary',
  cargando = false,
  icono,
  children,
  className = '',
  disabled,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={claseBoton(variante, className)}
      {...rest}
    >
      {cargando ? <LoaderCircle size={20} aria-hidden="true" className="girar" /> : icono}
      {children}
    </button>
  );
}

/** Enlace con aspecto de boton. */
export function LinkButton({
  href,
  variante = 'secondary',
  icono,
  children,
  className = '',
}: {
  href: string;
  variante?: VarianteBoton;
  icono?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={claseBoton(variante, className)}>
      {icono}
      {children}
    </Link>
  );
}
