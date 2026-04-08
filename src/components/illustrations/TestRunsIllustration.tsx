export default function TestRunsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none" className={className}>
      <circle cx="48" cy="60" r="34" fill="#eef2ff" stroke="#6366f1" strokeWidth="2.5"/>
      <path d="M40 46 L66 60 L40 74 Z" fill="#6366f1"/>
      <circle cx="86" cy="84" r="16" fill="#fff" stroke="#6366f1" strokeWidth="2.5"/>
      <path d="M78 84 l5 5 l10 -10" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="14" y1="100" x2="106" y2="100" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4"/>
    </svg>
  );
}
