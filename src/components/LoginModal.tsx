import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, ArrowRight, ArrowLeft, Loader2, Lock } from "lucide-react";
import { UserProfile } from "../types";
import { googleSignIn } from "../lib/firebase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSubmit: (value: UserProfile) => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSubmit }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");
  const [step, setStep] = useState<1 | 2>(1);
  const [otpArray, setOtpArray] = useState<string[]>(["", "", "", ""]);
  const [countdown, setCountdown] = useState<number>(120); // 2-minute limit
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoggingInWithPassword, setIsLoggingInWithPassword] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setPassword("");
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setSuccessMessage("Authentication verified successfully.");
        const rawName = result.user.email?.split("@")[0] || "User";
        const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        const userProfile = {
          email: result.user.email || "",
          name: result.user.displayName || capitalizedName,
          avatarUrl: result.user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(capitalizedName)}`,
          isLoggedIn: true,
          designatedApiKey: `session-verified-token-${btoa(result.user.email || "")}`
        };
        setTimeout(() => {
          onLoginSubmit(userProfile);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      const exactCode = err?.code ? ` [Code: ${err.code}]` : "";
      const exactMessage = err?.message || "Unknown error";
      setErrorMessage(`Google authentication failed: ${exactMessage}${exactCode}. Please check Google Console authorized domains if needed.`);
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid Gmail address.");
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage("Password must be at least 4 characters long.");
      return;
    }

    setIsLoggingInWithPassword(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setSuccessMessage(data.message || "Logged in successfully!");
        setTimeout(() => {
          onLoginSubmit(data.user);
          onClose();
        }, 1000);
      } else {
        setErrorMessage(data.error || "Password verification failed. Incorrect password.");
      }
    } catch (err) {
      setErrorMessage("Network error occurred while connecting to authentication core.");
    } finally {
      setIsLoggingInWithPassword(false);
    }
  };

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
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800 bg-[#0e0e11] p-6 text-neutral-100 shadow-2xl"
              id="otp-modal-container"
            >
              {/* Premium subtle glowing gradients */}
              <div className="absolute -top-12 -right-12 h-40 w-40 bg-neutral-800/20 blur-[50px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 bg-neutral-800/10 blur-[55px] rounded-full pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-2 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all"
                id="otp-close-button"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center mt-2 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-lg mb-4 relative overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-neutral-700 to-neutral-500" />
                  <Lock className="h-5 w-5 text-neutral-400" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-white mb-1.5 justify-center">
                  PocketCodex Access
                </h3>
                <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                  Sign in to verify credentials and access your workspace.
                </p>
              </div>

              {/* Errors / Messages */}
              <AnimatePresence mode="popLayout">
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs text-red-400 text-center font-medium"
                    id="otp-error-alert"
                  >
                    {errorMessage}
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4 rounded-xl border border-neutral-500/20 bg-neutral-950/20 p-3 text-xs text-neutral-400 text-center font-medium"
                    id="otp-success-alert"
                  >
                    {successMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prominent Sign In with Google Button */}
              <div className="mb-5">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSigningIn}
                  className="w-full flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-neutral-100 p-3 text-xs font-bold text-black border border-transparent transition-all duration-300 disabled:opacity-50 cursor-pointer"
                  id="google-signin-button"
                >
                  {isGoogleSigningIn ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>

              {/* Elegant Minimal Divider */}
              <div className="relative flex py-2 items-center mb-5">
                <div className="flex-grow border-t border-neutral-900"></div>
                <span className="flex-shrink mx-3 text-[9px] text-neutral-500 font-bold uppercase tracking-widest">or use credentials</span>
                <div className="flex-grow border-t border-neutral-900"></div>
              </div>

              {/* Login Method Tab Toggles */}
              <div className="flex gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-900 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod("otp");
                    setStep(1);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold rounded-lg tracking-wider uppercase transition-all duration-300 ${
                    loginMethod === "otp"
                      ? "bg-neutral-950 text-white border border-neutral-800"
                      : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                  }`}
                  id="tab-toggle-otp"
                >
                  Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod("password");
                    setStep(1);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold rounded-lg tracking-wider uppercase transition-all duration-300 ${
                    loginMethod === "password"
                      ? "bg-neutral-950 text-white border border-neutral-800"
                      : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                  }`}
                  id="tab-toggle-password"
                >
                  Password
                </button>
              </div>

              {/* Transitions Container */}
              <div className="relative overflow-hidden min-h-[145px]">
                <AnimatePresence mode="wait">
                  {loginMethod === "otp" ? (
                    step === 1 ? (
                      <motion.div
                        key="step-email-input"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3.5"
                      >
                        <form onSubmit={handleSendOtp} className="space-y-3.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-neutral-300 block">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                              <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-xl bg-neutral-900 py-3 pl-9 pr-3 text-xs border border-neutral-800 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-all duration-300"
                                required
                                disabled={isSending}
                                id="otp-email-input"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={isSending}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 py-3 text-xs font-bold text-black transition-all duration-300 disabled:opacity-50 cursor-pointer"
                            id="otp-send-btn"
                          >
                            {isSending ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                                Sending...
                              </>
                            ) : (
                              <>
                                Sign In
                                <ArrowRight className="h-3.5 w-3.5 text-black" />
                              </>
                            )}
                          </button>
                        </form>
                      </motion.div>
                    ) : (
                      /* Step 2: Verification 1x4 Grid */
                      <motion.div
                        key="step-otp-verify"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3.5"
                      >
                        <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-neutral-300 block">Verification Code</label>
                              <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition"
                              >
                                <ArrowLeft className="h-2.5 w-2.5" /> Change Email
                              </button>
                            </div>

                            <div className="flex items-center justify-center gap-2.5 py-1">
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
                                  className="w-10 h-12 text-center font-mono text-xl font-bold rounded-xl bg-neutral-900 border border-neutral-800 text-white focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none transition-all duration-300"
                                  required
                                  id={`otp-input-field-${idx}`}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-medium px-0.5">
                            <span>Sent to: {email}</span>
                            <span>
                              {countdown > 0 ? (
                                `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSendOtp()}
                                  className="text-neutral-300 hover:underline transition"
                                >
                                  Resend Code
                                </button>
                              )}
                            </span>
                          </div>

                          <button
                            type="submit"
                            disabled={isVerifying || otpArray.join("").length < 4}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 py-3 text-xs font-bold text-black transition-all duration-300 disabled:opacity-50 cursor-pointer"
                            id="otp-verify-submit-btn"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                Sign In
                                <ArrowRight className="h-3.5 w-3.5 text-black" />
                              </>
                            )}
                          </button>
                        </form>
                      </motion.div>
                    )
                  ) : (
                    /* Password Login Form */
                    <motion.div
                      key="step-password-login"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3.5"
                    >
                      <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-neutral-300 block">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                            <input
                              type="email"
                              placeholder="name@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full rounded-xl bg-neutral-900 py-3 pl-9 pr-3 text-xs border border-neutral-800 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-all duration-300"
                              required
                              disabled={isLoggingInWithPassword}
                              id="password-email-input"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-neutral-300 block">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full rounded-xl bg-neutral-900 py-3 pl-9 pr-3 text-xs border border-neutral-800 text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition-all duration-300"
                              required
                              disabled={isLoggingInWithPassword}
                              id="password-input"
                            />
                          </div>
                          <span className="text-[10px] text-neutral-500 block leading-tight">
                            First login? Choose any password; it registers automatically.
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoggingInWithPassword}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 py-3 text-xs font-bold text-black transition-all duration-300 disabled:opacity-50 cursor-pointer"
                          id="password-login-btn"
                        >
                          {isLoggingInWithPassword ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-black" />
                              Signing In...
                            </>
                          ) : (
                            <>
                              Sign In
                              <ArrowRight className="h-3.5 w-3.5 text-black" />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Flat enterprise disclaimer */}
              <div className="flex items-center gap-1.5 justify-center mt-5 pt-3.5 border-t border-neutral-900 text-[9px] text-neutral-500">
                <span>Encrypted secure credential checks in progress</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
