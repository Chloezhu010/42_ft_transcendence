import { Link } from 'react-router-dom';
import MarketingFooter from '@/pages/landing/MarketingFooter';
import {
  legalDocuments,
  legalTermsIssuesUrl,
  type LegalDocumentKey,
} from './legal.content';

interface LegalPageProps {
  documentKey: LegalDocumentKey;
}

function LegalPage({ documentKey }: LegalPageProps): JSX.Element {
  const document = legalDocuments[documentKey];
  const showPublicTermsLink = documentKey === 'terms';

  return (
    <div className="min-h-screen bg-brand-light">
      <header className="py-4 px-6 bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b-4 border-brand-primary/10 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img src="/logo-highres.png" alt="Funova logo" className="h-12 w-auto object-contain" />
          </Link>
          <Link to="/" className="text-brand-primary hover:text-brand-primary/80 font-bold transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-brand-dark mb-2">{document.title}</h1>
        <p className="text-brand-muted mb-3">Last updated: {document.updatedAt}</p>
        <p className="text-lg text-brand-dark/85 leading-relaxed max-w-3xl">{document.description}</p>

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
          <Link className="text-brand-primary hover:text-brand-primary/80 transition-colors" to="/privacy">
            Privacy Policy
          </Link>
          <Link className="text-brand-primary hover:text-brand-primary/80 transition-colors" to="/terms">
            Terms of Service
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
                      <ul className="list-disc pl-6 space-y-2">
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
            <h2 className="text-2xl font-bold text-brand-primary mb-4">Maintainer Contact</h2>
            {showPublicTermsLink ? (
              <>
                <p>
                  Questions about the terms can be sent through the Funova repository issue tracker when they do not
                  include personal data.
                </p>
                <a
                  href={legalTermsIssuesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-6 py-2 bg-brand-primary text-white font-bold rounded-full hover:bg-brand-primary/90 transition-colors"
                >
                  Contact About Terms
                </a>
              </>
            ) : (
              <p className="rounded-2xl border-2 border-brand-primary/10 bg-white p-4 leading-relaxed">
                Privacy and deletion requests should not be filed in the public repository issue tracker. If you need
                help with a privacy-specific request, contact the deployment owner through a private channel outside the
                app and do not include personal details in public issue reports.
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
