import { describe, expect, it } from 'vitest';

import { getPreviewReadAloudText, getStoryReadAloudText } from '@/utils';
import type { Story } from '@/types';

const STORY: Story = {
  title: 'Moon Mission',
  foreword: 'A brave little hero explores the stars.',
  characterDescription: 'Leo with a shiny helmet.',
  coverImagePrompt: 'Leo leaps toward a glowing moon.',
  visibility: 'private',
  panels: [
    {
      id: '1',
      text: 'Leo waves to the moon.',
      imagePrompt: 'Leo on a hill under moonlight.',
    },
    {
      id: '2',
      text: 'The moon waves back.',
      imagePrompt: 'A smiling moon above the hill.',
    },
  ],
};

describe('getStoryReadAloudText', () => {
  it('builds readable narration from title, foreword, and panels', () => {
    expect(getStoryReadAloudText(STORY)).toBe([
      'Moon Mission',
      'A brave little hero explores the stars.',
      'Panel 1. Leo waves to the moon.',
      'Panel 2. The moon waves back.',
    ].join('\n\n'));
  });

  it('skips empty narration segments', () => {
    const story: Story = {
      ...STORY,
      title: '  ',
      panels: [
        {
          id: '1',
          text: '  ',
          imagePrompt: 'Unused for read aloud.',
        },
      ],
    };

    expect(getStoryReadAloudText(story)).toBe('A brave little hero explores the stars.');
  });
});

describe('getPreviewReadAloudText', () => {
  it('only includes title, foreword, and the first and last panel text', () => {
    const story: Story = {
      ...STORY,
      panels: [
        {
          id: '1',
          text: 'Leo waves to the moon.',
          imagePrompt: 'Leo on a hill under moonlight.',
        },
        {
          id: '2',
          text: 'Leo builds a silver ladder.',
          imagePrompt: 'Leo building a ladder.',
        },
        {
          id: '3',
          text: 'The moon waves back.',
          imagePrompt: 'A smiling moon above the hill.',
        },
      ],
    };

    expect(getPreviewReadAloudText(story)).toBe([
      'Moon Mission',
      'A brave little hero explores the stars.',
      'Panel 1. Leo waves to the moon.',
      'Panel 3. The moon waves back.',
    ].join('\n\n'));
  });

  it('does not duplicate the only panel in a one-panel story', () => {
    const story: Story = {
      ...STORY,
      panels: [
        {
          id: '1',
          text: 'Leo waves to the moon.',
          imagePrompt: 'Leo on a hill under moonlight.',
        },
      ],
    };

    expect(getPreviewReadAloudText(story)).toBe([
      'Moon Mission',
      'A brave little hero explores the stars.',
      'Panel 1. Leo waves to the moon.',
    ].join('\n\n'));
  });
});
