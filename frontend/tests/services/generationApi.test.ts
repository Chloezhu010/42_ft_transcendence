/**
 * Tests for generation API streaming behavior.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type GeneratedStoryScript,
  type KidProfileForGeneration,
  streamStoryScript,
} from '@api';

const PROFILE: KidProfileForGeneration = {
  name: 'Leo',
  gender: 'boy',
  skin_tone: 'light',
  hair_color: 'brown',
  eye_color: 'green',
  favorite_color: 'blue',
};

const SCRIPT: GeneratedStoryScript = {
  title: 'Moon Mission',
  foreword: 'A brave little hero explores the stars.',
  characterDescription: 'Leo with a shiny helmet.',
  coverImagePrompt: 'Leo leaps toward a glowing moon.',
  panels: [
    {
      id: '1',
      text: 'Leo waves to the moon.',
      imagePrompt: 'Leo on a hill under moonlight.',
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('streamStoryScript', () => {
  it('breaks a large intro delta into smaller progressive callbacks', async () => {
    vi.useFakeTimers();

    const payload = [
      JSON.stringify({ type: 'intro_delta', field: 'title', delta: 'ABCDEFGH' }),
      JSON.stringify({ type: 'script', script: SCRIPT }),
    ].join('\n') + '\n';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(payload, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } })
    );

    const chunks: string[] = [];
    const promise = streamStoryScript(PROFILE, {
      onIntroDelta: (_field, delta) => {
        chunks.push(delta);
      },
    });

    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(SCRIPT);
    expect(chunks.join('')).toBe('ABCDEFGH');
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 2)).toBe(true);
  });
});
