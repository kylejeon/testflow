export default function RequirementsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none" className={className}>
      <rect x="18" y="20" width="48" height="62" rx="5" fill="#eef2ff" stroke="#6366f1" strokeWidth="2.5"/>
      <line x1="26" y1="34" x2="58" y2="34" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="26" y1="44" x2="54" y2="44" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="26" y1="54" x2="58" y2="54" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="26" y1="64" x2="48" y2="64" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <rect x="58" y="44" width="44" height="58" rx="5" fill="#fff" stroke="#6366f1" strokeWidth="2.5"/>
      <path d="M70 70 H92" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M86 64 L94 70 L86 76" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
