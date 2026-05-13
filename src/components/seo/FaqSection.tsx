/**
 * FaqSection — Standard FAQ list + Schema.org FAQPage JSON-LD injection.
 *
 * JSON-LD is injected into <head> via useEffect (same pattern that lives
 * inline in src/pages/compare/page.tsx). One <script id="faq-structured-data">
 * tag is created on mount, refreshed when faqs change, and removed on unmount.
 */

import { useEffect } from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSectionProps {
  faqs: FaqItem[];
  heading?: string;
  /** Inject <script type="application/ld+json"> into <head>. Default true. */
  injectStructuredData?: boolean;
}

export default function FaqSection({
  faqs,
  heading = 'Frequently Asked Questions',
  injectStructuredData = true,
}: FaqSectionProps) {
  useEffect(() => {
    if (!injectStructuredData) return;
    if (!faqs || faqs.length === 0) return;

    const existing = document.getElementById('faq-structured-data');
    const script = existing ?? document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('id', 'faq-structured-data');
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
    if (!existing) document.head.appendChild(script);

    return () => {
      const el = document.getElementById('faq-structured-data');
      if (el) el.remove();
    };
  }, [faqs, injectStructuredData]);

  if (!faqs || faqs.length === 0) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{heading}</h2>
      <div className="space-y-6">
        {faqs.map((faq) => (
          <div key={faq.question} className="border-b border-gray-200 pb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">{faq.question}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
