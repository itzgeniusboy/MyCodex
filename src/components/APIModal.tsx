import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Key,
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



interface SavedAPI {
  id: string;
  provider: string; 
  nickname: string;
  apiKey: string;
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
  "Google Gemini",
  "OpenAI (ChatGPT)",
  "Anthropic (Claude)",
  "DeepSeek",
  "Kimi (Moonshot)",
  "MiniMax",
  "xAI (Grok)",
  "Meta",
  "Mistral AI",
  "Qwen",
  "Perplexity",
  "Cohere",
  "Groq",
  "Together AI",
  "OpenRouter",
  "Hugging Face",
  "Stability AI",
  "Novita AI",
  "Fireworks AI",
  "Replicate",
  "Anyscale"
];

const LOCAL_DEVICE_PROFILES: string[] = [];

export default function APIModal({
  isOpen,
  onClose,
  hapticEnabled,
  activeUser,
  onActiveUserChange
}: APIModalProps) {
  // Navigation states for our tab components
  const [apiView, setApiView] = useState<"add" | "view">("add");

  // API Configuration Form Values - Default empty to force clean first selection state
  const [provider, setProvider] = useState("Google Gemini");
  const [nickname, setNickname] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [editingApiId, setEditingApiId] = useState<string | null>(null);

  // Saved list of API keys and profiles
  const [savedApis, setSavedApis] = useState<SavedAPI[]>([]);

  // Sub-system alert animation switches
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // GitHub Integration States inside Modal console
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState("");

  // Initialize and Sync from standard LocalStorage elements
  useEffect(() => {
    if (isOpen) {
      // 1. Fetch current saved APIs list
      const storedSavedApis = localStorage.getItem("pocket_codex_saved_apis");
      let activeList: SavedAPI[] = [];
      
      const currentActiveKey = localStorage.getItem("chat_gpt_ios_custom_key") || "";
      const currentActiveProvider = localStorage.getItem("chat_gpt_ios_active_provider") || "Google Gemini";
      const currentActiveNickname = localStorage.getItem("chat_gpt_ios_custom_nickname") || "Primary Key";

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
            nickname: currentActiveNickname,
            apiKey: currentActiveKey,
            isActive: true
          }
        ];
        localStorage.setItem("pocket_codex_saved_apis", JSON.stringify(activeList));
      }

      // Filter/map to ensure compatibility and valid properties
      const validatedList = activeList.map((a: any) => ({
        id: a.id || "api-" + Math.random(),
        provider: a.provider || "Google Gemini",
        nickname: a.nickname || a.provider || "Primary Key",
        apiKey: a.apiKey || "",
        isActive: !!a.isActive
      }));

      setSavedApis(validatedList);

      // Set input defaults - Always empty the cryptographic key for safety!
      const activeItem = validatedList.find((a) => a.isActive);
      if (activeItem) {
        setProvider(activeItem.provider || "Google Gemini");
        setNickname(activeItem.nickname || "");
        setApiKey(""); // Securely EMPTY by default so no token is exposed or prefilled
      } else {
        setProvider("Google Gemini");
        setNickname("");
        setApiKey("");
      }

      // Default the tab structure accordingly
      if (currentActiveKey) {
        setApiView("view");
      } else {
        setApiView("add");
      }

      // 3. Fetch current connected GitHub workspace profile
      const savedUser = localStorage.getItem("github_username");
      const savedToken = localStorage.getItem("github_token");
      if (savedUser && savedToken) {
        setGithubConnected(true);
        setGithubUser(savedUser);
      } else {
        setGithubConnected(false);
        setGithubUser("");
      }
    }
  }, [isOpen]);

  // Listen for callback broadcasts from popup and external disconnects
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "GITHUB_AUTH_SUCCESS" && event.data?.token) {
        const token = event.data.token;
        fetch("https://api.github.com/user", {
          headers: {
            "Authorization": `token ${token}`,
            "Accept": "application/vnd.github.v3+json"
          }
        })
        .then(res => res.json())
        .then(userData => {
          const username = userData.login || "developer";
          setGithubConnected(true);
          setGithubUser(username);
        })
        .catch(() => {
          setGithubConnected(true);
          setGithubUser("developer");
        });
      } else if (event.data?.type === "GITHUB_LOGOUT") {
        setGithubConnected(false);
        setGithubUser("");
      }
    };
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, []);

  const handleConnectGithubModal = () => {
    triggerHaptic();
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const popup = window.open(
      "/api/auth",
      "github_oauth_popup",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
    );
    if (!popup) {
      alert("Pop-up blocker is active. Please enable popups to authenticate GitHub!");
    }
  };

  const handleDisconnectGithubModal = () => {
    triggerHaptic();
    localStorage.removeItem("github_username");
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_oauth_token");
    setGithubConnected(false);
    setGithubUser("");
    // Publish dynamic event so main container picks it up immediately
    window.postMessage({ type: "GITHUB_LOGOUT" }, "*");
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
    localStorage.setItem("chat_gpt_ios_custom_nickname", api.nickname);
    localStorage.setItem("chat_gpt_ios_custom_model_id", "");

    const compatEngines = [
      {
        id: "default-proxy",
        provider: api.provider,
        apiKey: api.apiKey,
        isActive: true,
        baseUrl: "http://localhost:11434/v1",
        modelId: ""
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
    if (!apiKey.trim() || !provider || !nickname.trim()) return;

    let updatedList: SavedAPI[] = [];
    if (editingApiId) {
      updatedList = savedApis.map((api) => {
        if (api.id === editingApiId) {
          return {
            ...api,
            provider,
            nickname: nickname.trim(),
            apiKey: apiKey.trim(),
          };
        }
        return api;
      });
      setEditingApiId(null);
    } else {
      const newApi: SavedAPI = {
        id: "api-" + Date.now(),
        provider,
        nickname: nickname.trim(),
        apiKey: apiKey.trim(),
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
    setProvider("Google Gemini");
    setNickname("");
    setApiKey("");
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
    setNickname(api.nickname);
    setApiKey(""); // Keep cryptographic field EMPTY
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
      localStorage.removeItem("chat_gpt_ios_custom_nickname");
      localStorage.removeItem("chat_gpt_ios_custom_model_id");
      localStorage.removeItem("chat_gpt_ios_api_engines");
    }

    setSavedApis(updated);
    localStorage.setItem("pocket_codex_saved_apis", JSON.stringify(updated));
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
                    {savedApis.filter(a => a.isActive && a.apiKey.trim() !== "").length > 0 ? (
                      <span className="text-[9px] text-[#10b981] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md font-bold">
                        {savedApis.filter(a => a.isActive && a.apiKey.trim() !== "").length} Active Engine
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md font-bold animate-pulse">
                        No Active API Configured
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
                        <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Select AI Provider</label>
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
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">Key Nickname / Label</label>
                        <input
                          type="text"
                          placeholder="e.g. Gemini Backup Key, DeepSeek Personal"
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="w-full rounded-lg bg-[#0e0e11] border border-neutral-800 px-3 py-2 text-xs text-neutral-100 focus:border-amber-500 focus:outline-none"
                          id="api-nickname-input-ref"
                        />
                      </div>

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
                            placeholder={`Enter secure ${provider} API Key...`}
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
                        disabled={!apiKey.trim() || !provider || !nickname.trim()}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                        id="save-api-btn-submit"
                      >
                        {editingApiId ? "Update Save Context" : "Add Engine / Save"}
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
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-neutral-200 truncate">
                                  {api.nickname}
                                </span>
                                <span className="text-[10px] text-neutral-400 font-medium truncate">
                                  ({api.provider})
                                </span>
                                {api.isActive && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
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



                {/* 3. GITHUB REPOSITORY SYNC SECTION */}
                <div className="space-y-3 pt-4 border-t border-neutral-900">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-sans">
                      <svg className="h-3.5 w-3.5 fill-current text-neutral-400 shrink-0" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                      </svg>
                      Github Repository Sync
                    </h4>
                    {githubConnected && (
                      <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected as {githubUser}
                      </span>
                    )}
                  </div>

                  {!githubConnected ? (
                    <div className="bg-[#0b0b0d] p-3.5 rounded-xl border border-neutral-900/60 text-center space-y-3">
                      <p className="text-[10px] text-neutral-400 leading-normal">
                        Sync your code sandbox directly with GitHub. Save artifacts, push live commits, and fetch repos seamlessly with 1-Click native integration.
                      </p>
                      <button
                        type="button"
                        onClick={handleConnectGithubModal}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black font-extrabold text-xs rounded-xl transition cursor-pointer"
                      >
                        <svg className="h-4 w-4 fill-current text-neutral-950 shrink-0" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                        </svg>
                        Continue with GitHub
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#0b0b0d] p-3.5 rounded-xl border border-neutral-900/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-neutral-900 text-neutral-400">
                          <svg className="h-4 w-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-neutral-200 block truncate">@{githubUser}</span>
                          <span className="text-[9px] text-[#10b981] font-mono flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                            Live Workspace Linked
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectGithubModal}
                        className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500/25 transition text-[10px] font-bold cursor-pointer"
                      >
                        Disconnect
                      </button>
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
