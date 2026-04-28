import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useSpeechSynthesis } from '@/components/speech/useSpeechSynthesis';

type MockUtterance = SpeechSynthesisUtterance & {
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => unknown) | null;
};

class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  pitch = 1;
  rate = 1;
  volume = 1;
  onstart: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onpause: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onresume: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onerror: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => unknown) | null = null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

interface MockSpeechSynthesis extends SpeechSynthesis {
  cancel: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  speak: ReturnType<typeof vi.fn>;
  currentUtterance: MockUtterance | null;
}

const originalSpeechSynthesis = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');

function restoreSpeechSynthesis(): void {
  if (originalSpeechSynthesis) {
    Object.defineProperty(window, 'speechSynthesis', originalSpeechSynthesis);
    return;
  }

  delete (window as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
}

function installSpeechSynthesisMock(): MockSpeechSynthesis {
  const synthesis = {
    speaking: false,
    pending: false,
    paused: false,
    currentUtterance: null,
    cancel: vi.fn(() => {
      const currentUtterance = synthesis.currentUtterance;
      synthesis.speaking = false;
      synthesis.currentUtterance = null;
      currentUtterance?.onerror?.call(currentUtterance, {
        error: 'interrupted',
      } as SpeechSynthesisErrorEvent);
    }),
    pause: vi.fn(() => {
      synthesis.paused = true;
    }),
    resume: vi.fn(() => {
      synthesis.paused = false;
    }),
    speak: vi.fn((utterance: MockUtterance) => {
      synthesis.speaking = true;
      synthesis.currentUtterance = utterance;
      utterance.onstart?.call(utterance, {} as SpeechSynthesisEvent);
    }),
    getVoices: vi.fn(() => []),
    onvoiceschanged: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as MockSpeechSynthesis;

  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: synthesis,
  });
  vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

  return synthesis;
}

afterEach(() => {
  vi.unstubAllGlobals();
  restoreSpeechSynthesis();
});

describe('useSpeechSynthesis', () => {
  it('clears Chrome paused state before replaying after stop', () => {
    const synthesis = installSpeechSynthesisMock();
    const { result } = renderHook(() => useSpeechSynthesis());

    act(() => {
      result.current.speak('First reading.');
    });
    act(() => {
      result.current.pause();
    });

    synthesis.paused = true;

    act(() => {
      result.current.stop();
    });
    act(() => {
      result.current.speak('Replay reading.');
    });

    expect(synthesis.cancel).toHaveBeenCalledTimes(3);
    expect(synthesis.resume).toHaveBeenCalledTimes(3);
    expect(synthesis.speak).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.isPaused).toBe(false);
    expect(result.current.isSpeaking).toBe(true);
  });

  it('still calls resume when Chrome has already cleared its paused flag', () => {
    const synthesis = installSpeechSynthesisMock();
    const { result } = renderHook(() => useSpeechSynthesis());

    act(() => {
      result.current.speak('Paused reading.');
    });
    act(() => {
      result.current.pause();
    });

    synthesis.paused = false;

    act(() => {
      result.current.resume();
    });

    expect(synthesis.resume).toHaveBeenCalledTimes(2);
    expect(result.current.isPaused).toBe(false);
  });

  it('does not show playback failure when stop cancels active Chrome speech', () => {
    installSpeechSynthesisMock();
    const { result } = renderHook(() => useSpeechSynthesis());

    act(() => {
      result.current.speak('Reading that will be stopped.');
    });
    act(() => {
      result.current.stop();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isPaused).toBe(false);
    expect(result.current.isSpeaking).toBe(false);
  });
});
