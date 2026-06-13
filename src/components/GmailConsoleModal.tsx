import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Mail,
  Send,
  Sparkles,
  Inbox,
  User,
  Plus,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Eye,
  Loader2
} from "lucide-react";
import { googleSignIn, logoutGmail, getAccessToken, auth } from "../lib/firebase";
import { fetchRecentEmails, sendGmailMessage, GmailMessage } from "../lib/gmailService";

interface GmailConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  hapticEnabled: boolean;
  onPromptGptFromMail: (prompt: string) => void;
}

export default function GmailConsoleModal({
  isOpen,
  onClose,
  hapticEnabled,
  onPromptGptFromMail
}: GmailConsoleModalProps) {
  const [activeTab, setActiveTab2] = useState<"inbox" | "compose">("inbox");
  const [user, setUser2] = useState<any>(null);
  const [token, setToken2] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailFetchError, setEmailFetchError] = useState<string | null>(null);

  // Compose Fields
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessAlert, setSendSuccessAlert] = useState(false);

  // Send Confirmation dialog state
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Selected email expanded view state
  const [selectedMail, setSelectedMail] = useState<GmailMessage | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [mailSummaryText, setMailSummaryText] = useState<string | null>(null);

  const triggerHaptic = () => {
    if (!hapticEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      gain.gain.setValueAtTime(0.005, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  };

  // Check cached access token on overlay open
  useEffect(() => {
    if (isOpen) {
      getAccessToken().then((t) => {
        if (t) {
          setToken2(t);
          if (auth.currentUser) setUser2(auth.currentUser);
          lazyLoadInbox(t);
        }
      });
    }
  }, [isOpen]);

  const handleGoogleAuth = async () => {
    triggerHaptic();
    setIsAuthorizing(true);
    try {
      const result = await googleSignIn(true);
      if (result) {
        setToken2(result.accessToken);
        setUser2(result.user);
        lazyLoadInbox(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setEmailFetchError("Failed Google Auth popup credentials. Please accept the permissions requested.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleLogoutGoogle = async () => {
    triggerHaptic();
    await logoutGmail();
    setUser2(null);
    setToken2(null);
    setEmails([]);
    setSelectedMail(null);
  };

  const lazyLoadInbox = async (accessTokenKey: string) => {
    setIsLoadingEmails(true);
    setEmailFetchError(null);
    try {
      const messagesFetched = await fetchRecentEmails(accessTokenKey);
      setEmails(messagesFetched);
    } catch (err: any) {
      console.error(err);
      setEmailFetchError("Could not retrieve active Gmail inbox items. Click Sync below to fetch again.");
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const initiateSendHandshake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail || !subject || !bodyText) return;
    triggerHaptic();
    setShowConfirmSend(true);
  };

  const handleSendMessageFinal = async () => {
    if (!token) return;
    triggerHaptic();
    setIsSending(true);
    setShowConfirmSend(false);
    try {
      const result = await sendGmailMessage(token, toEmail, subject, bodyText);
      if (result) {
        setSendSuccessAlert(true);
        setToEmail("");
        setSubject("");
        setBodyText("");
        setTimeout(() => setSendSuccessAlert(false), 3000);
        setActiveTab2("inbox");
        lazyLoadInbox(token);
      }
    } catch (err) {
      alert("Failed to deliver mail through Google servers. Check SMTP permissions.");
    } finally {
      setIsSending(false);
    }
  };

  // Helper: Let AI auto-generate the body of email dynamically based on subject
  const handleAiAutoWriteMail = async () => {
    if (!subject) {
      alert("Please write a Subject line first, so the AI knows what to write about!");
      return;
    }
    triggerHaptic();
    setIsSending(true);
    try {
      const prompt = `Write a professional email body based on this subject: "${subject}". Keep the tone extremely crisp and friendly. Start directly with 'Hi team/recipient' and output only the email text itself. No placeholders.`;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (response.ok) {
        const result = await response.json();
        setBodyText(result.reply);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  // Helper AI summary for a selected email thread
  const handleSummarizeMailWithAi = async (mail: GmailMessage) => {
    triggerHaptic();
    setIsGeneratingSummary(true);
    setMailSummaryText(null);
    try {
      const prompt = `Formulate a very crisp 1-sentence executive summary and list 3 bullet action-items from this email content:
From: ${mail.from}
Subject: ${mail.subject}
Snippet: ${mail.snippet}`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (response.ok) {
        const result = await response.json();
        setMailSummaryText(result.reply);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Helper to reply directly to selected email in chatbot
  const handleReplyToInChatbot = (mail: GmailMessage) => {
    triggerHaptic();
    onClose();
    onPromptGptFromMail(`I want to write a reply email to this person:\nFrom: ${mail.from}\nSubject: ${mail.subject}\nSnippet is: "${mail.snippet}". Write a neat draft code or copy options.`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Main Backdrop Glass */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", duration: 0.45 }}
              className="relative w-full max-w-2xl h-[560px] flex flex-col overflow-hidden rounded-2xl border border-[#222226] bg-[#0c0c0e] text-neutral-100 shadow-2xl"
              id="gmail-console-box"
            >
              {/* Star backdrop decoration */}
              <div className="absolute top-0 left-0 h-40 w-40 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button top-right */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-1.5 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition z-50"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header Title */}
              <div className="p-5 border-b border-[#1b1b1e] flex items-center justify-between bg-neutral-950/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-neutral-100">Gmail Workspace Mailbox</h3>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Fully Synced Interface</p>
                  </div>
                </div>

                {user && (
                  <div className="flex items-center gap-2 mr-8">
                    <span className="text-[10px] bg-neutral-850 px-2 py-1 rounded-lg text-neutral-400">
                      Sync: {user.email}
                    </span>
                    <button
                      onClick={handleLogoutGoogle}
                      className="text-xs text-red-400 hover:underline flex items-center gap-1 font-semibold"
                      title="Disconnect Google Accounts"
                    >
                      <LogOut className="h-3 w-3" /> Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Unauthenticated State */}
              {!token ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-5">
                  <div className="relative">
                    <div className="absolute inset-0 gpt-wave-glow rounded-full scale-110 pointer-events-none" />
                    <div className="bg-red-500/10 border border-red-500/20 h-16 w-16 rounded-2xl flex items-center justify-center text-red-400 scale-105">
                      <Mail className="h-8 w-8 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-lg font-bold">Connect your Google Workspace</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Authenticate with Gmail using secure Google OAuth flow. Read your 100% live personal emails, summarize messages with Gemini, and compose formatted replies.
                    </p>
                  </div>

                  <button
                    onClick={handleGoogleAuth}
                    disabled={isAuthorizing}
                    className="gsi-material-button text-xs font-semibold py-3 px-6 bg-white hover:bg-neutral-100 text-neutral-900 rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isAuthorizing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-neutral-800" />
                        Authorizing access...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 48 48" style={{ display: "block" }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        <span>Sign in with Google Account</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Uses official developer Sandbox client configuration</span>
                  </div>
                </div>
              ) : (
                /* Authenticated Workspace */
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Tab Selector pills */}
                  <div className="px-5 py-3 border-b border-[#1b1b1e] bg-[#0c0c0e] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5 bg-neutral-900/60 border border-neutral-850 p-1.5 rounded-xl">
                      <button
                        onClick={() => { triggerHaptic(); setActiveTab2("inbox"); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          activeTab === "inbox"
                            ? "bg-neutral-800 text-neutral-100 shadow"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        <Inbox className="h-3.5 w-3.5" /> Recent Inbox
                      </button>
                      <button
                        onClick={() => { triggerHaptic(); setActiveTab2("compose"); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          activeTab === "compose"
                            ? "bg-neutral-800 text-neutral-100 shadow"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5" /> Compose Email
                      </button>
                    </div>

                    {activeTab === "inbox" && (
                      <button
                        onClick={() => lazyLoadInbox(token)}
                        disabled={isLoadingEmails}
                        className="p-1 px-2 text-xs bg-neutral-900 border border-neutral-850 rounded-lg text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 hover:bg-neutral-850 transition"
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoadingEmails ? "animate-spin" : ""}`} />
                        Sync Inbox
                      </button>
                    )}
                  </div>

                  {/* Sandbox alerts */}
                  {sendSuccessAlert && (
                    <div className="bg-emerald-950/20 border-b border-emerald-900/50 p-2.5 px-5 text-xs text-emerald-400 font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Message Delivered successfully through Google Mail service!
                    </div>
                  )}

                  {/* Tab Content 1: Inbox view list */}
                  {activeTab === "inbox" && (
                    <div className="flex-1 flex overflow-hidden">
                      
                      {/* Left list pane */}
                      <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${selectedMail ? "hidden md:block md:w-1/2 md:border-r md:border-[#1b1b1e]" : "w-full"}`}>
                        {isLoadingEmails && emails.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                            <Loader2 className="h-8 w-8 animate-spin text-neutral-500 mb-2" />
                            <span className="text-xs">Fetching inbox and credentials...</span>
                          </div>
                        ) : emailFetchError ? (
                          <div className="p-6 text-center text-red-400 bg-red-950/10 border border-red-900/40 rounded-xl m-2 space-y-1">
                            <AlertTriangle className="h-5 w-5 mx-auto text-red-400" />
                            <h5 className="font-bold text-xs">Inbox Retrieval Locked</h5>
                            <p className="text-[10px] leading-relaxed text-neutral-500">{emailFetchError}</p>
                          </div>
                        ) : emails.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                            <Mail className="h-8 w-8 mb-2" />
                            <span className="text-xs">Your primary sandbox inbox has 0 emails.</span>
                          </div>
                        ) : (
                          emails.map((mail) => (
                            <div
                              key={mail.id}
                              onClick={() => { triggerHaptic(); setSelectedMail(mail); setMailSummaryText(null); }}
                              className={`p-3.5 rounded-xl border block cursor-pointer text-left transition ${
                                selectedMail?.id === mail.id
                                  ? "border-neutral-700 bg-neutral-900"
                                  : "border-neutral-900/80 bg-neutral-950/50 hover:bg-neutral-900/40 hover:border-neutral-850"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-neutral-200 truncate pr-2 max-w-[130px]">{mail.from}</span>
                                <span className="text-[9px] text-neutral-500">{mail.date.split(",")[0]}</span>
                              </div>
                              <h5 className="font-bold text-xs truncate mt-1 text-neutral-150">{mail.subject}</h5>
                              <p className="text-[11px] text-neutral-500 truncate mt-1 leading-relaxed">{mail.snippet}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Right expanded email viewer */}
                      {selectedMail && (
                        <div className="flex-1 w-full md:w-1/2 overflow-y-auto p-5 space-y-4 bg-neutral-950/40 flex flex-col relative">
                          {/* Close details button on small mobile phones */}
                          <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
                            <button
                              onClick={() => setSelectedMail(null)}
                              className="text-xs text-blue-400 font-bold hover:underline"
                            >
                              ← Back to List
                            </button>
                            <span className="text-[9px] text-neutral-500">Message ID: {selectedMail.id}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">From sender</span>
                            <h5 className="font-bold text-sm text-neutral-100">{selectedMail.from}</h5>
                            <span className="text-[10px] text-neutral-550 block">{selectedMail.date}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Subject Title</span>
                            <h4 className="font-bold text-xs text-neutral-200">{selectedMail.subject}</h4>
                          </div>

                          {/* Email snippet panel block */}
                          <div className="rounded-xl border border-neutral-900 bg-[#111113]/55 p-3.5 text-xs inline-block text-neutral-300 leading-relaxed max-w-full overflow-hidden select-text">
                            {selectedMail.snippet}
                          </div>

                          {/* AI Summary tools workspace */}
                          <div className="border-t border-neutral-900 pt-3 space-y-2 shrink-0">
                            <div className="flex gap-2">
                              {/* GPT summary execution */}
                              <button
                                onClick={() => handleSummarizeMailWithAi(selectedMail)}
                                disabled={isGeneratingSummary}
                                className="flex-1 py-1.5 px-3 bg-neutral-900 border border-neutral-850 hover:bg-neutral-850 rounded-lg text-[10px] font-bold text-blue-400 flex items-center justify-center gap-1.5"
                              >
                                {isGeneratingSummary ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    AI Summarizing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3 w-3" />
                                    AI Summarize Email
                                  </>
                                )}
                              </button>

                              {/* Draft reply in chatbot */}
                              <button
                                onClick={() => handleReplyToInChatbot(selectedMail)}
                                className="flex-1 py-1.5 px-3 bg-[#111113] border border-neutral-850 hover:bg-neutral-850 rounded-lg text-[10px] font-bold text-neutral-350 flex items-center justify-center gap-1.5"
                              >
                                <Eye className="h-3 w-3" /> Reply in Chatbot
                              </button>
                            </div>

                            {mailSummaryText && (
                              <div className="p-3 bg-blue-950/10 border border-blue-900/30 rounded-xl text-[11px] leading-relaxed text-neutral-300 space-y-1 select-text">
                                <span className="font-bold text-blue-400 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI Summary</span>
                                <p className="whitespace-pre-wrap">{mailSummaryText}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab Content 2: Compose Email Form */}
                  {activeTab === "compose" && (
                    <div className="flex-1 overflow-y-auto p-5">
                      <form onSubmit={initiateSendHandshake} className="space-y-4 max-w-lg mx-auto">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">Recipient (To:)</label>
                          <input
                            type="email"
                            placeholder="recipient@gmail.com"
                            value={toEmail}
                            onChange={(e) => setToEmail(e.target.value)}
                            required
                            className="w-full rounded-xl bg-neutral-950 px-3.5 py-2.5 text-xs border border-neutral-850 focus:border-red-500 focus:outline-none placeholder-neutral-700 font-sans"
                            id="gmail-compose-to"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">Subject Title</label>
                          <input
                            type="text"
                            placeholder="Re: Project synchronization..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                            className="w-full rounded-xl bg-neutral-950 px-3.5 py-2.5 text-xs border border-neutral-850 focus:border-red-500 focus:outline-none placeholder-neutral-700 font-semibold"
                            id="gmail-compose-subject"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">Body content</label>
                            <button
                              type="button"
                              onClick={handleAiAutoWriteMail}
                              disabled={isSending}
                              className="text-[10px] text-blue-400 hover:underline font-bold flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3 animate-pulse" /> AI Auto-write Draft
                            </button>
                          </div>
                          
                          <textarea
                            placeholder="Dear friend, here is our project sync detail..."
                            value={bodyText}
                            onChange={(e) => setBodyText(e.target.value)}
                            required
                            rows={5}
                            className="w-full rounded-xl bg-neutral-950 p-3.5 text-xs border border-neutral-850 focus:border-red-500 focus:outline-none placeholder-neutral-700 font-sans leading-relaxed resize-none"
                            id="gmail-compose-body"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full h-11 bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                        >
                          <Send className="h-4 w-4 text-neutral-900" />
                          Deliver Message Securely
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Gmail Confirmation dialog prior to sending emails - MANDATORY SECURITY HANDSHAKE */}
                  {showConfirmSend && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                      <div className="bg-[#141416] border border-[#222226] max-w-sm rounded-2xl p-5 text-center space-y-4 shadow-2xl">
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 h-12 w-12 rounded-full flex items-center justify-center mx-auto">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-sm text-neutral-100">Send Email Confirmation?</h4>
                          <p className="text-xs text-neutral-400 leading-relaxed">
                            Are you sure you want to dispatch this email from your account profile?
                          </p>
                          <div className="bg-neutral-950 p-2 text-[10px] rounded text-left text-neutral-400 font-mono truncate">
                            To: {toEmail}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setShowConfirmSend(false)}
                            className="py-2.5 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-neutral-850"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSendMessageFinal}
                            className="py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white shadow-lg"
                          >
                            Confirm & Dispatch
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
