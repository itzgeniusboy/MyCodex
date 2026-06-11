import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, X, Sparkles, Volume2, AudioLines, VolumeX } from "lucide-react";

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceQuery: (query: string) => Promise<string>;
}

export default function VoiceOverlay({ isOpen, onClose, onSendVoiceQuery }: VoiceOverlayProps) {
  const [status, setStatus] = useState<"connecting" | "listening" | "thinking" | "speaking" | "muted">("connecting");
  const [voiceReply, setVoiceReply] = useState("");
  const [micActiveIntensity, setMicActiveIntensity] = useState<number[]>([1, 1, 1, 1, 1]);
  const animationFrameRef = useRef<number | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Transition from connecting to listening after 1.5s
  useEffect(() => {
    if (!isOpen) return;
    setStatus("connecting");
    const timer = setTimeout(() => {
      setStatus("listening");
    }, 1500);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Handle simulating microphone wave intensity
  useEffect(() => {
    if (!isOpen) return;

    const updateWave = () => {
      if (status === "listening") {
        setMicActiveIntensity(
          Array.from({ length: 5 }, () => 0.2 + Math.random() * 0.9)
        );
      } else if (status === "speaking") {
        setMicActiveIntensity(
          Array.from({ length: 5 }, () => 0.4 + Math.random() * 0.7)
        );
      } else if (status === "thinking") {
        setMicActiveIntensity(
          Array.from({ length: 5 }, () => 0.15 + Math.random() * 0.15)
        );
      } else {
        setMicActiveIntensity([0.15, 0.15, 0.15, 0.15, 0.15]);
      }
      animationFrameRef.current = requestAnimationFrame(updateWave);
    };

    animationFrameRef.current = requestAnimationFrame(updateWave);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen, status]);

  // Simulated AI response triggering standard web speech synthesis
  const handleQuerySample = async (speechText: string) => {
    if (status !== "listening") return;
    setStatus("thinking");
    setVoiceReply("Processing voice...");

    try {
      const result = await onSendVoiceQuery(speechText + " (Answer concisely in 1-2 short sentences)");
      setVoiceReply(result);
      setStatus("speaking");

      // Stop previous speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(result);
        
        // Find a cool clear voice if available
        const voices = window.speechSynthesis.getVoices();
        const targetVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural") || v.lang.startsWith("en"));
        if (targetVoice) utterance.voice = targetVoice;
        
        utterance.rate = 1.05;
        utterance.onend = () => {
          setStatus("listening");
        };
        utterance.onerror = () => {
          setStatus("listening");
        };
        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback if SpeechSynthesis is blocked in sandbox iframe
        setTimeout(() => {
          setStatus("listening");
        }, 4000);
      }
    } catch (err) {
      console.error(err);
      setStatus("listening");
    }
  };

  const toggleMute = () => {
    if (status === "muted") {
      setStatus("listening");
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setStatus("muted");
    }
  };

  const handleClose = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 200 }}
          className="fixed inset-0 z-[120] flex flex-col bg-[#08080a] text-neutral-100 p-6 md:p-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
              <span className="text-sm font-semibold tracking-wide uppercase text-neutral-400">
                Voice Mode Simulator
              </span>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full bg-neutral-900 border border-neutral-800 p-2 hover:bg-neutral-850 transition"
              id="voice-close-btn"
            >
              <X className="h-5 w-5 text-neutral-400 hover:text-neutral-200" />
            </button>
          </div>

          {/* Core Visualizer Wave Display */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {/* Pulsing Orb center backing */}
            <div className="relative mb-12 flex items-center justify-center">
              <div className="absolute inset-0 gpt-wave-glow pointer-events-none rounded-full h-48 w-48 scale-150 animate-pulse" />
              
              {/* Dynamic waveform bars representation */}
              <div className="flex items-center justify-center gap-4.5 h-36">
                {micActiveIntensity.map((intensity, i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: intensity }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={`w-3.5 rounded-full origin-center ${
                      status === "connecting"
                        ? "bg-neutral-700 h-10"
                        : status === "thinking"
                        ? "bg-blue-400/40 h-16"
                        : status === "speaking"
                        ? "bg-gradient-to-t from-blue-500 to-indigo-500 h-28"
                        : status === "muted"
                        ? "bg-red-500/30 h-6"
                        : "bg-neutral-100 h-24"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Status caption display */}
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 min-h-[36px] transition duration-300">
              {status === "connecting" && "Establishing sync..."}
              {status === "listening" && "Listening..."}
              {status === "thinking" && "ChatGPT is reading soundwaves..."}
              {status === "speaking" && "ChatGPT responding..."}
              {status === "muted" && "Microphone Muted"}
            </h2>

            {/* Subtitle / response helper */}
            <p className="text-sm text-neutral-400 max-w-sm mt-3 h-12 overflow-hidden px-4">
              {status === "listening" && "Click a preset query below to test voice transcription!"}
              {status === "speaking" && voiceReply}
              {status === "thinking" && "Crunching data model..."}
              {status === "connecting" && "Initializing secure full-stack WebSocket..."}
              {status === "muted" && "Tap microphone below to resume chat conversation."}
            </p>

            {/* Simulated Voice Transcripts options */}
            {status === "listening" && (
              <div className="mt-8 grid grid-cols-1 gap-2.5 max-w-md w-full px-4">
                <button
                  onClick={() => handleQuerySample("Hi ChatGPT! Suggest 3 fun summer outdoor activities.")}
                  className="w-full text-left rounded-xl border border-[#222226] bg-neutral-900/60 p-3 text-xs hover:bg-neutral-850 hover:border-neutral-700 transition flex items-center justify-between"
                  id="voice-sample-btn-1"
                >
                  <span>"Suggest some cool summer activities"</span>
                  <Mic className="h-3.5 w-3.5 text-neutral-500" />
                </button>
                <button
                  onClick={() => handleQuerySample("Explain black holes in one simple sentence please.")}
                  className="w-full text-left rounded-xl border border-[#222226] bg-neutral-900/60 p-3 text-xs hover:bg-neutral-850 hover:border-neutral-700 transition flex items-center justify-between"
                  id="voice-sample-btn-2"
                >
                  <span>"Explain black holes in one sentence"</span>
                  <Mic className="h-3.5 w-3.5 text-neutral-500" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom control panel */}
          <div className="flex items-center justify-center gap-6 pb-8">
            <button
              onClick={toggleMute}
              className={`rounded-full p-4 border transition ${
                status === "muted"
                  ? "bg-red-950/40 border-red-850 text-red-400 hover:bg-red-900/30"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200"
              }`}
              title={status === "muted" ? "Unmute" : "Mute Microphone"}
              id="voice-mute-btn"
            >
              {status === "muted" ? <VolumeX className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>

            <button
              onClick={handleClose}
              className="rounded-full bg-red-600 p-4 border border-red-500 text-white hover:bg-red-500 transition shadow-lg shadow-red-600/10"
              title="Leave Voice Call"
              id="voice-hangup-btn"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
