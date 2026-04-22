// f025 — SessionsIllustration
// Concept: compass overlapping with a magnifying glass, surrounded by
// exploration "breadcrumb" dots. (Design Spec §4-4.)
// Style: flat + 2.5px stroke, indigo/violet with a slate-400 trail.
// Placeholder scaffold — final artwork to be delivered by Desi.

interface Props {
  className?: string;
  title?: string;
}

export default function SessionsIllustration({ className = '', title }: Props) {
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

      {/* Compass face */}
      <circle cx="92" cy="75" r="42" fill="#eef2ff" stroke="#6366f1" strokeWidth="2.5" />
      <circle cx="92" cy="75" r="32" fill="#ffffff" stroke="#6366f1" strokeWidth="1.5" />

      {/* Compass needle (north = violet, south = slate) */}
      <path d="M92 45 L98 75 L92 70 Z" fill="#8b5cf6" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M92 70 L86 75 L92 105 Z" fill="#94a3b8" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Compass center pin */}
      <circle cx="92" cy="75" r="3" fill="#6366f1" />

      {/* Cardinal tick marks */}
      <line x1="92" y1="37" x2="92" y2="43" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      <line x1="92" y1="107" x2="92" y2="113" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      <line x1="54" y1="75" x2="60" y2="75" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      <line x1="124" y1="75" x2="130" y2="75" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />

      {/* Magnifying glass overlay (bottom-right, overlapping compass) */}
      <circle cx="160" cy="90" r="22" fill="#ffffff" stroke="#6366f1" strokeWidth="2.5" />
      <line
        x1="176"
        y1="106"
        x2="194"
        y2="124"
        stroke="#6366f1"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Breadcrumb exploration dots */}
      <circle cx="30" cy="120" r="2.5" fill="#94a3b8" />
      <circle cx="48" cy="128" r="2" fill="#94a3b8" opacity="0.8" />
      <circle cx="195" cy="35" r="2.5" fill="#94a3b8" />
      <circle cx="210" cy="50" r="2" fill="#94a3b8" opacity="0.8" />
      <circle cx="220" cy="70" r="2.5" fill="#94a3b8" opacity="0.6" />
    </svg>
  );
}
