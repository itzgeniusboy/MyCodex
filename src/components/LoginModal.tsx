import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Shield, Mail, User, Lock, ArrowUp } from "lucide-react";
import { UserProfile } from "../types";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSubmit: (profile: UserProfile) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSubmit }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const displayEmail = email.includes("@") ? email : `${email}@gmail.com`;
    const displayName = name || email.split("@")[0] || "User";

    onLoginSubmit({
      email: displayEmail,
      name: displayName,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`,
      isLoggedIn: true,
    });
    onClose();
  };

  const handleQuickLogin = (presetEmail: string, presetName: string) => {
    onLoginSubmit({
      email: presetEmail,
      name: presetName,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(presetName)}`,
      isLoggedIn: true,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
          />

          {/* Modal box */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#222226] bg-[#141416] p-6 text-neutral-100 shadow-2xl"
              id="login-modal-box"
            >
              {/* Starburst floating decor in background */}
              <div className="absolute top-0 right-0 h-40 w-40 gpt-gradient-glow pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 transition"
                id="login-modal-close-btn"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center mt-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-400 mb-3 border border-blue-500/20">
                  <Sparkles className="h-6 w-6 text-blue-400 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-neutral-100">
                  {isRegistering ? "Create your account" : "Welcome back"}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Unlock permanent chat saving in local sync, custom avatars, and multi-thread storage!
                </p>
              </div>

              {/* Quick Preset Login for Ease of Testing */}
              <div className="mb-5">
                <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-2 text-center">
                  Quick Login For Testing
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickLogin("itzraviking@gmail.com", "Ravi Kumar")}
                    className="flex items-center gap-1.5 justify-center rounded-lg border border-[#222226] bg-neutral-900/60 py-2 px-2.5 text-xs font-semibold hover:bg-neutral-850 hover:border-[#333] transition"
                    id="quick-login-itzraviking"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    Ravi Kumar
                  </button>
                  <button
                    onClick={() => handleQuickLogin("alpha.tester@ai.com", "Guest Pilot")}
                    className="flex items-center gap-1.5 justify-center rounded-lg border border-[#222226] bg-neutral-900/60 py-2 px-2.5 text-xs font-semibold hover:bg-neutral-850 hover:border-[#333] transition"
                    id="quick-login-guest"
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Guest Pilot
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-[#222226]" />
                <span className="mx-3 text-[10px] text-neutral-500 uppercase tracking-widest font-semibold">Or use form</span>
                <div className="flex-1 border-t border-[#222226]" />
              </div>

              {/* Main Login/Register Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-300 block">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl bg-neutral-900 p-3 pl-10 text-sm border border-[#222226] focus:border-blue-500 focus:outline-none transition"
                        required
                        id="login-name-input"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900 p-3 pl-10 text-sm border border-[#222226] focus:border-blue-500 focus:outline-none transition2"
                      required
                      id="login-email-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-300 block">Password (Optional)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-neutral-900 p-3 pl-10 text-sm border border-[#222226] focus:border-blue-500 focus:outline-none transition2"
                      id="login-password-input"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-200 transition"
                  id="login-submit-btn"
                >
                  Continue
                  <ArrowUp className="h-4 w-4 rotate-90" />
                </button>
              </form>

              {/* Action swap */}
              <div className="text-center mt-5">
                <button
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-xs text-blue-400 hover:underline hover:text-blue-300 transition"
                  id="toggle-auth-mode-btn"
                >
                  {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
              </div>

              {/* Account Security disclaimer */}
              <div className="flex items-center gap-1.5 justify-center mt-6 text-[10px] text-neutral-500">
                <Shield className="h-3 w-3" />
                <span>Standard local encrypted sandbox storage</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
