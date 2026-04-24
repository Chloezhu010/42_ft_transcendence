import { useCallback, useEffect, useState } from 'react';

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

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => getSpeechSynthesis() !== null);

  const stop = useCallback(() => {
    const synthesis = getSpeechSynthesis();

    if (!synthesis) {
      return;
    }

    synthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

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

    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
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

    utterance.onerror = () => {
      setError('Text-to-speech playback failed.');
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    synthesis.speak(utterance);
  }, []);

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

    if (!synthesis || !synthesis.paused) {
      return;
    }

    synthesis.resume();
    setIsPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      getSpeechSynthesis()?.cancel();
    };
  }, []);

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
