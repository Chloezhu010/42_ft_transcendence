import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import MarketingFooter from '@/pages/landing/MarketingFooter';
import {
  getLegalDocuments,
  legalTermsIssuesUrl,
  type LegalDocumentKey,
} from './legal.content';

interface LegalPageProps {
  documentKey: LegalDocumentKey;
}

function LegalPage({ documentKey }: LegalPageProps): JSX.Element {
  const { t } = useTranslation();
  const document = getLegalDocuments(t)[documentKey];
  const showPublicTermsLink = documentKey === 'terms';

  return (
    <div className="min-h-screen bg-brand-light">
      <header className="py-4 px-6 bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b-4 border-brand-primary/10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <Link to="/" className="flex items-center">
            <img src="/logo-highres.png" alt={t('app.logoAlt')} className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/" className="text-brand-primary hover:text-brand-primary/80 font-bold transition-colors">
              {t('legal.backToHome')}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-brand-dark mb-2">{document.title}</h1>
        <p className="text-brand-muted mb-3">
          {t('legal.lastUpdatedLabel')} {document.updatedAt}
        </p>
        <p className="text-lg text-brand-dark/85 leading-relaxed max-w-3xl">{document.description}</p>

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
          <Link className="text-brand-primary hover:text-brand-primary/80 transition-colors" to="/privacy">
            {t('legal.switchLinks.privacy')}
          </Link>
          <Link className="text-brand-primary hover:text-brand-primary/80 transition-colors" to="/terms">
            {t('legal.switchLinks.terms')}
          </Link>
        </div>

        <div className="space-y-8 text-brand-dark mt-10">
          {document.sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} className="text-2xl font-bold text-brand-primary mb-4">
                {section.title}
              </h2>

              <div className="space-y-5">
                {section.blocks.map((block, index) => (
                  <div key={`${section.id}-${index}`} className="space-y-4">
                    {block.heading ? (
                      <h3 className="text-xl font-semibold text-brand-dark">
                        {block.heading}
                      </h3>
                    ) : null}

                    {block.paragraphs?.map((paragraph) => (
                      <p key={paragraph} className="leading-relaxed">
                        {paragraph}
                      </p>
                    ))}

                    {block.bullets ? (
                      <ul className="list-disc ps-6 space-y-2">
                        {block.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}

                    {block.cards ? (
                      <div className="mt-4 space-y-4">
                        {block.cards.map((card) => (
                          <div key={card.title} className="bg-white p-4 rounded-xl border-2 border-brand-primary/10">
                            <h4 className="font-bold text-brand-primary">{card.title}</h4>
                            <p className="text-sm text-brand-muted mt-1">{card.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {block.note ? (
                      <p className="mt-4 font-semibold bg-brand-accent/20 p-4 rounded-xl">
                        {block.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-2xl font-bold text-brand-primary mb-4">{t('legal.maintainerContact.title')}</h2>
            {showPublicTermsLink ? (
              <>
                <p>
                  {t('legal.maintainerContact.termsIntro')}
                </p>
                <a
                  href={legalTermsIssuesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-6 py-2 bg-brand-primary text-white font-bold rounded-full hover:bg-brand-primary/90 transition-colors"
                >
                  {t('legal.maintainerContact.termsButton')}
                </a>
              </>
            ) : (
              <p className="rounded-2xl border-2 border-brand-primary/10 bg-white p-4 leading-relaxed">
                {t('legal.maintainerContact.privacyNotice')}
              </p>
            )}
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

export default LegalPage;
