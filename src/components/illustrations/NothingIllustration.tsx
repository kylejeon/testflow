// f025 — NothingIllustration
// Concept: open box with three sparkles rising above it (Design Spec §4-6).
// Used as the generic fallback for 404 / permission-denied / under-construction
// empty states. Style matches the other six-illustration set (flat + 2.5px
// stroke, indigo primary).

interface Props {
  className?: string;
  title?: string;
}

export default function NothingIllustration({ className = '', title }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 150"
      width="240"
      height="150"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      {title && <title>{title}</title>}

      {/* Box body */}
      <path
        d="M70 80 L120 65 L170 80 L170 120 L120 135 L70 120 Z"
        fill="#e2e8f0"
        stroke="#6366f1"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Box inner shadow to imply emptiness */}
      <path
        d="M70 80 L120 95 L170 80"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="120" y1="95" x2="120" y2="135" stroke="#6366f1" strokeWidth="2" />

      {/* Box flap left/right (open lid hints) */}
      <path d="M70 80 L90 60 L140 45 L120 65 Z" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M170 80 L150 60 L100 45 L120 65 Z" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Sparkles rising above — large center, medium right, small left */}
      <path
        d="M120 25 L123 33 L131 36 L123 39 L120 47 L117 39 L109 36 L117 33 Z"
        fill="#6366f1"
      />
      <path
        d="M152 18 L154 23 L159 25 L154 27 L152 32 L150 27 L145 25 L150 23 Z"
        fill="#8b5cf6"
      />
      <path
        d="M90 32 L91 35 L94 36 L91 37 L90 40 L89 37 L86 36 L89 35 Z"
        fill="#a5b4fc"
      />
    </svg>
  );
}
