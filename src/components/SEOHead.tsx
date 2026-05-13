import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  noindex?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structuredData?: Record<string, any>;
}

export default function SEOHead({
  title = 'Testably - QA Test Management Platform | Start for Free',
  description = 'Testably is an all-in-one test management platform for QA teams. Manage test cases, run tests, track milestones, and integrate with Jira — all in one place.',
  keywords = 'test management, QA platform, test cases, test runs, milestones, Jira integration',
  ogTitle,
  ogDescription,
  ogImage = 'https://testably.app/brand/og-dark-1200x630.png',
  ogUrl,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  twitterTitle,
  twitterDescription,
  twitterImage,
  canonical,
  noindex = false,
  structuredData,
}: SEOHeadProps) {
  useEffect(() => {
    // Set title
    document.title = title;

    // Helper function to set or update meta tag
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Set basic meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);

    // Set robots meta tag
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      const robotsElement = document.querySelector('meta[name="robots"]');
      if (robotsElement) {
        robotsElement.remove();
      }
    }

    // Set Open Graph tags
    setMetaTag('og:title', ogTitle || title, true);
    setMetaTag('og:description', ogDescription || description, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:type', ogType, true);
    
    if (ogUrl) {
      setMetaTag('og:url', ogUrl, true);
    } else {
      setMetaTag('og:url', window.location.href, true);
    }

    // Set Twitter Card tags
    setMetaTag('twitter:card', twitterCard);
    setMetaTag('twitter:title', twitterTitle || ogTitle || title);
    setMetaTag('twitter:description', twitterDescription || ogDescription || description);
    setMetaTag('twitter:image', twitterImage || ogImage);

    // Set canonical URL
    let canonicalElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    
    if (!canonicalElement) {
      canonicalElement = document.createElement('link');
      canonicalElement.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalElement);
    }
    
    canonicalElement.setAttribute('href', canonical || window.location.href);

    // Structured data (JSON-LD)
    const existingJsonLd = document.querySelector('script[type="application/ld+json"]#seo-structured-data');
    if (structuredData) {
      const script = existingJsonLd ?? document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('id', 'seo-structured-data');
      script.textContent = JSON.stringify(structuredData);
      if (!existingJsonLd) document.head.appendChild(script);
    } else if (existingJsonLd) {
      existingJsonLd.remove();
    }

    // Cleanup function
    return () => {
      // Reset to default title on unmount
      document.title = 'Testably - QA Test Management Platform | Start for Free';
    };
  }, [
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    canonical,
    noindex,
    structuredData,
  ]);

  return null;
}