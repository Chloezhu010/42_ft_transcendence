import type { TFunction } from 'i18next';

export type LegalDocumentKey = 'privacy' | 'terms';

interface LegalCard {
  title: string;
  description: string;
}

interface LegalBlock {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
  cards?: LegalCard[];
}

interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

interface LegalDocumentContent {
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
}

const REPOSITORY_ISSUES_URL = 'https://github.com/Chloezhu010/42_ft_transcendence/issues';

export const legalTermsIssuesUrl = REPOSITORY_ISSUES_URL;

export function getLegalDocuments(t: TFunction): Record<LegalDocumentKey, LegalDocumentContent> {
  return {
    privacy: t('legal.documents.privacy', { returnObjects: true }) as LegalDocumentContent,
    terms: t('legal.documents.terms', { returnObjects: true }) as LegalDocumentContent,
  };
}
