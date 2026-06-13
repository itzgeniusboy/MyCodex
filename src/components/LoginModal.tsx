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
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 p-1.5 mb-4 shadow-xl overflow-hidden relative">
                  {/* Subtle amber background gradient shadow */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-[#FF5500]/5 to-transparent rounded-2xl pointer-events-none" />
                  
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full animate-pulse">
                    <defs>
                      <radialGradient id="centralGlowLogin" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FF7300" stopOpacity="1" />
                        <stop offset="50%" stopColor="#FF5500" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#FF5500" stopOpacity="0" />
                      </radialGradient>
                      <linearGradient id="traceGradLogin" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FF7300" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#FF5500" stopOpacity="0.3" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="28" fill="url(#centralGlowLogin)" opacity="0.45" />
                    <g stroke="url(#traceGradLogin)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
                      <path d="M 50 38 V 15" />
                      <path d="M 45 42 V 30 H 39 V 15" />
                      <path d="M 55 42 V 30 H 61 V 15" />
                      <path d="M 41 45 V 34 H 31 V 22" />
                      <path d="M 59 45 V 34 H 69 V 22" />
                      <path d="M 50 62 V 85" />
                      <path d="M 45 58 V 70 H 39 V 85" />
                      <path d="M 55 58 V 70 H 61 V 85" />
                      <path d="M 41 55 V 66 H 31 V 78" />
                      <path d="M 59 55 V 66 H 69 V 78" />
                      <path d="M 30 50 H 18" />
                      <path d="M 70 50 H 82" />
                    </g>
                    <g fill="#FF5500" opacity="0.85">
                      <circle cx="50" cy="15" r="2" />
                      <circle cx="39" cy="15" r="2" />
                      <circle cx="61" cy="15" r="2" />
                      <circle cx="31" cy="22" r="2" />
                      <circle cx="69" cy="22" r="2" />
                      <circle cx="50" cy="85" r="2" />
                      <circle cx="39" cy="85" r="2" />
                      <circle cx="61" cy="85" r="2" />
                      <circle cx="31" cy="78" r="2" />
                      <circle cx="69" cy="78" r="2" />
                      <circle cx="18" cy="50" r="2" />
                      <circle cx="82" cy="50" r="2" />
                    </g>
                    <path d="M 33 32 L 18 50 L 33 68" stroke="#FF5500" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                    <path d="M 33 32 L 18 50 L 33 68" stroke="#121215" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M 67 32 L 82 50 L 67 68" stroke="#FF5500" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                    <path d="M 67 32 L 82 50 L 67 68" stroke="#121215" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <circle cx="50" cy="50" r="11" fill="#141416" stroke="#FF5500" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="6" fill="#FF7300" />
                    <circle cx="50" cy="50" r="3" fill="#FFE5D9" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-neutral-100">
                  {isRegistering ? "Create your account" : "Welcome back"}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Unlock permanent chat saving in local sync, custom avatars, and multi-thread storage!
                </p>
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
