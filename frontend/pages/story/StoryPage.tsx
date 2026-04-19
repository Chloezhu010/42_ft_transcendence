/**
 * Story page container.
 * Selects the active screen and feeds pure props into presentational components.
 */
import { Trans, useTranslation } from 'react-i18next';
import KidWizard from '@/components/KidWizard';
import MagicLoader from '@/components/MagicLoader';
import PreviewView from '@/components/PreviewView';
import StoryIntroStream from '@/components/StoryIntroStream';
import StoryboardView from '@/components/StoryboardView';
import { Heading, Text } from '@/components/design-system/Typography';
import { useStoryPage } from './useStoryPage';
import { StoryPageView } from './story.types';

function StoryPage(): JSX.Element | null {
  const { t } = useTranslation();
  const { actions, introStream, profile, story, view, wizard } = useStoryPage();

  if (view === StoryPageView.Onboarding) {
    return (
      <div className="animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="text-center mb-10">
          <Heading variant="h1" className="mb-4 text-brand-dark">
            <Trans
              i18nKey="mainPage.title"
              components={{
                accent: <span className="text-brand-primary underline decoration-brand-accent decoration-8" />
              }}
            />
          </Heading>
          <Text className="text-brand-muted italic">
            {t('mainPage.transformStories')}
          </Text>
        </div>

        <KidWizard
          step={wizard.step}
          profile={wizard.profile}
          onProfileChange={wizard.onProfileChange}
          onNextStep={wizard.onNextStep}
          onPreviousStep={wizard.onPreviousStep}
          onPhotoSelect={wizard.onPhotoSelect}
          onPhotoRemove={wizard.onPhotoRemove}
          onSubmit={wizard.onSubmit}
        />
      </div>
    );
  }

  if (view === StoryPageView.StreamingIntro) {
    return (
      <StoryIntroStream
        title={introStream.title}
        foreword={introStream.foreword}
        isStreaming={introStream.isStreaming}
        isPreparingPreview={introStream.isPreparingPreview}
      />
    );
  }

  if (view === StoryPageView.GeneratingStory) {
    return <MagicLoader />;
  }

  if (view === StoryPageView.Preview && story) {
    return (
      <PreviewView
        story={story}
        onEditPanelImage={actions.onEditPanelImage}
        onGenerate={actions.onGenerateFullStory}
        onStartOver={actions.onStartOver}
      />
    );
  }

  if (view === StoryPageView.Storyboard && story) {
    return (
      <StoryboardView
        story={story}
        profile={profile}
        onEditPanelImage={actions.onEditPanelImage}
      />
    );
  }

  return null;
}

export default StoryPage;
