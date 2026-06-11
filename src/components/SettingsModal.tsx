import { motion, AnimatePresence } from "motion/react";
import { X, Sliders, Shield, History, Info, Sparkles, Database } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistory: () => void;
  hapticEnabled: boolean;
  onToggleHaptic: () => void;
  modelMode: string;
  onChangeModelMode: (mode: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onClearHistory,
  hapticEnabled,
  onToggleHaptic,
  modelMode,
  onChangeModelMode
}: SettingsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs"
          />

          {/* Modal content */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#222226] bg-[#141416] p-6 text-neutral-100 shadow-2xl"
              id="settings-modal-box"
            >
              {/* Top Accent background sphere */}
              <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 transition"
                id="settings-modal-close-btn"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title */}
              <div className="flex items-center gap-2 pb-5 border-b border-[#222226]">
                <Sliders className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-bold tracking-tight text-neutral-100">Settings & System Info</h3>
              </div>

              {/* Content Form */}
              <div className="mt-5 space-y-5">
                {/* 1. Model Engine Choice */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                    AI Brain Engine
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onChangeModelMode("gpt-4o")}
                      className={`rounded-xl border p-2.5 text-xs font-semibold text-left transition flex flex-col justify-between h-20 ${
                        modelMode === "gpt-4o"
                          ? "border-blue-500 bg-blue-500/10 text-neutral-100"
                          : "border-[#222226] bg-neutral-900/60 text-neutral-400 hover:border-[#333]"
                      }`}
                      id="engine-select-gpt-4o"
                    >
                      <Sparkles className="h-4 w-4 text-blue-400" />
                      <div>
                        <div className="font-bold">GPT-4o Plus</div>
                        <div className="text-[10px] text-neutral-500">Gemini Recommended</div>
                      </div>
                    </button>

                    <button
                      onClick={() => onChangeModelMode("o1-pro")}
                      className={`rounded-xl border p-2.5 text-xs font-semibold text-left transition flex flex-col justify-between h-20 ${
                        modelMode === "o1-pro"
                          ? "border-indigo-500 bg-indigo-500/10 text-neutral-100"
                          : "border-[#222226] bg-neutral-900/60 text-neutral-400 hover:border-[#333]"
                      }`}
                      id="engine-select-o1-pro"
                    >
                      <Database className="h-4 w-4 text-indigo-400" />
                      <div>
                        <div className="font-bold">o1-pro (Creative)</div>
                        <div className="text-[10px] text-neutral-500">Advanced analysis</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Audio and Haptic feedback switches */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                    iOS System Feel
                  </span>

                  <div className="flex items-center justify-between rounded-xl bg-neutral-900/40 p-3 border border-[#222226]">
                    <div>
                      <div className="text-sm font-semibold">Mock Haptic Vibrations</div>
                      <div className="text-xs text-neutral-500">Plays keypress clicks and haptic pulses</div>
                    </div>
                    <button
                      onClick={onToggleHaptic}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        hapticEnabled ? "bg-blue-600" : "bg-neutral-800"
                      }`}
                      id="haptic-toggle-btn"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          hapticEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 3. Privacy & security indicators */}
                <div className="rounded-xl bg-neutral-900/40 p-3 border border-[#222226] space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300 font-semibold">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span>Server-Side Secure Proxy</span>
                  </div>
                  <p className="text-neutral-500 text-[11px] leading-relaxed">
                    API calls leverage Gemini 3.5 Flash inside full-stack containers. Secrets and tokens are securely isolated from direct client inspectors.
                  </p>
                </div>

                {/* 4. Dangerous Actions */}
                <div className="pt-2 border-t border-[#222226] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-red-400">Clear chat history</span>
                      <p className="text-[11px] text-neutral-500">Removes all local stored threads permanently</p>
                    </div>
                    <button
                      onClick={() => {
                        onClearHistory();
                        onClose();
                      }}
                      className="rounded-xl bg-red-950/40 border border-red-900 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-900/30 transition"
                      id="clear-chat-history-btn"
                    >
                      <History className="h-3.5 w-3.5 inline mr-1.5" />
                      Reset App
                    </button>
                  </div>
                </div>

                {/* Info block footer */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-500">
                  <Info className="h-3.5 w-3.5" />
                  <span>Version 1.4.0 (PocketCodex Slate Theme Edition)</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
