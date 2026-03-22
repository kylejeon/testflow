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
}

export default function SEOHead({
  title = 'Testably - QA Test Management Platform | Start for Free',
  description = 'Testably is an all-in-one test management platform for QA teams. Manage test cases, run tests, track milestones, and integrate with Jira — all in one place.',
  keywords = 'test management, QA platform, test cases, test runs, milestones, Jira integration',
  ogTitle,
  ogDescription,
  ogImage = 'https://readdy.ai/api/search-image?query=modern%20professional%20QA%20testing%20management%20platform%20dashboard%20interface%20with%20clean%20design%2C%20test%20case%20management%20system%2C%20quality%20assurance%20software%2C%20professional%20tech%20workspace%2C%20minimalist%20UI%20design%2C%20teal%20and%20navy%20blue%20color%20scheme%2C%20organized%20workflow%20visualization%2C%20digital%20testing%20tools&width=1200&height=630&seq=testably-og-default&orientation=landscape',
  ogUrl,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  twitterTitle,
  twitterDescription,
  twitterImage,
  canonical,
  noindex = false,
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
  ]);

  return null;
}