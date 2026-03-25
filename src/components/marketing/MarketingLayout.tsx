import type { ReactNode } from 'react';
import SEOHead from '../SEOHead';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';
import MarketingCTA from './MarketingCTA';

interface MarketingLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  keywords?: string;
  className?: string;
  showCTA?: boolean;
}

export default function MarketingLayout({
  children,
  title,
  description,
  keywords,
  className,
  showCTA = true,
}: MarketingLayoutProps) {
  return (
    <>
      <SEOHead title={title} description={description} keywords={keywords} />
      <div
        className={`min-h-screen bg-white ${className ?? ''}`}
        style={{ fontFamily: '"Inter", "Noto Sans KR", sans-serif' }}
      >
        <MarketingHeader />
        <main id="main-content">
          {children}
        </main>
        {showCTA && <MarketingCTA />}
        <MarketingFooter />
      </div>
    </>
  );
}
