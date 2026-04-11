import { apiFetch, API_BASE } from './apiClient';
import { imageSourceToPureBase64 } from './imageUtils';

export interface KidProfileForGeneration {
  name: string;
  gender: 'boy' | 'girl' | 'neutral';
  skin_tone: string;
  hair_color: string;
  eye_color: string;
  favorite_color: string;
  dream?: string;
  archetype?: string;
  art_style?: string;
  photo_base64?: string; // Pure base64, no data URL prefix
}

export interface GeneratedPanel {
  id: string;
  text: string;
  imagePrompt: string;
}

export interface GeneratedStoryScript {
  title: string;
  foreword: string;
  characterDescription: string;
  coverImagePrompt: string;
  panels: GeneratedPanel[];
}

/**
 * Generate a story script using Gemini AI.
 */
export async function generateStoryScript(
  profile: KidProfileForGeneration
): Promise<GeneratedStoryScript> {
  const response = await apiFetch(`${API_BASE}/generate/story-script`, {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail || `Failed to generate story: ${response.statusText}`);
  }

  return (await response.json()) as GeneratedStoryScript;
}

export type StoryIntroField = 'title' | 'foreword';

export interface StreamStoryScriptCallbacks {
  onIntroDelta?: (field: StoryIntroField, delta: string) => void;
  signal?: AbortSignal;
}

const INTRO_DELTA_CHARS_PER_TICK = 2;
const INTRO_DELTA_TICK_MS = 22;

const delay = (ms: number): Promise<void> => new Promise((resolve) => {
  globalThis.setTimeout(resolve, ms);
});

async function emitIntroDeltaSmoothly(
  field: StoryIntroField,
  delta: string,
  onIntroDelta?: (field: StoryIntroField, delta: string) => void
): Promise<void> {
  if (!onIntroDelta || delta.length === 0) {
    return;
  }

  const characters = Array.from(delta);
  for (let index = 0; index < characters.length; index += INTRO_DELTA_CHARS_PER_TICK) {
    const chunk = characters.slice(index, index + INTRO_DELTA_CHARS_PER_TICK).join('');
    onIntroDelta(field, chunk);
    if (index + INTRO_DELTA_CHARS_PER_TICK < characters.length) {
      await delay(INTRO_DELTA_TICK_MS);
    }
  }
}

// Events emitted by POST /api/generate/story-script/stream. Kept in sync with
// backend/routers/generation.py.
type StoryStreamEvent =
  | { type: 'intro_delta'; field: StoryIntroField; delta: string }
  | { type: 'script'; script: GeneratedStoryScript }
  | { type: 'error'; message: string };

/**
 * Stream a story script, surfacing title/foreword chunks as they arrive.
 *
 * Resolves with the fully parsed script once the backend has finished. If the
 * backend emits an `error` event, or the stream terminates without a `script`
 * event, the returned promise rejects.
 */
export async function streamStoryScript(
  profile: KidProfileForGeneration,
  callbacks: StreamStoryScriptCallbacks = {}
): Promise<GeneratedStoryScript> {
  const response = await apiFetch(`${API_BASE}/generate/story-script/stream`, {
    method: 'POST',
    body: JSON.stringify({ profile }),
    signal: callbacks.signal,
  });

  if (!response.ok || !response.body) {
    const error = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail || `Failed to stream story: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalScript: GeneratedStoryScript | null = null;

  const handleEvent = async (event: StoryStreamEvent): Promise<void> => {
    switch (event.type) {
      case 'intro_delta':
        await emitIntroDeltaSmoothly(event.field, event.delta, callbacks.onIntroDelta);
        return;
      case 'script':
        finalScript = event.script;
        return;
      case 'error':
        throw new Error(event.message);
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line.length > 0) {
            await handleEvent(JSON.parse(line) as StoryStreamEvent);
          }
          newlineIndex = buffer.indexOf('\n');
        }
      }
      if (done) {
        break;
      }
    }

    const trailing = buffer.trim();
    if (trailing.length > 0) {
      await handleEvent(JSON.parse(trailing) as StoryStreamEvent);
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalScript) {
    throw new Error('Story stream ended before a script was produced.');
  }

  return finalScript;
}

/**
 * Generate a comic panel image using Gemini AI.
 */
export async function generatePanelImage(
  prompt: string,
  castGuide: string,
  artStyle?: string
): Promise<string> {
  const response = await apiFetch(`${API_BASE}/generate/panel-image`, {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      cast_guide: castGuide,
      style: artStyle,
    }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail || `Failed to generate image: ${response.statusText}`);
  }

  const data = (await response.json()) as { image_base64: string };
  return `data:image/png;base64,${data.image_base64}`;
}

/**
 * Edit an existing comic panel image using Gemini AI.
 */
export async function editPanelImage(
  imageSource: string,
  editPrompt: string,
  originalPrompt: string,
  castGuide: string,
  style?: string
): Promise<string> {
  const pureBase64 = await imageSourceToPureBase64(imageSource);

  const response = await apiFetch(`${API_BASE}/generate/edit-image`, {
    method: 'POST',
    body: JSON.stringify({
      image_base64: pureBase64,
      original_prompt: originalPrompt,
      edit_prompt: editPrompt,
      cast_guide: castGuide,
      style,
    }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new Error(error.detail || `Failed to edit image: ${response.statusText}`);
  }

  const data = (await response.json()) as { image_base64: string };
  return `data:image/png;base64,${data.image_base64}`;
}
