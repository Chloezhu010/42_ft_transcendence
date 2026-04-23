import { createElement, type ReactNode } from 'react';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';

interface TypographyProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const STYLES: Record<Variant, string> = {
  h1: 'font-rounded font-semibold text-5xl md:text-7xl leading-tight tracking-normal',
  h2: 'font-rounded font-semibold text-4xl md:text-5xl tracking-normal',
  h3: 'font-rounded font-semibold text-3xl md:text-4xl tracking-wide',
  h4: 'font-rounded font-semibold text-2xl tracking-wide',
  body: 'font-sans font-medium text-lg md:text-xl leading-relaxed tracking-wide',
  caption: 'font-sans font-semibold text-sm tracking-widest uppercase',
  label: 'font-rounded font-semibold text-lg tracking-wide uppercase',
};

function getTypographyTag(variant: Variant): 'h1' | 'h2' | 'h3' | 'h4' | 'label' | 'p' {
  switch (variant) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
      return variant;
    case 'label':
      return 'label';
    default:
      return 'p';
  }
}

export function Typography({
  variant = 'body',
  children,
  className = '',
}: TypographyProps): JSX.Element {
  const componentTag = getTypographyTag(variant);
  const baseClasses = 'transition-colors duration-200 text-brand-dark';

  return createElement(
    componentTag,
    { className: `${STYLES[variant]} ${baseClasses} ${className}` },
    children,
  );
}

export function Heading(props: TypographyProps): JSX.Element {
  return <Typography variant="h2" {...props} />;
}

export function Text(props: TypographyProps): JSX.Element {
  return <Typography variant="body" {...props} />;
}

export function Label(props: TypographyProps): JSX.Element {
  return <Typography variant="label" {...props} />;
}
