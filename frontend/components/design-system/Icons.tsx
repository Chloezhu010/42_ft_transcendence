import React from 'react';

export interface IconProps {
  className?: string;
  color?: string;
}

const strokeStyle = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
  strokeWidth: '2.5',
};

export const Icons = {
  // Wizard Archetypes
  Explorer: ({ className = 'w-8 h-8', color }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} stroke={color || 'currentColor'} style={strokeStyle}>
      <circle cx="12" cy="12" r="10" />
      <path d="M16.2 7.8l-2 6.2-6.2 2 2-6.2z" />
    </svg>
  ),
  Inventor: ({ className = 'w-8 h-8', color }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} stroke={color || 'currentColor'} style={strokeStyle}>
      <path d="M9 3h6l3 7-3 6h-6l-3-6z" />
      <path d="M12 16v5" />
      <path d="M8 21h8" />
    </svg>
  ),
  Guardian: ({ className = 'w-8 h-8', color }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} stroke={color || 'currentColor'} style={strokeStyle}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Dreamer: ({ className = 'w-8 h-8', color }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} stroke={color || 'currentColor'} style={strokeStyle}>
      <path d="M12 2l3 6 6 1-5 4 2 6-6-4-6 4 2-6-5-4 6-1z" />
    </svg>
  ),
};
