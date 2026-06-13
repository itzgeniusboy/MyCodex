import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield, Mail, ArrowRight, ArrowLeft, Loader2, KeyRound, Sparkles } from "lucide-react";
import { UserProfile } from "../types";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSubmit: (value: UserProfile) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSubmit }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [otpArray, setOtpArray] = useState<string[]>(["", "", "", ""]);
  const [countdown, setCountdown] = useState<number>(120); // 2-minute limit
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Intercept open trigger to reset states
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setOtpArray(["", "", "", ""]);
      setErrorMessage(null);
      setSuccessMessage(null);
      setDebugOtp(null);
    }
  }, [isOpen]);

  // Handle countdown logic
  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please type a valid Gmail address.");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage(data.message || "We dispatched a secure OTP to your email.");
        if (data.debugOtp) {
          setDebugOtp(data.debugOtp);
        }
        setStep(2);
        setCountdown(120);
        // Focus first OTP field as soon as transition completes
        setTimeout(() => {
          otpRefs[0].current?.focus();
        }, 150);
      } else {
        setErrorMessage(data.error || "Failed to send verification code. Please try again.");
      }
    } catch (err) {
      setErrorMessage("Network error occurred while connecting to authentication core.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = otpArray.join("");
    if (otpCode.length < 4) {
      setErrorMessage("Please fill all 4 digits of the OTP code.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otpCode }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        // Trigger login payload
        onLoginSubmit(data.user);
        onClose();
      } else {
        setErrorMessage(data.error || "The 4-digit code is incorrect or expired.");
        // Highlight inputs by resetting inputs
        setOtpArray(["", "", "", ""]);
        otpRefs[0].current?.focus();
      }
    } catch (err) {
      setErrorMessage("A networking interrupt occurred while validating. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpInput = (index: number, val: string) => {
    // Only accept numeric inputs
    const cleanChar = val.replace(/[^0-9]/g, "").slice(-1);
    
    const newOtp = [...otpArray];
    newOtp[index] = cleanChar;
    setOtpArray(newOtp);

    // Auto-advance if a digit was added
    if (cleanChar && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpArray[index] && index > 0) {
        // Clear previous input and shift focus left
        const newOtp = [...otpArray];
        newOtp[index - 1] = "";
        setOtpArray(newOtp);
        otpRefs[index - 1].current?.focus();
      } else {
        const newOtp = [...otpArray];
        newOtp[index] = "";
        setOtpArray(newOtp);
      }
    }
  };

  // Paste OTP string parser helper
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().replace(/[^0-9]/g, "");
    if (pasteData.length > 0) {
      const targetString = pasteData.slice(0, 4).padEnd(4, "");
      const finalOtp = targetString.split("");
      setOtpArray(finalOtp);
      
      // Auto-focus next available slot or the final one
      const focusIndex = Math.min(pasteData.length - 1, 3);
      otpRefs[focusIndex].current?.focus();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop screen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md"
            id="otp-backdrop"
          />

          {/* Modal layout */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.1 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-[#0e0e11] p-6 text-neutral-100 shadow-2xl"
              id="otp-modal-container"
            >
              {/* Premium Golden Starburst floating glow in ambient corner */}
              <div className="absolute -top-12 -right-12 h-40 w-40 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 bg-orange-500/5 blur-[55px] rounded-full pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-2 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all"
                id="otp-close-button"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon Header */}
              <div className="flex flex-col items-center text-center mt-2 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900/90 border border-amber-500/20 shadow-lg mb-4 relative overflow-hidden group">
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                  <KeyRound className="h-5 w-5 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-white mb-1.5 flex items-center gap-1.5 justify-center">
                  PocketCodex Core Access <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                </h3>
                <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                  Provide your Gmail to verify credentials and access your synced multithread dashboards.
                </p>
              </div>

              {/* Error / Success Alerts */}
              <AnimatePresence mode="popLayout">
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-400 text-center font-medium"
                    id="otp-error-alert"
                  >
                    ⚠️ {errorMessage}
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs text-amber-400 text-center font-medium"
                    id="otp-success-alert"
                  >
                    🎉 {successMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inline Developer Assist Box */}
              {debugOtp && (
                <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-950/25 p-3 text-center">
                  <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-bold mb-1">Developer OTP Debug Bypass</p>
                  <span className="font-mono text-lg font-extrabold tracking-widest bg-cyan-950/50 text-cyan-300 px-3 py-1 rounded-md border border-cyan-500/30">
                    {debugOtp}
                  </span>
                </div>
              )}

              {/* Transitions Container */}
              <div className="relative overflow-hidden min-h-[160px]">
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    /* Step 1: Input Gmail address */
                    <motion.div
                      key="step-email-input"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <form onSubmit={handleSendOtp} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">Gmail Address</label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
                            <input
                              type="email"
                              placeholder="itzraviking@gmail.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full rounded-xl bg-neutral-900 p-3.5 pl-11 text-sm border border-neutral-800 text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all duration-300"
                              required
                              disabled={isSending}
                              id="otp-email-input"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSending}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 p-3.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/10 disabled:opacity-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          id="otp-send-btn"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-black" />
                              Generating Secret...
                            </>
                          ) : (
                            <>
                              ⚡ Send OTP Code
                              <ArrowRight className="h-4 w-4 text-black" />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  ) : (
                    /* Step 2: Verification 1x4 Grid */
                    <motion.div
                      key="step-otp-verify"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">Verification OTP Code</label>
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 transition"
                            >
                              <ArrowLeft className="h-3 w-3" /> Change Gmail
                            </button>
                          </div>

                          {/* 4-digit verification grid layout */}
                          <div className="flex items-center justify-center gap-3 py-2">
                            {otpArray.map((digit, idx) => (
                              <input
                                key={`otp-input-box-${idx}`}
                                ref={otpRefs[idx]}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpInput(idx, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                onPaste={idx === 0 ? handleOtpPaste : undefined}
                                className="w-12 h-14 text-center font-mono text-2xl font-extrabold rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all duration-300"
                                required
                                id={`otp-input-field-${idx}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Countdown state block */}
                        <div className="flex items-center justify-between text-xs text-neutral-400 font-medium px-1">
                          <span>Verified destination: <strong>{email}</strong></span>
                          <span>
                            {countdown > 0 ? (
                              `Code expires in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendOtp()}
                                className="text-amber-500 hover:underline hover:text-amber-400 transition"
                              >
                                Resend Core OTP
                              </button>
                            )}
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={isVerifying || otpArray.join("").length < 4}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-neutral-100 py-3.5 text-sm font-semibold text-black transition-all duration-300 disabled:opacity-50"
                          id="otp-verify-submit-btn"
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-black" />
                              Verifying Signature...
                            </>
                          ) : (
                            <>
                              Verify & Login Securely
                              <ArrowRight className="h-4 w-4 text-black" />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Safe storage verification disclaimer */}
              <div className="flex items-center gap-1.5 justify-center mt-6 pt-4 border-t border-neutral-900 text-[10px] text-neutral-500">
                <Shield className="h-3 w-3 text-amber-500/60" />
                <span>Encrypted secure credential checks in progress</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
