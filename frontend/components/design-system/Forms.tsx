import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function SketchyInput({ className = '', ...props }: InputProps): JSX.Element {
  return (
    <input
      className={`w-full text-start text-2xl font-semibold text-brand-dark bg-brand-light/30 border-b-4 border-brand-accent focus:border-brand-primary focus:outline-none pb-2 placeholder-brand-muted/30 transition-colors ${className}`}
      {...props}
    />
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function SketchyTextarea({ className = '', ...props }: TextareaProps): JSX.Element {
  return (
    <textarea
      className={`w-full text-start text-xl font-medium text-brand-dark border-4 border-dashed border-brand-primary/20 p-6 rounded-3xl focus:border-brand-accent focus:outline-none resize-none bg-brand-light/30 transition-colors ${className}`}
      {...props}
    />
  );
}
