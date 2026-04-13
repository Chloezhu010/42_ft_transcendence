import React from 'react';

interface SketchyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<SketchyButtonProps['variant']>, string> = {
  primary: 'bg-brand-accent text-brand-dark border-brand-primary shadow-soft',
  outline: 'bg-white text-brand-primary border-brand-primary hover:bg-brand-light',
};

export const SketchyButton: React.FC<SketchyButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <button
      className={`font-black text-xl px-8 py-4 border-4 transition-all hover:scale-105 active:scale-95 ${VARIANT_CLASSES[variant]} ${className}`}
      style={{ borderRadius: '32px', ...style }}
      {...props}
    >
      {children}
    </button>
  );
};
