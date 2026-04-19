interface SketchArrowProps {
  className?: string;
  color?: string;
}

const strokeStyle = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
  strokeWidth: '2.5',
};

export function SketchArrow({
  className = 'w-24 h-12',
  color,
}: SketchArrowProps): JSX.Element {
  return (
    <svg viewBox="0 0 100 50" className={className}>
      <path
        d="M10 25 Q 40 10, 80 25"
        stroke={color || 'currentColor'}
        style={strokeStyle}
        strokeDasharray="5,5"
      />
      <path d="M70 15 L 85 25 L 70 35" stroke={color || 'currentColor'} style={strokeStyle} />
    </svg>
  );
}
