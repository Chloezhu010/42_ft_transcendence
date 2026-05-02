import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

type SketchyButtonVariant = 'primary' | 'outline';

interface SketchyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: SketchyButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<SketchyButtonVariant, string> = {
  primary: 'bg-brand-accent text-brand-dark border-brand-primary shadow-soft',
  outline: 'bg-white text-brand-primary border-brand-primary hover:bg-brand-light',
};

function getSketchyButtonClassName(
  variant: SketchyButtonVariant = 'primary',
  className = '',
): string {
  return `font-black text-xl px-8 py-4 border-4 transition-all hover:scale-105 active:scale-95 ${VARIANT_CLASSES[variant]} ${className}`;
}

function SketchyButton({
  variant = 'primary',
  children,
  className = '',
  style,
  ...props
}: SketchyButtonProps): JSX.Element {
  return (
    <button
      className={getSketchyButtonClassName(variant, className)}
      style={{ borderRadius: '32px', ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

interface SketchyCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  shadowColor?: string;
  disableHoverEffect?: boolean;
}

function SketchyCard({
  children,
  className = '',
  style,
  shadowColor = 'rgba(157, 107, 207, 0.2)',
  disableHoverEffect = false,
  ...props
}: SketchyCardProps): JSX.Element {
  const hoverClasses = disableHoverEffect ? '' : 'transition-all hover:-translate-y-2 hover:shadow-xl';

  return (
    <div
      className={`bg-brand-surface border-4 border-brand-secondary/30 ${hoverClasses} ${className}`}
      style={{
        borderRadius: '32px',
        boxShadow: `0 12px 32px ${shadowColor}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export { getSketchyButtonClassName, SketchyButton, SketchyCard };
