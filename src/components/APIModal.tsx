import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Key,
  Mail,
  Check,
  Cpu,
  Trash2,
  Lock,
  Edit3,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Laptop,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { UserProfile } from "../types";

interface GmailAccount {
  id: string;
  email: string;
  accessToken: string;
  isActive: boolean;
}

interface SavedAPI {
  id: string;
  provider: string; // e.g. "Gemini 1.5 Pro", "OpenAI GPT-4o", "custom"
  apiKey: string;
  modelName?: string; // only if custom
  isActive: boolean;
}

interface APIModalProps {
  isOpen: boolean;
  onClose: () => void;
  hapticEnabled: boolean;
  activeUser?: UserProfile;
  onActiveUserChange?: (user: UserProfile) => void;
}

const PROVIDER_LIST = [
  { value: "", label: "-- Choose AI Provider --" },
  { value: "Gemini 1.5 Pro", label: "Google Gemini 1.5 Pro" },
  { value: "Gemini 1.5 Flash", label: "Google Gemini 1.5 Flash" },
  { value: "OpenAI GPT-4o", label: "OpenAI GPT-4o" },
  { value: "Claude 3.5 Sonnet", label: "Anthropic Claude 3.5 Sonnet" },
  { value: "Groq Llama 3", label: "Groq LLaMA 3" },
  { value: "custom", label: "Custom OpenAPI Endpoint" }
];

const LOCAL_DEVICE_PROFILES = [
  "itzraviking@gmail.com",
  "ravi.kumar.dev@gmail.com",
  "guest.pilot.engineer@gmail.com",
  "pocketcodex.sandbox@gmail.com",
  "coder.v1.terminal@gmail.com"
];

