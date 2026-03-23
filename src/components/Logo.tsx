interface LogoProps {
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * LogoMark — HTML div version for product app headers.
 * Uses bg-indigo-500 squircle + Pacifico "Testably" text.
 * Renders as inline HTML so layout/gap control is precise.
 */
export function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 bg-indigo-500 flex items-center justify-center flex-shrink-0"
        style={{ borderRadius: '22%' }}
      >
        <span
          className="text-white font-normal text-lg"
          style={{ fontFamily: 'Pacifico, cursive', transform: 'translateY(-1px) translateX(0.5px)', lineHeight: 1 }}
        >
          T
        </span>
      </div>
      <span
        className="font-normal text-gray-900 text-xl leading-none"
        style={{ fontFamily: 'Pacifico, cursive' }}
      >
        Testably
      </span>
    </div>
  );
}

/**
 * Testably logo — inline SVG so Pacifico font (loaded via Google Fonts) renders correctly.
 * Using <img src=".svg"> isolates the SVG from page fonts and causes fallback rendering.
 *
 * variant="light"  → dark wordmark, for white/light backgrounds
 * variant="dark"   → white wordmark, for dark/navy backgrounds
 */
export default function Logo({ variant = 'light', className = 'h-9' }: LogoProps) {
  const textColor = variant === 'dark' ? '#ffffff' : '#0a0a0a';

  return (
    <svg
      width="500"
      height="100"
      viewBox="0 0 500 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: 'auto' }}
      aria-label="Testably"
      role="img"
    >
      {/* Squircle icon */}
      <rect x="8" y="14" width="72" height="72" rx="16" fill="#6366F1" />
      <text
        x="45"
        y="62"
        textAnchor="middle"
        fontSize="42"
        fill="#ffffff"
        style={{ fontFamily: 'Pacifico, cursive' }}
      >
        T
      </text>
      {/* Wordmark */}
      <text
        x="100"
        y="70"
        fontSize="56"
        fill={textColor}
        style={{ fontFamily: 'Pacifico, cursive' }}
      >
        Testably
      </text>
    </svg>
  );
}
