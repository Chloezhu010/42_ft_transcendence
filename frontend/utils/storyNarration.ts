import type { Story } from '@/types';

export function getStoryReadAloudText(story: Story): string {
  const panelLines = story.panels
    .map((panel, index) => panel.text.trim() ? `Panel ${index + 1}. ${panel.text.trim()}` : '')
    .filter(Boolean);

  return [
    story.title.trim(),
    story.foreword.trim(),
    ...panelLines,
  ]
    .filter(Boolean)
    .join('\n\n');
}