export default function APIModal({
  isOpen,
  onClose,
  hapticEnabled,
  activeUser,
  onActiveUserChange
}: APIModalProps) {
  // Navigation states for our tab components
  const [apiView, setApiView] = useState<"add" | "view">("add");
  const [gmailView, setGmailView] = useState<"view" | "add">("view");

  // API Configuration Form Values - Default empty to force clean first selection state
  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [editingApiId, setEditingApiId] = useState<string | null>(null);

  // Saved list of API keys and profiles
  const [savedApis, setSavedApis] = useState<SavedAPI[]>([]);
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);

  // Sub-system alert animation switches
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Custom Gmail sub-options configuration values
  const [customEmail, setCustomEmail] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [customOtp, setCustomOtp] = useState("");
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [isSimulatingLogin, setIsSimulatingLogin] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpVerifySuccess, setOtpVerifySuccess] = useState(false);

  // Simulated Google Cloud OAuth workflow state
  const [isAutoSelectingEmail, setIsAutoSelectingEmail] = useState<string | null>(null);

  // Initialize and Sync from standard LocalStorage elements
  useEffect(() => {
    if (isOpen) {
      // 1. Fetch current saved APIs list
      const storedSavedApis = localStorage.getItem("pocket_codex_saved_apis");
      let activeList: SavedAPI[] = [];
      
      const currentActiveKey = localStorage.getItem("chat_gpt_ios_custom_key") || "";
      const currentActiveProvider = localStorage.getItem("chat_gpt_ios_active_provider") || "Gemini 1.5 Flash";
      const currentActiveModelId = localStorage.getItem("chat_gpt_ios_custom_model_id") || "";

      if (storedSavedApis) {
        try {
          activeList = JSON.parse(storedSavedApis);
        } catch (e) {
          console.error("Failed to parse saved apis list", e);
        }
      }

      // If list is empty, initialize with current active setup
      if (activeList.length === 0) {
        activeList = [
          {
            id: "api-init",
            provider: currentActiveProvider,
            apiKey: currentActiveKey,
            modelName: currentActiveModelId,
            isActive: true
          }
        ];
        localStorage.setItem("pocket_codex_saved_apis", JSON.stringify(activeList));
      }

      setSavedApis(activeList);

      // Set input defaults
      const activeItem = activeList.find((a) => a.isActive);
      if (activeItem) {
        setProvider(activeItem.provider);
        setApiKey(activeItem.apiKey);
        setModelName(activeItem.modelName || "");
      }

      // Default the tab structure accordingly
      if (currentActiveKey) {
        setApiView("view");
      } else {
        setApiView("add");
      }

      // 2. Fetch current connected Gmail profiles
      const storedGmail = localStorage.getItem("chat_gpt_ios_gmail_accounts");
      if (storedGmail) {
        try {
          const parsed = JSON.parse(storedGmail);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGmailAccounts(parsed);
          } else {
            initializeDefaultGmailProfiles();
          }
        } catch (e) {
          initializeDefaultGmailProfiles();
        }
      } else {
        initializeDefaultGmailProfiles();
      }
    }
  }, [isOpen]);

  const initializeDefaultGmailProfiles = () => {
    const defaultProfiles = [
      { id: "mock-1", email: "ravi.kumar.dev@gmail.com", accessToken: "mock-token-1", isActive: true },
      { id: "mock-2", email: "guest.pilot.engineer@gmail.com", accessToken: "mock-token-2", isActive: false }
    ];
    setGmailAccounts(defaultProfiles);
    localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(defaultProfiles));
  };

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

  // Sync current active API configuration back to traditional standard LocalStorage variables
  const syncActiveApiToApp = (api: SavedAPI) => {
    localStorage.setItem("chat_gpt_ios_custom_key", api.apiKey);
    localStorage.setItem("chat_gpt_ios_active_provider", api.provider);
    localStorage.setItem("chat_gpt_ios_custom_model_id", api.modelName || "");

    const compatEngines = [
      {
        id: "default-proxy",
        provider: api.provider,
        apiKey: api.apiKey,
        isActive: true,
        baseUrl: "http://localhost:11434/v1",
        modelId: api.modelName || ""
      }
    ];
    localStorage.setItem("chat_gpt_ios_api_engines", JSON.stringify(compatEngines));
  };

  // Switch/Toggle current active saved API Key
  const handleToggleActiveApi = (id: string) => {
    triggerHaptic();
    const updated = savedApis.map((api) => ({
      ...api,
      isActive: api.id === id
    }));
    setSavedApis(updated);
    localStorage.setItem("pocket_codex_saved_apis", JSON.stringify(updated));

    const selected = updated.find((a) => a.isActive);
    if (selected) {
      syncActiveApiToApp(selected);
    }
  };

  // Commit and Save new/edited API Key
  const handleSaveAPI = () => {
    triggerHaptic();
    if (!apiKey.trim() || !provider) return;

    let updatedList: SavedAPI[] = [];
    if (editingApiId) {
      updatedList = savedApis.map((api) => {
        if (api.id === editingApiId) {
          return {
            ...api,
            provider,
            apiKey: apiKey.trim(),
            modelName: provider === "custom" ? modelName.trim() : ""
          };
        }
        return api;
      });
      setEditingApiId(null);
    } else {
      const newApi: SavedAPI = {
        id: "api-" + Date.now(),
        provider,
        apiKey: apiKey.trim(),
        modelName: provider === "custom" ? modelName.trim() : "",
        isActive: true
      };
      // Deactivate others
      updatedList = [...savedApis.map((a) => ({ ...a, isActive: false })), newApi];
    }

    setSavedApis(updatedList);
    localStorage.setItem("pocket_codex_saved_apis", JSON.stringify(updatedList));

    const activeApi = updatedList.find((a) => a.isActive);
    if (activeApi) {
      syncActiveApiToApp(activeApi);
    }

    // Instantly empty/clear the credentials and the AI Provider dropdown selection so it blanks out clean!
    setProvider("");
    setApiKey("");
    setModelName("");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);

    // Swap instantly to view tab
    setApiView("view");
  };

  // Edit custom saved item
  const handleEditApi = (api: SavedAPI, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    setEditingApiId(api.id);
    setProvider(api.provider);
    setApiKey(api.apiKey);
    setModelName(api.modelName || "");
    setApiView("add"); // Switch back to editor tab
  };

  // Delete saved configuration
  const handleDeleteApi = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const updated = savedApis.filter((api) => api.id !== id);

    if (savedApis.find((api) => api.id === id)?.isActive && updated.length > 0) {
      updated[0].isActive = true;
      syncActiveApiToApp(updated[0]);
    } else if (updated.length === 0) {
      localStorage.removeItem("chat_gpt_ios_custom_key");
      localStorage.removeItem("chat_gpt_ios_active_provider");
      localStorage.removeItem("chat_gpt_ios_custom_model_id");
      localStorage.removeItem("chat_gpt_ios_api_engines");
    }

    setSavedApis(updated);
    localStorage.setItem("pocket_codex_saved_apis", JSON.stringify(updated));
  };

  // Activate Gmail account switch
  const handleToggleGmailActive = (id: string, forcedList?: GmailAccount[]) => {
    triggerHaptic();
    const listToUse = forcedList || gmailAccounts;
    const target = listToUse.find((g) => g.id === id);
    if (!target) return;

    const updated = listToUse.map((g) => ({
      ...g,
      isActive: g.id === id
    }));
    setGmailAccounts(updated);
    localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(updated));

    if (onActiveUserChange) {
      const parts = target.email.split("@")[0] || "User";
      const name = parts.split(".").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      onActiveUserChange({
        email: target.email,
        name: name,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(target.email)}`,
        isLoggedIn: true
      });
    }
  };

  // Remove specific linked Gmail account session sandbox
  const handleRemoveGmail = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    const filtered = gmailAccounts.filter((g) => g.id !== id);
    
    if (filtered.length > 0 && gmailAccounts.find((g) => g.id === id)?.isActive) {
      filtered[0].isActive = true;
      setGmailAccounts(filtered);
      localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(filtered));
      handleToggleGmailActive(filtered[0].id, filtered);
    } else {
      setGmailAccounts(filtered);
      localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(filtered));
      if (onActiveUserChange) {
        // If all accounts removed, log out the default sandbox state safely
        onActiveUserChange({
          email: "guest.pilot.engineer@gmail.com",
          name: "Guest Pilot",
          avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=guest",
          isLoggedIn: false
        });
      }
    }
  };

  // One-tap Add Gmail profile with fully simulated animation sequence
  const handleOneTapAddProfile = (email: string) => {
    triggerHaptic();
    setIsAutoSelectingEmail(email);

    // Simulate Google Authentication Challenge popup / redirect delay
    setTimeout(() => {
      let updated: GmailAccount[] = [];
      const hasAccount = gmailAccounts.some((g) => g.email.toLowerCase() === email.toLowerCase());

      if (hasAccount) {
        const existing = gmailAccounts.find((g) => g.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          handleToggleGmailActive(existing.id);
        }
      } else {
        const newAcc: GmailAccount = {
          id: "gmail-" + Date.now(),
          email: email,
          accessToken: "mock-token-" + Date.now(),
          isActive: true
        };
        updated = [...gmailAccounts.map((g) => ({ ...g, isActive: false })), newAcc];
        setGmailAccounts(updated);
        localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(updated));
        handleToggleGmailActive(newAcc.id, updated);
      }

      setIsAutoSelectingEmail(null);
      setGmailView("view");
    }, 1500);
  };

  // Simulate remote Custom custom configuration workflow connection
  const handleTriggerCustomGmailConnect = () => {
    triggerHaptic();
    if (!customEmail.trim() || !customEmail.includes("@")) {
      return;
    }
    
    // Animate and initiate simulated connecting handshake phase
    setIsSimulatingLogin(true);
    setTimeout(() => {
      setIsSimulatingLogin(false);
      setShowOtpScreen(true);
    }, 1500);
  };

  const handleVerifyOtpCode = () => {
    triggerHaptic();
    if (!customOtp || customOtp.length < 4) return;

    setIsSimulatingLogin(true);
    setTimeout(() => {
      setIsSimulatingLogin(false);
      setOtpVerifySuccess(true);
      
      setTimeout(() => {
        // Complete the custom profile sync
        const newAcc: GmailAccount = {
          id: "gmail-custom-" + Date.now(),
          email: customEmail.trim(),
          accessToken: "mock-custom-token-" + Date.now(),
          isActive: true
        };

        const updated = [...gmailAccounts.map((g) => ({ ...g, isActive: false })), newAcc];
        setGmailAccounts(updated);
        localStorage.setItem("chat_gpt_ios_gmail_accounts", JSON.stringify(updated));
        handleToggleGmailActive(newAcc.id, updated);
        
        // Reset custom input sandbox parameters
        setCustomEmail("");
        setCustomPassword("");
        setCustomOtp("");
        setShowOtpScreen(false);
        setIsCustomExpanded(false);
        setOtpVerifySuccess(false);

        // Turn back to viewing view
        setGmailView("view");
      }, 1000);
    }, 1200);
  };

  // Mask sensitive key helpers
  const getMaskedKey = (key: string) => {
    if (!key) return "No Cryptographic Key";
    if (key.length <= 8) return "••••••••";
    return `${key.slice(0, 5)}••••${key.slice(-4)}`;
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
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm"
          />

          {/* Dialog Frame Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 25 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 25 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-neutral-800/80 bg-[#0a0a0c] p-6 text-neutral-100 shadow-2xl"
              id="api-modal-container"
            >
              {/* Header Glow Spheres */}
              <div className="absolute top-0 right-0 h-40 w-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 h-40 w-40 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 rounded-full p-2 h-8 w-8 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200 transition flex items-center justify-center"
                aria-label="Close"
                id="api-modal-close-btn"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Title Section */}
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 border border-neutral-800 relative overflow-hidden shrink-0 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/15 via-[#FF5500]/5 to-transparent rounded-xl pointer-events-none" />
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <defs>
                      <radialGradient id="centralGlowModalHead" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FF7300" stopOpacity="1" />
                        <stop offset="50%" stopColor="#FF5500" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#FF5500" stopOpacity="0" />
                      </radialGradient>
                    </defs>
                    <circle cx="50" cy="50" r="28" fill="url(#centralGlowModalHead)" opacity="0.45" />
                    <path d="M 33 32 L 18 50 L 33 68" stroke="#FF5500" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                    <path d="M 67 32 L 82 50 L 67 68" stroke="#FF5500" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.8" />
                    <circle cx="50" cy="50" r="11" fill="#141416" stroke="#FF5500" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="6" fill="#FF7300" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-neutral-100 uppercase">PocketCodex Sandbox</h3>
                  <p className="text-[10px] text-amber-500 tracking-wider font-extrabold uppercase">Multi-Profile Settings Console</p>
                </div>
              </div>

              {/* Workspace Body Layout */}
              <div className="mt-5 space-y-6">

                {/* 1. API CONFIGURATION WORKSPACE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-amber-500" />
                      API Configuration
                    </h4>
                    {savedApis.length > 0 && (
                      <span className="text-[9px] text-[#10b981] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md font-bold">
                        {savedApis.filter(a => a.isActive).length} Active Engine
                      </span>
                    )}
                  </div>

                  {/* Primary Side-by-Side Horizontal Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-900">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setApiView("add");
                        setEditingApiId(null);
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        apiView === "add"
                          ? "bg-amber-500 text-black shadow-md shadow-amber-500/10 scale-[1.01]"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                      id="opt-add-api-tab"
                    >
                      <Plus className="h-3 w-3" /> Add API
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setApiView("view");
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        apiView === "view"
                          ? "bg-amber-500 text-black shadow-md shadow-amber-500/10 scale-[1.01]"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                      id="opt-view-api-tab"
                    >
                      Retrieve Saved ({savedApis.length})
                    </button>
                  </div>

                  {/* API TAB CONTENT 1: ADD / UPDATE API */}
                  {apiView === "add" && (
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 space-y-3 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">AI Provider</label>
                        <select
                          value={provider}
                          onChange={(e) => {
                            setProvider(e.target.value);
                            triggerHaptic();
                          }}
                          className="w-full rounded-lg bg-[#0e0e11] border border-neutral-800 p-2 text-xs text-neutral-200 focus:border-amber-500 focus:outline-none cursor-pointer"
                          id="provider-select-ref"
                        >
                          {PROVIDER_LIST.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Expand Custom Fields Automatically if Custom is Selected */}
                      {provider === "custom" && (
                        <div className="space-y-1 block animate-fadeIn">
                          <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Custom Model Name</label>
                          <input
                            type="text"
                            placeholder="e.g. deepseek-coder, llama-3"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            className="w-full rounded-lg bg-[#0e0e11] border border-neutral-800 px-3 py-2 text-xs text-neutral-100 focus:border-amber-500 focus:outline-none font-mono"
                            id="custom-model-id-ref"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">API Cryptographic Key</label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-neutral-600 hover:text-neutral-400 text-[10px] flex items-center gap-1.5"
                          >
                            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            <span>{showPassword ? "Hide" : "Reveal"}</span>
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder={provider === "custom" ? "Enter custom API signature key..." : `Enter secure ${provider} API Key...`}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full rounded-lg bg-[#0e0e11] border border-neutral-800 pl-8 pr-3 py-2 text-xs text-neutral-200 focus:border-amber-500 focus:outline-none font-mono tracking-tight"
                            id="api-key-input-ref"
                          />
                          <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-600" />
                        </div>
                      </div>

                      {/* Clean commit button */}
                      <button
                        type="button"
                        onClick={handleSaveAPI}
                        disabled={!apiKey.trim() || !provider}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                        id="save-api-btn-submit"
                      >
                        {editingApiId ? "Update Save Context" : "Committ Secure Settings"}
                      </button>
                    </div>
                  )}

                  {/* API TAB CONTENT 2: VIEW ALL SAVED APIS */}
                  {apiView === "view" && (
                    <div className="space-y-2 animate-fadeIn max-h-[190px] overflow-y-auto pr-1">
                      {savedApis.length === 0 ? (
                        <div className="p-4 border border-dashed border-neutral-850 rounded-xl text-center text-xs text-neutral-600 italic">
                          No saved keys in localStorage workspace.
                        </div>
                      ) : (
                        savedApis.map((api) => (
                          <div
                            key={api.id}
                            onClick={() => handleToggleActiveApi(api.id)}
                            className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              api.isActive
                                ? "bg-amber-500/5 border-amber-500/30"
                                : "bg-neutral-950 border-neutral-900/60 hover:border-neutral-800 hover:bg-neutral-900/20"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-neutral-200 truncate">
                                  {api.provider === "custom" && api.modelName ? `Custom (${api.modelName})` : api.provider}
                                </span>
                                {api.isActive && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                )}
                              </div>
                              <span className="text-[10px] text-neutral-500 font-mono block tracking-tight">
                                {getMaskedKey(api.apiKey)}
                              </span>
                            </div>

                            {/* Explicit Action Buttons [Edit] and [Delete] */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleEditApi(api, e)}
                                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/20 transition"
                                title="Edit Configuration"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteApi(api.id, e)}
                                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/20 transition"
                                title="Delete Key"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Indicator Alert Success */}
                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 3 }}
                        className="text-[10px] text-center text-emerald-400 font-bold bg-emerald-500/5 py-1 px-3 rounded-lg border border-emerald-500/10"
                      >
                        Configuration saved & synchronized successfully
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. GMAIL PROFILE SYNC SECTION */}
                <div className="space-y-3 pt-4 border-t border-neutral-900">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-red-500" />
                      Gmail Profile Sync
                    </h4>
                    {gmailAccounts.length > 0 && (
                      <span className="text-[9px] text-[#10b981] font-bold">
                        {gmailAccounts.length} Active Accounts
                      </span>
                    )}
                  </div>

                  {/* Two clean horizontal toggles: [+ Add Gmail] and [View Gmails] */}
                  <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-900">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setGmailView("add");
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        gmailView === "add"
                          ? "bg-amber-500 text-black shadow-md shadow-amber-500/10 scale-[1.01]"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                      id="tab-add-profile"
                    >
                      <Plus className="h-3 w-3" /> + Add Gmail
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setGmailView("view");
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        gmailView === "view"
                          ? "bg-amber-500 text-black shadow-md shadow-amber-500/10 scale-[1.01]"
                          : "text-neutral-400 hover:text-neutral-200"
                      }`}
                      id="tab-view-profile"
                    >
                      View Gmails
                    </button>
                  </div>

                  {/* GMAIL TAB CONTENT 1: ADD GMAIL */}
                  {gmailView === "add" && (
                    <div className="bg-[#0b0b0d] p-0.5 rounded-xl border border-neutral-900/60 overflow-hidden">
                      {isAutoSelectingEmail ? (
                        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-900 flex flex-col items-center justify-center space-y-4 animate-fadeIn min-h-[220px]">
                          {/* Rich Google loader styling with floating layers */}
                          <div className="relative flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full border-2 border-neutral-900 border-t-amber-500 animate-spin" />
                            <div className="absolute font-black text-xs text-amber-500">G</div>
                          </div>
                          <div className="text-center space-y-1 max-w-xs">
                            <h5 className="text-xs font-black uppercase tracking-wider text-neutral-100">Simulating Google Sign-In</h5>
                            <p className="text-[10px] text-neutral-400 leading-normal">
                              Connecting <span className="font-mono text-amber-500 font-bold">{isAutoSelectingEmail}</span> to Active Sandbox...
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-400 font-bold">
                            <Shield className="h-3 w-3" />
                            <span>Verifying OAuth Handshake Keys</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-900 space-y-4 animate-fadeIn">
                          {/* Simulated Google Accounts selector header branding */}
                          <div className="flex flex-col items-center justify-center text-center pb-2 border-b border-neutral-900/60 gap-1">
                            <div className="h-6 w-6 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-200 text-xs font-mono font-bold shadow-md">G</div>
                            <div>
                              <h5 className="text-xs font-bold text-neutral-200">Sign in with Google</h5>
                              <p className="text-[9px] text-neutral-500">Choose an account to continue to PocketCodex</p>
                            </div>
                          </div>

                          {/* Grid of local device ready accounts */}
                          <div className="grid grid-cols-1 gap-1.5">
                            {LOCAL_DEVICE_PROFILES.map((email) => {
                              const isCurrentlyTracked = gmailAccounts.some((g) => g.email === email);
                              return (
                                <button
                                  key={email}
                                  type="button"
                                  onClick={() => handleOneTapAddProfile(email)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition border ${
                                    isCurrentlyTracked
                                      ? "bg-amber-500/5 border-amber-500/20 text-amber-400"
                                      : "bg-[#0e0e11] border-neutral-850 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-2 w-2 rounded-full bg-neutral-800 border border-neutral-700 shrink-0" />
                                    <span className="font-medium truncate max-w-[180px]">{email}</span>
                                  </div>
                                  <span className="text-[9px] bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded-md font-bold border border-neutral-800">
                                    {isCurrentlyTracked ? "Toggle Active" : "+ Link Profile"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Expandable Custom credentials sub-option configuration block */}
                          <div className="pt-2 border-t border-neutral-900/60">
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic();
                                setIsCustomExpanded(!isCustomExpanded);
                              }}
                              className="w-full py-2 text-center text-[10px] text-neutral-400 font-bold bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg transition"
                            >
                              {isCustomExpanded ? "Hide Custom Login Option" : "Configure Custom Account Login"}
                            </button>

                            {isCustomExpanded && (
                              <div className="mt-3 bg-[#0d0d10] p-3 rounded-lg border border-neutral-850 space-y-2.5 block animate-fadeIn text-left">
                                {!showOtpScreen ? (
                                  <>
                                    <div className="space-y-1">
                                      <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Custom Email</label>
                                      <input
                                        type="email"
                                        placeholder="e.g. enterprise.sync@gmail.com"
                                        value={customEmail}
                                        onChange={(e) => setCustomEmail(e.target.value)}
                                        className="w-full rounded-lg bg-[#070708] border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-amber-500"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">App-specific Password</label>
                                      <input
                                        type="password"
                                        placeholder="••••••••••••••••"
                                        value={customPassword}
                                        onChange={(e) => setCustomPassword(e.target.value)}
                                        className="w-full rounded-lg bg-[#070708] border border-neutral-800 px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-700 focus:outline-none focus:border-amber-500"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleTriggerCustomGmailConnect}
                                      disabled={!customEmail || !customPassword || isSimulatingLogin}
                                      className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                                    >
                                      {isSimulatingLogin ? (
                                        <>
                                          <RefreshCw className="h-3 w-3 animate-spin" />
                                          Establishing TLS Handshake...
                                        </>
                                      ) : (
                                        <span>Execute Google Auth Challenge</span>
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  /* Interactive OTP login container block */
                                  <div className="space-y-2.5 animate-scaleUp">
                                    <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-neutral-400 text-[10px] flex gap-2 items-start leading-normal">
                                      <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="font-bold text-neutral-300 block">OTP authentication initialized</span>
                                        We sent a simulated 6-digit confirmation key to active workspace. Use 123456 to bypass securely.
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Enter 6-digit OTP Code</label>
                                      <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="123456"
                                        value={customOtp}
                                        onChange={(e) => setCustomOtp(e.target.value.replace(/\D/g, ""))}
                                        className="w-full text-center tracking-[0.5em] font-extrabold text-base rounded-lg bg-[#070708] border border-neutral-800 p-2 text-amber-500 focus:outline-none focus:border-amber-500"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleVerifyOtpCode}
                                      disabled={customOtp.length < 4 || isSimulatingLogin}
                                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-[10px] py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 disabled:opacity-40 uppercase tracking-wider"
                                    >
                                      {isSimulatingLogin ? (
                                        <>
                                          <RefreshCw className="h-3 w-3 animate-spin" />
                                          Validating Token...
                                        </>
                                      ) : otpVerifySuccess ? (
                                        <>
                                          <Check className="h-3 w-3 text-neutral-950" />
                                          Success! Profile Linked
                                        </>
                                      ) : (
                                        <span>Verify OTP Handshake</span>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* GMAIL TAB CONTENT 2: VIEW GMAILS LIST */}
                  {gmailView === "view" && (
                    <div className="space-y-2 animate-fadeIn max-h-[190px] overflow-y-auto pr-1">
                      {gmailAccounts.length === 0 ? (
                        <div className="p-4 border border-dashed border-neutral-850 rounded-xl text-center text-xs text-neutral-600 italic">
                          No connected Gmail profiles configured.
                        </div>
                      ) : (
                        gmailAccounts.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => handleToggleGmailActive(g.id)}
                            className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              g.isActive
                                ? "bg-amber-500/5 border-amber-500/30"
                                : "bg-neutral-950 border-neutral-900/60 hover:bg-neutral-900/10 hover:border-neutral-800"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`p-1.5 rounded-lg shrink-0 ${g.isActive ? "bg-amber-950/40 text-amber-500" : "bg-neutral-900 text-neutral-600"}`}>
                                <Mail className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-neutral-200 block truncate max-w-[150px]">{g.email}</span>
                                <span className="text-[9px] text-[#10b981] font-mono flex items-center gap-1">
                                  {g.isActive ? (
                                    <>
                                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                                      Active Sandbox Sandbox Session
                                    </>
                                  ) : (
                                    <span className="text-neutral-500">Offline Standby</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* [Remove] button to easily terminate specific Sandbox session */}
                            <button
                              type="button"
                              onClick={(e) => handleRemoveGmail(g.id, e)}
                              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-red-400 hover:border-red-500/20 transition flex items-center justify-center shrink-0 text-[10px] font-bold"
                              title="Terminate Session"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
