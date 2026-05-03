import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'phrases-not-supported'
  | 'service-not-allowed';

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  item(index: number): {
    readonly transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    item(index: number): SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  readonly error: SpeechRecognitionErrorCode;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

export type SpeechRecognitionStatus = 'idle' | 'listening' | 'unsupported' | 'error';

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript?: (transcript: string) => void;
  errorMessages?: Partial<SpeechRecognitionErrorMessages>;
}

export interface UseSpeechRecognitionResult {
  transcript: string;
  interimTranscript: string;
  status: SpeechRecognitionStatus;
  error: string | null;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface SpeechRecognitionErrorMessages {
  unsupported: string;
  permissionDenied: string;
  noMicrophone: string;
  noSpeech: string;
  network: string;
  languageNotSupported: string;
  unexpected: string;
}

const defaultErrorMessages: SpeechRecognitionErrorMessages = {
  unsupported: 'Speech recognition is not supported in this browser.',
  permissionDenied: 'Microphone permission was denied.',
  noMicrophone: 'No microphone was detected.',
  noSpeech: 'No speech was detected.',
  network: 'Speech recognition is unavailable because of a network error.',
  languageNotSupported: 'This speech recognition language is not supported.',
  unexpected: 'Speech recognition stopped unexpectedly.',
};

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function getReadableSpeechError(
  error: SpeechRecognitionErrorCode,
  errorMessages: SpeechRecognitionErrorMessages,
): string {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return errorMessages.permissionDenied;
  }
  if (error === 'audio-capture') {
    return errorMessages.noMicrophone;
  }
  if (error === 'no-speech') {
    return errorMessages.noSpeech;
  }
  if (error === 'network') {
    return errorMessages.network;
  }
  if (error === 'language-not-supported') {
    return errorMessages.languageNotSupported;
  }

  return errorMessages.unexpected;
}

export function useSpeechRecognition({
  lang = 'en-US',
  continuous = false,
  interimResults = true,
  onTranscript,
  errorMessages: customErrorMessages,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionResult {
  const errorMessages = {
    ...defaultErrorMessages,
    ...customErrorMessages,
  };
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState<SpeechRecognitionStatus>(() => (
    getSpeechRecognitionConstructor() ? 'idle' : 'unsupported'
  ));
  const [error, setError] = useState<string | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setStatus('unsupported');
      setError(errorMessages.unsupported);
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results.item(index);
        const alternative = result.item(0);

        if (result.isFinal) {
          finalText += alternative.transcript;
        } else {
          interimText += alternative.transcript;
        }
      }

      if (finalText.trim()) {
        const nextTranscript = finalText.trim();
        setTranscript((currentTranscript) => (
          currentTranscript ? `${currentTranscript} ${nextTranscript}` : nextTranscript
        ));
        onTranscript?.(nextTranscript);
      }

      setInterimTranscript(interimText.trim());
    };

    recognition.onerror = (event) => {
      setStatus('error');
      setError(getReadableSpeechError(event.error, errorMessages));
    };

    recognition.onend = () => {
      setStatus((currentStatus) => (currentStatus === 'error' ? 'error' : 'idle'));
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setError(null);
    setInterimTranscript('');
    setStatus('listening');
    recognition.start();
  }, [
    continuous,
    errorMessages.languageNotSupported,
    errorMessages.network,
    errorMessages.noMicrophone,
    errorMessages.noSpeech,
    errorMessages.permissionDenied,
    errorMessages.unexpected,
    errorMessages.unsupported,
    interimResults,
    lang,
    onTranscript,
  ]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    status,
    error,
    isListening: status === 'listening',
    isSupported: status !== 'unsupported',
    startListening,
    stopListening,
    resetTranscript,
  };
}
