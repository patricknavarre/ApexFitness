import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

type Shared = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

type AsButton = Shared &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    href?: undefined;
  };

type AsLink = Shared & {
  href: string;
};

const VARIANT: Record<Variant, string> = {
  primary:
    'od-cta bg-accent text-black hover:shadow-glow border border-transparent',
  secondary:
    'bg-bg2 border border-border text-tan hover:border-accent hover:text-text',
  danger:
    'od-cta bg-accent2 text-white border border-transparent hover:shadow-glow',
};

const BASE =
  'app-btn inline-flex min-h-[44px] items-center justify-center rounded-card px-4 py-2.5 font-sans text-sm font-bold uppercase tracking-wide transition-[transform,box-shadow,border-color,background-color,color] duration-150 disabled:opacity-50';

export function AppButton(props: AsButton | AsLink) {
  const variant = props.variant ?? 'primary';
  const className = `${BASE} ${VARIANT[variant]} ${props.className ?? ''}`.trim();

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={className}>
        {props.children}
      </Link>
    );
  }

  const buttonProps = props as AsButton;
  const {
    children,
    variant: _variant,
    className: _className,
    type = 'button',
    ...rest
  } = buttonProps;

  return (
    <button type={type} className={className} {...rest}>
      {children}
    </button>
  );
}
