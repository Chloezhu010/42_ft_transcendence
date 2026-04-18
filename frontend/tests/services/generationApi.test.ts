/**
 * Tests for generation API — streaming behavior and auth header wiring.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  editPanelImage,
  generatePanelImage,
  generateStoryScript,
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

/** Extract the Authorization header regardless of how it was passed to fetch. */
function getAuthHeader(init: RequestInit | undefined): string | undefined {
  const headers = init?.headers;
  if (!headers) return undefined;
  if (headers instanceof Headers) return headers.get('Authorization') ?? undefined;
  return (headers as Record<string, string>)['Authorization'];
}

/** Mock fetch with a JSON response body. */
function mockJsonFetch(body: unknown, status = 200): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

/** Mock fetch with an NDJSON stream body (one `script` event). */
function mockStreamFetch(): ReturnType<typeof vi.spyOn> {
  const payload = JSON.stringify({ type: 'script', script: SCRIPT }) + '\n';
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(payload, {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson' },
    }),
  );
}

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
      new Response(payload, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }),
    );

    const chunks: string[] = [];
    const promise = streamStoryScript('test-token', PROFILE, {
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

  it('sends Authorization header on the streaming request', async () => {
    const fetchSpy = mockStreamFetch();

    await streamStoryScript('my-token', PROFILE);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/generate\/story-script\/stream$/);
    expect(getAuthHeader(init)).toBe('Bearer my-token');
  });
});

describe('generateStoryScript', () => {
  it('sends Authorization header and returns the parsed script', async () => {
    const fetchSpy = mockJsonFetch(SCRIPT);

    const result = await generateStoryScript('my-token', PROFILE);

    expect(result).toEqual(SCRIPT);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/generate\/story-script$/);
    expect(getAuthHeader(init)).toBe('Bearer my-token');
  });

  it('throws with the backend detail message on error responses', async () => {
    mockJsonFetch({ detail: 'quota exceeded' }, 429);

    await expect(generateStoryScript('my-token', PROFILE)).rejects.toThrow('quota exceeded');
  });
});

describe('generatePanelImage', () => {
  it('sends Authorization header and returns a data URL', async () => {
    const fetchSpy = mockJsonFetch({ image_base64: 'aGVsbG8=' });

    const result = await generatePanelImage(
      'my-token',
      'A moonlit hill',
      'Leo wearing a helmet',
      'watercolor',
    );

    expect(result).toBe('data:image/png;base64,aGVsbG8=');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/generate\/panel-image$/);
    expect(getAuthHeader(init)).toBe('Bearer my-token');
  });

  it('throws with the backend detail message on error responses', async () => {
    mockJsonFetch({ detail: 'Unauthorized' }, 401);

    await expect(
      generatePanelImage('bad-token', 'prompt', 'cast'),
    ).rejects.toThrow('Unauthorized');
  });
});

describe('editPanelImage', () => {
  it('sends Authorization header and returns a data URL', async () => {
    const fetchSpy = mockJsonFetch({ image_base64: 'ZWRpdGVk' });

    const result = await editPanelImage(
      'my-token',
      'data:image/png;base64,b3JpZ2luYWw=',
      'make the moon bigger',
      'A moonlit hill',
      'Leo wearing a helmet',
      'watercolor',
    );

    expect(result).toBe('data:image/png;base64,ZWRpdGVk');
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/api\/generate\/edit-image$/);
    expect(getAuthHeader(init)).toBe('Bearer my-token');
  });

  it('throws with the backend detail message on error responses', async () => {
    mockJsonFetch({ detail: 'Unauthorized' }, 401);

    await expect(
      editPanelImage(
        'bad-token',
        'data:image/png;base64,b3JpZ2luYWw=',
        'edit',
        'original',
        'cast',
      ),
    ).rejects.toThrow('Unauthorized');
  });
});
