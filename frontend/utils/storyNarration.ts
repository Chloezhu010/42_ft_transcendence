import type { Story } from '@/types';

interface NarrationPanel {
  panel: Story['panels'][number];
  panelNumber: number;
}

function buildStoryReadAloudText(story: Story, panels: NarrationPanel[]): string {
  const panelLines = panels
    .map(({ panel, panelNumber }) => panel.text.trim() ? `Panel ${panelNumber}. ${panel.text.trim()}` : '')
    .filter(Boolean);

  return [
    story.title.trim(),
    story.foreword.trim(),
    ...panelLines,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function getStoryNarrationPanels(story: Story): NarrationPanel[] {
  return story.panels.map((panel, index) => ({
    panel,
    panelNumber: index + 1,
  }));
}

function getPreviewNarrationPanels(story: Story): NarrationPanel[] {
  const firstPanel = story.panels[0];
  const lastPanel = story.panels[story.panels.length - 1];

  if (!firstPanel) {
    return [];
  }

  if (!lastPanel || story.panels.length === 1) {
    return [{ panel: firstPanel, panelNumber: 1 }];
  }

  return [
    { panel: firstPanel, panelNumber: 1 },
    { panel: lastPanel, panelNumber: story.panels.length },
  ];
}

export function getStoryReadAloudText(story: Story): string {
  return buildStoryReadAloudText(story, getStoryNarrationPanels(story));
}

export function getPreviewReadAloudText(story: Story): string {
  return buildStoryReadAloudText(story, getPreviewNarrationPanels(story));
}
