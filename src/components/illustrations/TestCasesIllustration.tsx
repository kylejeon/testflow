export default function TestCasesIllustration({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none" className={className}>
      <rect x="22" y="18" width="62" height="78" rx="6" stroke="#6366f1" strokeWidth="2.5" fill="#eef2ff"/>
      <line x1="32" y1="34" x2="74" y2="34" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="32" y1="46" x2="68" y2="46" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="32" y1="58" x2="72" y2="58" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <line x1="32" y1="70" x2="62" y2="70" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M28 34 l3 3 l5 -6" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28 46 l3 3 l5 -6" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="82" cy="80" r="16" stroke="#6366f1" strokeWidth="3" fill="#fff"/>
      <line x1="94" y1="92" x2="104" y2="102" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  );
}
