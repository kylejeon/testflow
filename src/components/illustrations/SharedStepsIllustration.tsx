export default function SharedStepsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none" className={className}>
      <rect x="16" y="22" width="30" height="30" rx="5" fill="#eef2ff" stroke="#6366f1" strokeWidth="2.5"/>
      <rect x="74" y="22" width="30" height="30" rx="5" fill="#eef2ff" stroke="#6366f1" strokeWidth="2.5"/>
      <rect x="45" y="68" width="30" height="30" rx="5" fill="#fff" stroke="#6366f1" strokeWidth="2.5"/>
      <path d="M46 52 L58 68" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M74 52 L62 68" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
      <path d="M55 80 a8 8 0 1 0 10 0" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M65 78 l2 4 l-4 1" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
