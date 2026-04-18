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

export const legalDocuments: Record<LegalDocumentKey, LegalDocumentContent> = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How Funova handles story inputs, generated books, and optional image data in the current project build.',
    updatedAt: 'April 18, 2026',
    sections: [
      {
        id: 'introduction',
        title: '1. Introduction',
        blocks: [
          {
            paragraphs: [
              'Funova is a student-built web application created for the 42 ft_transcendence project. It turns a child hero profile into an AI-generated comic book with a preview flow, editable panels, and a saved gallery.',
              'This Privacy Policy explains what information the current build handles, how that information is used, and what practical limits apply to this project deployment.',
            ],
          },
        ],
      },
      {
        id: 'information',
        title: '2. Information We Process',
        blocks: [
          {
            heading: '2.1 Story Input Data',
            paragraphs: ['When you create a story, Funova may process the information you enter into the creation flow, including:'],
            bullets: [
              'Character profile details such as the hero name, appearance traits, favorite color, archetype, and free-form dream prompt.',
              'Optional uploaded reference images when a user wants the generated character art to resemble a provided child photo.',
            ],
          },
          {
            heading: '2.2 Generated Content',
            bullets: [
              'Generated story titles, forewords, panel text, image prompts, and story metadata.',
              'Saved image URLs and cover data needed to reopen a generated book from the gallery.',
            ],
          },
          {
            heading: '2.3 Technical and Service Data',
            bullets: [
              'Request metadata such as timestamps, browser requests, and basic application logs needed to operate and debug the service.',
              'Deployment-level storage records kept by the database and containerized runtime used for this project.',
            ],
          },
        ],
      },
      {
        id: 'use',
        title: '3. How We Use Your Information',
        blocks: [
          {
            paragraphs: ['We use the processed information to:'],
            bullets: [
              'Generate the requested comic story, including the preview state, panel text, and related images.',
              'Store and display generated books back to the same deployment through the library and book views.',
              'Investigate failures, service instability, moderation concerns, and misuse during development, demo, or evaluation.',
              'Improve prompt quality, reliability, and output consistency inside the project codebase.',
            ],
          },
          {
            note: 'Funova is not intended to sell personal data, serve ads, or build unrelated marketing profiles. The current build uses story data to run the requested comic-generation flow.',
          },
        ],
      },
      {
        id: 'services',
        title: '4. Third-Party Services and Storage',
        blocks: [
          {
            paragraphs: ['Funova relies on supporting services to run the current deployment. Those services may process the minimum data needed for their role.'],
            cards: [
              {
                title: 'AI Generation Provider',
                description: 'Receives the story brief and generation inputs needed to produce story text and images for the requested comic.',
              },
              {
                title: 'Application Database',
                description: 'Stores story records, profile details, prompts, and saved image references so books can be reopened in the gallery.',
              },
              {
                title: 'Deployment Stack',
                description: 'Serves the web application and routes traffic through the project infrastructure used for the current environment.',
              },
            ],
          },
          {
            paragraphs: [
              'We do not sell personal data. Information is shared only to the extent required to generate stories, store the results, and operate the application.',
            ],
          },
        ],
      },
      {
        id: 'retention',
        title: '5. Data Storage and Retention',
        blocks: [
          {
            bullets: [
              'Story records remain in the project database until they are deleted through the app, removed by maintainers, or cleared during environment resets.',
              'Uploaded images are processed as part of the generation flow and may remain stored with the deployment while the related story remains available.',
              'Because this is a project deployment, review environments may be rebuilt, reseeded, or wiped without long-term archival guarantees.',
            ],
          },
          {
            paragraphs: [
              'If storage behavior changes as the project evolves, this policy should be updated to reflect the new retention model.',
            ],
          },
        ],
      },
      {
        id: 'children',
        title: '6. Children and Uploaded Content',
        blocks: [
          {
            paragraphs: ['Funova is designed for family-friendly story generation, but users remain responsible for what they submit.'],
            bullets: [
              'Only upload information or images you are authorized to share.',
              'Do not submit sensitive information that is not needed for the comic-generation flow.',
              'If a story references a real child, keep the provided details limited to what is necessary for the creative result.',
            ],
          },
        ],
      },
      {
        id: 'security',
        title: '7. Security',
        blocks: [
          {
            paragraphs: [
              'The project is designed to run behind HTTPS and uses a containerized deployment. Even so, no web application can promise perfect security.',
              'If you believe a privacy issue exists in the current build, do not post child names, story IDs, uploaded images, or other personal details in the public repository issue tracker.',
              'Privacy concerns that require personal context should be sent to the deployment owner through a private support channel outside the public repository.',
            ],
          },
        ],
      },
      {
        id: 'contact',
        title: '8. Contact and Requests',
        blocks: [
          {
            paragraphs: [
              'Privacy questions, deletion requests, and sensitive content reports should be handled through a private contact path controlled by the deployment owner.',
              'Funova does not provide a public in-app form for those requests because the repository issue tracker is public and should not receive personal details.',
            ],
          },
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    description: 'The rules for using Funova, including acceptable inputs, AI-output limits, and project-delivery expectations.',
    updatedAt: 'April 18, 2026',
    sections: [
      {
        id: 'acceptance',
        title: '1. Acceptance of Terms',
        blocks: [
          {
            paragraphs: [
              'By accessing Funova, you agree to use the site according to these Terms of Service and the related Privacy Policy.',
              'If you do not agree with these terms, do not use the current project deployment.',
            ],
          },
        ],
      },
      {
        id: 'service',
        title: '2. Description of Service',
        blocks: [
          {
            paragraphs: [
              'Funova is a project web application that generates comic-style stories from user-provided character and story inputs.',
              'The current build is intended for demos, evaluation, and normal creative use within the limits of the deployed environment. It does not promise production-grade continuity or commercial service guarantees.',
            ],
          },
        ],
      },
      {
        id: 'acceptable-use',
        title: '3. Acceptable Use',
        blocks: [
          {
            paragraphs: ['By using Funova, you agree not to submit or request content that is:'],
            bullets: [
              'Illegal, abusive, hateful, or exploitative.',
              'Infringing on another party\'s copyright, trademark, or privacy rights.',
              'Based on photos or personal information you are not authorized to share.',
              'Designed to break, overload, scrape, or interfere with the service.',
            ],
          },
        ],
      },
      {
        id: 'user-content',
        title: '4. Your Inputs and Generated Output',
        blocks: [
          {
            paragraphs: [
              'You keep responsibility for the prompts, profile details, and uploaded assets you provide to the app.',
              'You may use the generated stories for personal or project-demo purposes, but you should not claim ownership of the underlying models, deployment, or platform code.',
            ],
          },
        ],
      },
      {
        id: 'ai-limits',
        title: '5. AI-Generated Content Limits',
        blocks: [
          {
            paragraphs: ['Funova relies on generative AI, which means the output can vary and may require human review.'],
            bullets: [
              'Generated text and images may contain mistakes, inconsistencies, or artistic surprises.',
              'A preview or finished book may require human review before it is shared with others.',
              'Funova does not guarantee exact likeness, factual accuracy, or uninterrupted generation quality.',
            ],
          },
        ],
      },
      {
        id: 'availability',
        title: '6. Service Availability and Changes',
        blocks: [
          {
            paragraphs: [
              'Because this is a project deployment, features may change, environments may reset, and stories may be removed during maintenance or evaluation.',
              'The team may update the interface, prompts, storage rules, or legal text when the project evolves.',
            ],
          },
        ],
      },
      {
        id: 'liability',
        title: '7. Limitation of Liability',
        blocks: [
          {
            paragraphs: ['To the extent allowed by law:'],
            bullets: [
              'Funova is provided on an as-is basis for project use, without warranties of uninterrupted service or perfect output.',
              'The maintainers are not liable for indirect loss, subjective dissatisfaction with AI output, or temporary unavailability of the service.',
              'Users remain responsible for reviewing generated content before relying on it or sharing it more broadly.',
            ],
          },
        ],
      },
      {
        id: 'termination',
        title: '8. Suspension or Removal',
        blocks: [
          {
            paragraphs: [
              'The maintainers may remove stories, block abusive usage, or shut down a deployment if that is required for moderation, security, maintenance, or project delivery.',
            ],
          },
        ],
      },
      {
        id: 'contact',
        title: '9. Contact',
        blocks: [
          {
            paragraphs: [
              'Questions about these terms can be sent through the Funova repository issue tracker because those requests do not require personal details.',
            ],
          },
        ],
      },
    ],
  },
};
