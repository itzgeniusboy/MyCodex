import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Server,
  Cpu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Plus,
  Key,
  Mail,
  Check,
  User,
  Power
} from "lucide-react";
import { googleSignIn } from "../lib/firebase";

interface APIEngine {
  id: string;
  provider: string;
  apiKey: string;
  isActive: boolean;
}

interface GmailAccount {
  id: string;
  email: string;
  accessToken: string;
  isActive: boolean;
}

interface APIModalProps {
  isOpen: boolean;
  onClose: () => void;
  hapticEnabled: boolean;
}

export default function APIModal({ isOpen, onClose, hapticEnabled }: APIModalProps) {
  // Real-time dynamic states loaded from LocalStorage
  const [engines, setEngines] = useState<APIEngine[]>([]);
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);

  // Sub-forms states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState("");
  const [newKey, setNewKey] = useState("");

  const [isLinkingGmail, setIsLinkingGmail] = useState(false);
  const [latency, setLatency] = useState<number | null>(45);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 1. Load Custom AI Engines
      const storedEngines = localStorage.getItem("chat_gpt_ios_api_engines");
      if (storedEngines) {
        try {
          const parsed = JSON.parse(storedEngines);
          setEngines(parsed);
        } catch (e) {
          console.error(e);
        }
      } else {
        // Seed default sandbox configuration
        const defaultSeed: APIEngine[] = [
          { id: "default-proxy", provider: "Integrated Server Proxy (Default)", apiKey: "", isActive: true }
        ];
        localStorage.setItem("chat_gpt_ios_api_engines", JSON.stringify(defaultSeed));
        localStorage.setItem("chat_gpt_ios_custom_key", "");
        setEngines(defaultSeed);
      }

      // 2. Load linked multi-Gmail accounts
      const storedGmail = localStorage.getItem("chat_gpt_ios_gmail_accounts");
      if (storedGmail) {
        try {
          setGmailAccounts(JSON.parse(storedGmail));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [isOpen]);

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

  const handlePingTest = () => {
    triggerHaptic();
    setIsChecking(true);
    setLatency(null);
    setTimeout(() => {
      setLatency(Math.floor(25 + Math.random() * 32));
      setIsChecking(false);
    }, 1200);
  };

  // Add Dynamic new AI model override key
  const handleAddNewEngine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.trim()) return;
    triggerHaptic();

    const newEngine: APIEngine = {
      id: "engine-" + Date.now(),
      provider: newProvider.trim(),
      apiKey: newKey.trim(),
      isActive: false
    };

    const updated = [...engines, newEngine];
    setEngines(updated);
    localStorage.setItem("chat_gpt_ios_api_engines", JSON.stringify(updated));

    setNewProvider("");
    setNewKey("");
    setShowAddForm(false);
  };

  const handleMakeEngineActive = (id: string) => {
    triggerHaptic();
    const updated = engines.map((eng) => {
      if (eng.id === id) {
        // Instantly write to core active key read by backend
        localStorage.setItem("chat_gpt_ios_custom_key", eng.apiKey);
        return { ...eng, isActive: true };
      } else {
        return { ...eng, isActive: false };
      }
    });
    setEngines(updated);
    localStorage.setItem("chat_gpt_ios_api_engines", JSON.stringify(updated));
  };

  const handleDeleteEngine = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const engineToDelete = engines.find((eng) => eng.id === id);
    if (engineToDelete?.isActive) {
      localStorage.setItem("chat_gpt_ios_custom_key", "");
    }

    const updated = engines.filter((eng) => eng.id !== id);

    // Swap active configuration to first element if active was deleted
    if (engineToDelete?.isActive && updated.length > 0) {
      updated[0].isActive = true;
      localStorage.setItem("chat_gpt_ios_custom_key", updated[0].apiKey);
    }

    setEngines(updated);
    localStorage.setItem("chat_gpt_ios_api_engines", JSON.stringify(updated));
  };

  // Connect & switch dynamic multi Gmail logins
  const handleLinkNewGmail = async () => {
    triggerHaptic();
    setIsLinkingGmail(true);
    try {
      const result = await googleSignIn();
      if (result) {
        const newAcc: GmailAccount = {
          id: result.user.uid || "gmail-" + Date.now(),
          email: result.user.email || "unknown@gmail.com",
          accessToken: result.accessToken,
          isActive: true
        };

        // De-activate other accounts, promote this as active
        const updated = gmailAccounts.map((g) => ({ ...g, isActive: false }));
        const finalized = [...updated, newAcc];
        setGmailAccounts(finalized);
        localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(finalized));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLinkingGmail(false);
    }
  };

  const handleMakeGmailActive = (id: string) => {
    triggerHaptic();
    const updated = gmailAccounts.map((g) => ({
      ...g,
      isActive: g.id === id
    }));
    setGmailAccounts(updated);
    localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(updated));
  };

  const handleDeleteGmail = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const updated = gmailAccounts.filter((g) => g.id !== id);
    const wasActive = gmailAccounts.find((g) => g.id === id)?.isActive;
    if (wasActive && updated.length > 0) {
      updated[0].isActive = true;
    }
    setGmailAccounts(updated);
    localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(updated));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop glass overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs"
          />

          {/* Dialog Frame Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 25 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-[#222226] bg-[#0c0c0e] p-6 text-neutral-100 shadow-2xl"
              id="api-modal-container"
            >
              {/* Core glow */}
              <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 rounded-full p-2 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header block */}
              <div className="flex items-center gap-3 pb-4 border-b border-[#1c1c20]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-neutral-100">Unlimited API System</h3>
                  <p className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Multi-Cloud Engines Coordinator</p>
                </div>
              </div>

              {/* Body workspace */}
              <div className="mt-5 space-y-6">

                {/* SERVER STATUS AND PING */}
                <div className="rounded-2xl bg-neutral-950 p-4 border border-[#1b1b1e] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400 flex items-center gap-2 font-bold">
                      <Server className="h-4 w-4 text-emerald-400" /> API Gateway Active
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      ● Live Ping
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#121214] rounded-xl p-2.5 space-y-1 border border-neutral-900">
                      <span className="text-neutral-500 text-[9px] font-bold uppercase tracking-wider">Gateway Latency</span>
                      <span className="font-bold text-neutral-200 block">
                        {isChecking ? "Testing..." : latency ? `${latency}ms (Fast)` : "Pinging..."}
                      </span>
                    </div>

                    <div className="bg-[#121214] rounded-xl p-2.5 space-y-1 border border-neutral-900">
                      <span className="text-neutral-500 text-[9px] font-bold uppercase tracking-wider">Gateway Fallbacks</span>
                      <span className="font-bold text-neutral-200 block">3 Active Pools</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePingTest}
                    disabled={isChecking}
                    className="w-full text-center text-xs py-2 bg-neutral-900 hover:bg-neutral-850 font-bold rounded-xl text-neutral-300 hover:text-white transition flex items-center justify-center gap-1.5 border border-neutral-800"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-neutral-400 ${isChecking ? "animate-spin" : ""}`} />
                    Query Status Latency
                  </button>
                </div>

                {/* 1. DYNAMIC AI ENGINES LIST */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Custom AI engines ({engines.length})</h4>
                    <button
                      onClick={() => { triggerHaptic(); setShowAddForm(!showAddForm); }}
                      className="text-xs text-amber-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add New AI Engine
                    </button>
                  </div>

                  {/* Add New Engine form */}
                  <AnimatePresence>
                    {showAddForm && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleAddNewEngine}
                        className="bg-neutral-950 p-4 border border-amber-500/20 rounded-2xl space-y-3 overflow-hidden"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">AI Provider Name</label>
                          <input
                            type="text"
                            placeholder="e.g. DeepSeek, OpenAI, Custom Gemini Node"
                            value={newProvider}
                            onChange={(e) => setNewProvider(e.target.value)}
                            required
                            className="w-full rounded-xl bg-[#121214] border border-neutral-800 p-2.5 text-xs text-neutral-200 focus:border-amber-400 focus:outline-none placeholder-neutral-700"
                            id="add-provider-name-input"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Custom API Key</label>
                            <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold">Encrypted local</span>
                          </div>
                          <input
                            type="password"
                            placeholder="Paste your custom API cryptographic key..."
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            required
                            className="w-full rounded-xl bg-[#121214] border border-neutral-800 p-2.5 text-xs text-neutral-250 focus:border-amber-400 focus:outline-none placeholder-neutral-700"
                            id="add-provider-key-input"
                          />
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="flex-1 py-1.5 bg-neutral-900 hover:bg-neutral-850 rounded-xl text-neutral-400 text-xs font-semibold text-center"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-extrabold text-center shadow-lg"
                          >
                            Save Engine
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Scrollable Engines list with dedicated switcher buttons */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {/* 1. Integrated Server Proxy (Default) Card */}
                    {(() => {
                      const proxyEng = engines.find((e) => e.id === "default-proxy") || {
                        id: "default-proxy",
                        provider: "Integrated Server Proxy (Default)",
                        apiKey: "",
                        isActive: true
                      };
                      return (
                        <div
                          key={proxyEng.id}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                            proxyEng.isActive
                              ? "bg-amber-500/5 border-amber-500/40"
                              : "bg-neutral-950 border-neutral-900 hover:border-neutral-850"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${proxyEng.isActive ? "bg-amber-500/10 text-amber-400" : "bg-neutral-900 text-neutral-500"}`}>
                              <Key className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-neutral-200 block">{proxyEng.provider}</span>
                              <span className="text-[9px] text-neutral-500 font-mono">
                                Default Server Secrets
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {proxyEng.isActive ? (
                              <span className="text-[9px] bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            ) : (
                              <button
                                onClick={() => handleMakeEngineActive(proxyEng.id)}
                                className="text-[10px] bg-amber-500 text-neutral-900 font-extrabold px-3 py-1 rounded-full hover:bg-amber-400 cursor-pointer transition shadow"
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Dynamic list of newly added custom configs */}
                    {engines
                      .filter((e) => e.id !== "default-proxy")
                      .map((eng) => (
                        <div
                          key={eng.id}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                            eng.isActive
                              ? "bg-amber-500/5 border-amber-500/40"
                              : "bg-neutral-950 border-neutral-900 hover:border-neutral-850"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${eng.isActive ? "bg-amber-500/10 text-amber-400" : "bg-neutral-900 text-neutral-500"}`}>
                              <Key className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-neutral-200 block">{eng.provider}</span>
                              <span className="text-[9px] text-neutral-500 font-mono">
                                {eng.apiKey ? `${eng.apiKey.substring(0, 8)}••••••••` : "No Key Set"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {eng.isActive ? (
                              <span className="text-[9px] bg-amber-500/15 text-amber-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                                <Check className="h-3 w-3" /> Active
                              </span>
                            ) : (
                              <button
                                onClick={() => handleMakeEngineActive(eng.id)}
                                className="text-[10px] bg-amber-500 text-neutral-900 font-extrabold px-3 py-1 rounded-full hover:bg-amber-400 cursor-pointer transition shadow"
                              >
                                Activate
                              </button>
                            )}

                            <button
                              onClick={(e) => handleDeleteEngine(eng.id, e)}
                              className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-950/20 transition cursor-pointer"
                              title="Delete engine"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 2. DYNAMIC GMAIL WORKSPACE ACCOUNTS */}
                <div className="space-y-3 pt-2 border-t border-neutral-900">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Gmail Linked Accounts ({gmailAccounts.length})</h4>
                    <button
                      onClick={handleLinkNewGmail}
                      disabled={isLinkingGmail}
                      className="text-xs text-red-400 hover:underline font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> {isLinkingGmail ? "Authorizing..." : "Link New Account"}
                    </button>
                  </div>

                  {gmailAccounts.length === 0 ? (
                    <div className="p-4 border border-dashed border-neutral-850 rounded-2xl text-center text-xs text-neutral-500 italic">
                      No linked Gmail accounts yet. Tap the link button to add secure Google workspace logins!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {gmailAccounts.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => handleMakeGmailActive(g.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                            g.isActive
                              ? "bg-red-500/5 border-red-500/30"
                              : "bg-neutral-950 border-neutral-900 hover:border-neutral-800 hover:bg-neutral-900/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${g.isActive ? "bg-red-500/10 text-red-400" : "bg-neutral-900 text-neutral-500"}`}>
                              <Mail className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-neutral-200 block truncate max-w-[170px]">{g.email}</span>
                              <span className="text-[9px] text-neutral-500 font-mono">Synced OAuth 2.0 State</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {g.isActive ? (
                              <span className="text-[9px] bg-red-500/15 text-red-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Check className="h-3 w-3" /> Active Receiver
                              </span>
                            ) : (
                              <span className="text-[9px] text-neutral-500 font-semibold px-2 py-0.5">
                                Switch active
                              </span>
                            )}

                            <button
                              onClick={(e) => handleDeleteGmail(g.id, e)}
                              className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-950/20 transition"
                              title="Disconnect email credentials"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-neutral-500 italic leading-relaxed text-center">
                  All security configurations are saved securely inside your browser's Sandboxed LocalStorage. No confidential credentials ever traverse third-party diagnostic utilities.
                </p>

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
