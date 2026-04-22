// f025 — MilestonesIllustration
// Concept: flag planted on a hill with a dashed path leading up and two sparkles.
// Style: flat + 2.5px stroke, indigo/violet/slate palette (see Design Spec §4-3).
// Placeholder scaffold — final artwork to be delivered by Desi; this keeps the
// API stable and provides a visually reasonable fallback in the meantime.

interface Props {
  className?: string;
  title?: string;
}

export default function MilestonesIllustration({ className = '', title }: Props) {
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

      {/* Hill base */}
      <path
        d="M20 120 L110 45 L200 120 Z"
        fill="#e2e8f0"
        stroke="#6366f1"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Dashed path climbing up the hill */}
      <path
        d="M40 118 Q80 95 110 70"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 5"
        fill="none"
      />

      {/* Flag pole */}
      <line
        x1="110"
        y1="45"
        x2="110"
        y2="15"
        stroke="#8b5cf6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Flag */}
      <path
        d="M110 15 L140 22 L128 30 L140 38 L110 38 Z"
        fill="#6366f1"
        stroke="#6366f1"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Sparkle 1 — upper right */}
      <path
        d="M178 30 L180 36 L186 38 L180 40 L178 46 L176 40 L170 38 L176 36 Z"
        fill="#818cf8"
      />

      {/* Sparkle 2 — mid right, smaller */}
      <path
        d="M200 70 L201 74 L205 75 L201 76 L200 80 L199 76 L195 75 L199 74 Z"
        fill="#a5b4fc"
      />

      {/* Ground line */}
      <line
        x1="10"
        y1="120"
        x2="230"
        y2="120"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
