"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";

interface VoiceRecorderProps {
  language: string; // e.g. "hi-IN"
  // Always the FULL current transcript for this listening session (final +
  // trailing interim text combined) — never a delta. The caller should
  // replace its stored text with this value, not append to it.
  onTranscript: (fullText: string) => void;
}

export default function VoiceRecorder({ language, onTranscript }: VoiceRecorderProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setPermissionError(null);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Rebuild the WHOLE transcript from index 0 every time. event.results
      // is cumulative for the entire listening session (finalized entries
      // don't disappear) — reading only from event.resultIndex and then
      // appending externally is what caused runaway duplication on some
      // browsers, where a "final" result re-fires as the full growing
      // sentence rather than just the newest word.
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interimText += transcript;
        }
      }
      onTranscript((finalText + interimText).trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setPermissionError(
          "Microphone permission was denied. Allow mic access in your browser, or type your query instead."
        );
      } else if (event.error === "no-speech") {
        // benign — user just paused, keep session alive
      } else {
        setPermissionError(`Voice recognition error: ${event.error}. Try typing instead.`);
      }
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if already started — ignore
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white/60 px-4 py-3 text-sm text-muted">
        <AlertCircle size={18} className="shrink-0 text-marigold-dark" />
        Voice input needs Chrome or Edge. Use the text field below instead.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Start voice search"}
        className="relative flex h-24 w-24 items-center justify-center rounded-full bg-indigo text-paper shadow-seal transition-transform hover:scale-[1.03] active:scale-95"
      >
        {listening && (
          <>
            <span className="absolute inset-0 rounded-full bg-marigold/60 animate-pulseRing" />
            <span
              className="absolute inset-0 rounded-full bg-marigold/60 animate-pulseRing"
              style={{ animationDelay: "0.6s" }}
            />
          </>
        )}
        {listening ? <Mic size={34} /> : <MicOff size={34} />}
      </button>
      <p className="text-sm text-muted">
        {listening ? "Listening… bolte jaayiye" : "Tap to speak your query"}
      </p>
      {permissionError && (
        <div className="flex max-w-sm items-start gap-2 rounded-lg border border-marigold/40 bg-marigold/10 px-3 py-2 text-xs text-indigo-dark">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {permissionError}
        </div>
      )}
    </div>
  );
}
