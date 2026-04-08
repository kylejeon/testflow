export default function TraceabilityIllustration({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none" className={className}>
      <rect x="16" y="16" width="88" height="88" rx="6" stroke="#6366f1" strokeWidth="2.5" fill="#eef2ff"/>
      <line x1="16" y1="46" x2="104" y2="46" stroke="#94a3b8" strokeWidth="1.5"/>
      <line x1="16" y1="74" x2="104" y2="74" stroke="#94a3b8" strokeWidth="1.5"/>
      <line x1="46" y1="16" x2="46" y2="104" stroke="#94a3b8" strokeWidth="1.5"/>
      <line x1="74" y1="16" x2="74" y2="104" stroke="#94a3b8" strokeWidth="1.5"/>
      <circle cx="31" cy="31" r="5" fill="#6366f1"/>
      <circle cx="60" cy="60" r="5" fill="#6366f1"/>
      <circle cx="89" cy="89" r="5" fill="#6366f1"/>
      <line x1="31" y1="31" x2="60" y2="60" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="60" y1="60" x2="89" y2="89" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
