import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeakOptions {
  lang?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
}

export interface UseSpeechSynthesisResult {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  error: string | null;
  speak: (text: string, options?: SpeakOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  return window.speechSynthesis;
}

function resetSpeechSynthesis(synthesis: SpeechSynthesis): void {
  synthesis.cancel();
  synthesis.resume();
}

function isExpectedCancellationError(event: SpeechSynthesisErrorEvent): boolean {
  return event.error === 'canceled' || event.error === 'interrupted';
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ignoredUtteranceErrorsRef = useRef<WeakSet<SpeechSynthesisUtterance>>(new WeakSet());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => getSpeechSynthesis() !== null);

  const resetCurrentSpeech = useCallback((synthesis: SpeechSynthesis) => {
    const currentUtterance = currentUtteranceRef.current;

    if (currentUtterance) {
      ignoredUtteranceErrorsRef.current.add(currentUtterance);
    }

    resetSpeechSynthesis(synthesis);
  }, []);

  const stop = useCallback(() => {
    const synthesis = getSpeechSynthesis();

    if (!synthesis) {
      return;
    }

    resetCurrentSpeech(synthesis);
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
    setError(null);
  }, [resetCurrentSpeech]);

  const speak = useCallback((text: string, options: SpeakOptions = {}) => {
    const synthesis = getSpeechSynthesis();
    const content = text.trim();

    if (!synthesis) {
      setError('Text-to-speech is not supported in this browser.');
      return;
    }

    if (!content) {
      setError('There is no story text to read aloud.');
      return;
    }

    resetCurrentSpeech(synthesis);

    const utterance = new SpeechSynthesisUtterance(content);
    currentUtteranceRef.current = utterance;
    utterance.lang = options.lang ?? 'en-US';
    utterance.pitch = options.pitch ?? 1;
    utterance.rate = options.rate ?? 1;
    utterance.volume = options.volume ?? 1;

    utterance.onstart = () => {
      setError(null);
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      if (ignoredUtteranceErrorsRef.current.has(utterance) || isExpectedCancellationError(event)) {
        return;
      }

      setError('Text-to-speech playback failed.');
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onend = () => {
      if (currentUtteranceRef.current === utterance) {
        currentUtteranceRef.current = null;
      }

      setIsSpeaking(false);
      setIsPaused(false);
    };

    synthesis.speak(utterance);
  }, [resetCurrentSpeech]);

  const pause = useCallback(() => {
    const synthesis = getSpeechSynthesis();

    if (!synthesis || !synthesis.speaking) {
      return;
    }

    synthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    const synthesis = getSpeechSynthesis();

    if (!synthesis) {
      return;
    }

    synthesis.resume();
    setIsPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      const synthesis = getSpeechSynthesis();

      if (synthesis) {
        resetCurrentSpeech(synthesis);
      }
    };
  }, [resetCurrentSpeech]);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    error,
    speak,
    pause,
    resume,
    stop,
  };
}
