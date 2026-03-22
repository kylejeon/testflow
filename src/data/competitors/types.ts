export interface FeatureRow {
  feature: string;
  testably: boolean | string;
  competitor: boolean | string;
}

export interface PricingRow {
  plan: string;
  testably: { price: string; detail: string };
  competitor: { price: string; detail: string };
}

export interface KeyDifference {
  title: string;
  body: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface CompetitorData {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  savingsCallout: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  features: FeatureRow[];
  keyDifferences: KeyDifference[];
  pricingRows: PricingRow[];
  faqs: FAQ[];
  ctaText: string;
  ctaSubtext: string;
}
