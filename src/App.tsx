import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  User,
  Mic,
  Copy,
  Check,
  Languages,
  BookOpen,
  Code,
  Compass,
  ArrowRight,
  ChevronDown,
  Info,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Mail,
  X,
  GitBranch
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

import Sidebar from "./components/Sidebar";
import LoginModal from "./components/LoginModal";
import VoiceOverlay from "./components/VoiceOverlay";
import SettingsModal from "./components/SettingsModal";
import APIModal from "./components/APIModal";
import GmailConsoleModal from "./components/GmailConsoleModal";
import { Message, ChatThread, UserProfile, PresetPrompt } from "./types";

// Dynamic quick select prompts (English or Hinglish inputs)
const PRESET_PROMPTS: PresetPrompt[] = [
  {
    id: "hinglish",
    icon: "✍️",
    title: "Write Hinglish Caption",
    description: "Create an Instagram caption in sweet Hinglish",
    promptText: "Write a high-engagement, cool Instagram caption in Hinglish about exploring a new city with friends."
  },
  {
    id: "explain",
    icon: "💡",
    title: "Explain Physics simply",
    description: "What are wormholes/blackholes?",
    promptText: "Explain black holes and wormholes in simple terms to an 8-year-old in a friendly storyboard format."
  },
  {
    id: "coding",
    icon: "💻",
    title: "React custom Hook",
    description: "Write simple localStorage hook",
    promptText: "Write a clean TypeScript React custom hook called useLocalStorage with generic types."
  },
  {
    id: "creative",
    icon: "🎨",
    title: "Aesthetic ideas",
    description: "Ideas for decorating a study setup",
    promptText: "Suggest 5 minimalistic, cozy dark-themed desk setup decoration ideas, including lighting and desk layouts."
  }
];

export default function App() {
  // --- Core State Machine ---
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- UI Layout state ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isGmailConsoleOpen, setIsGmailConsoleOpen] = useState(false);

  // Custom Claude Sandbox state variables
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState("");
  const [sandboxFilename, setSandboxFilename] = useState("app.tsx");
  const [sandboxViewMode, setSandboxViewMode] = useState<"live" | "code">("live");

  // Options configuration
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [modelMode, setModelMode] = useState("gpt-4o"); // gpt-4o or o1-pro

  // User Profile configuration
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem("chat_gpt_ios_active_user");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return {
      email: "itzraviking@gmail.com",
      name: "Ravi Kumar",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Ravi%20Kumar",
      isLoggedIn: true,
    };
  });

  const lastLoadedUserEmailRef = useRef<string | null>(null);

  // GitHub simulation states
  const [gitPushNotification, setGitPushNotification] = useState<{
    show: boolean;
    status: "processing" | "success" | "idle";
    filename: string;
    branch: string;
    sha: string;
    commitMsg: string;
  }>({
    show: false,
    status: "idle",
    filename: "",
    branch: "main",
    sha: "",
    commitMsg: ""
  });

  const handleGitHubPush = () => {
    triggerHapticFeedback();
    
    // Find latest message with code snippet
    let detectedFile = "App.tsx";
    if (activeMessages && activeMessages.length > 0) {
      for (let i = activeMessages.length - 1; i >= 0; i--) {
        const msg = activeMessages[i];
        if (msg.role === "assistant" && msg.content.includes("```")) {
          // Detect filename
          const match = /```(\w+)?/i.exec(msg.content);
          const lang = match ? match[1] : "";
          if (lang === "html") detectedFile = "index.html";
          else if (lang === "css") detectedFile = "index.css";
          else if (lang === "js") detectedFile = "index.js";
          else if (lang === "ts") detectedFile = "index.ts";
          else if (lang === "tsx") detectedFile = "App.tsx";
          else detectedFile = "App.tsx";
          break;
        }
      }
    }

    setGitPushNotification({
      show: true,
      status: "processing",
      filename: detectedFile,
      branch: "main",
      sha: "",
      commitMsg: ""
    });

    // 1.5s beautiful secure simulated commit push sequence
    setTimeout(() => {
      const generatedSha = "sha-" + Math.round(Math.random() * 10000000).toString(16);
      setGitPushNotification({
        show: true,
        status: "success",
        filename: detectedFile,
        branch: "main",
        sha: generatedSha,
        commitMsg: `PocketCodex: Synchronized ${detectedFile} to repository cloud`
      });

      // Play victory dual haptic feedback pattern
      triggerHapticFeedback();
      setTimeout(triggerHapticFeedback, 150);
      
      // Auto dismiss success toast after 5 seconds to keep view immaculate
      setTimeout(() => {
        setGitPushNotification((prev) => (prev.status === "success" ? { ...prev, show: false } : prev));
      }, 5000);
    }, 1800);
  };

  // Reference for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Initialize and LocalStorage Synchronization ---
  useEffect(() => {
    try {
      const userKey = `chat_gpt_ios_threads_${user.email || "guest"}`;
      const stored = localStorage.getItem(userKey);
      if (stored) {
        const parsed: ChatThread[] = JSON.parse(stored);
        if (parsed.length > 0) {
          setThreads(parsed);
          setActiveThreadId(parsed[0].id);
          lastLoadedUserEmailRef.current = user.email;
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load user threads", e);
    }

    const userName = user.name || "Guest";
    const initialThread: ChatThread = {
      id: `welcome-${user.email || "guest"}-${Date.now()}`,
      title: "Swagat hai! Start here",
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: `Hello ${userName}! Main aapka AI assistant PocketCodex hoon. Main har topic par help kar sakta hoon. Hindi, Hinglish ya English mein kuch bhi puchiye!\n\n💡 **Kuch ideas jise aap try kar sakte hain:**\n- 'Mujhe ek responsive navigation bar banana hai code likho'\n- 'Duniya ka sabse purana sheher kaun sa hai?'\n- 'Generate a sweet birthday greeting for my best friend!'`,
          timestamp: new Date()
        }
      ],
      updatedAt: new Date()
    };
    setThreads([initialThread]);
    setActiveThreadId(initialThread.id);
    lastLoadedUserEmailRef.current = user.email;
  }, [user.email]);

  // Save changes automatically
  useEffect(() => {
    if (threads.length > 0 && lastLoadedUserEmailRef.current === user.email) {
      const userKey = `chat_gpt_ios_threads_${user.email || "guest"}`;
      localStorage.setItem(userKey, JSON.stringify(threads));
    }
  }, [threads, user.email]);

  // Save active user profile configuration to localStorage automatically
  useEffect(() => {
    if (user) {
      localStorage.setItem("chat_gpt_ios_active_user", JSON.stringify(user));
    }
  }, [user]);

  // Autoscroll to bottom is key for iOS smoothness
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [threads, activeThreadId, isAiLoading]);

  // Play micro click sound for haptic simulation
  const triggerHapticFeedback = () => {
    if (!hapticEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // AudioContext blocked or not supported
    }
  };

  // --- Thread and Message Operations ---
  const handleSelectThread = (id: string) => {
    triggerHapticFeedback();
    setActiveThreadId(id);
  };

  const handleNewChat = () => {
    triggerHapticFeedback();
    const newId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: "New Chat",
      messages: [],
      updatedAt: new Date()
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticFeedback();
    const updated = threads.filter((t) => t.id !== id);
    setThreads(updated);
    
    if (activeThreadId === id) {
      if (updated.length > 0) {
        setActiveThreadId(updated[0].id);
      } else {
        const newId = `thread-${Date.now()}`;
        const fallback: ChatThread = {
          id: newId,
          title: "New Chat",
          messages: [],
          updatedAt: new Date()
        };
        setThreads([fallback]);
        setActiveThreadId(newId);
      }
    }
  };

  const handleClearHistory = () => {
    triggerHapticFeedback();
    localStorage.removeItem("chat_gpt_ios_threads_" + (user.email || "guest"));
    const clearedId = `thread-${Date.now()}`;
    const defaultThread: ChatThread = {
      id: clearedId,
      title: "New Chat",
      messages: [],
      updatedAt: new Date()
    };
    setThreads([defaultThread]);
    setActiveThreadId(clearedId);
  };

  // Submit User Message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isAiLoading) return;
    
    triggerHapticFeedback();
    setErrorMessage(null);

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date()
    };

    let currentThread = threads.find((t) => t.id === activeThreadId);
    let updatedMsgs: Message[] = [];

    if (!currentThread) {
      // Fallback create thread
      const newId = `thread-${Date.now()}`;
      currentThread = {
        id: newId,
        title: text.length > 25 ? text.substring(0, 25) + "..." : text,
        messages: [userMsg],
        updatedAt: new Date()
      };
      setThreads((prev) => [currentThread!, ...prev]);
      setActiveThreadId(newId);
      updatedMsgs = [userMsg];
    } else {
      updatedMsgs = [...currentThread.messages, userMsg];
      
      // Auto-rename thread title if it was default "New Chat" empty state list
      const title = currentThread.title === "New Chat" || currentThread.title === "Swagat hai! Start here"
          ? (text.length > 25 ? text.substring(0, 25) + "..." : text)
          : currentThread.title;

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? { ...t, messages: updatedMsgs, title, updatedAt: new Date() }
            : t
        )
      );
    }

    setInputMessage("");
    setIsAiLoading(true);

    try {
      // Call standard server side full-stack API route to generate Gemini content safely
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMsgs.map(m => ({ role: m.role, content: m.content })),
          customApiKey: localStorage.getItem("chat_gpt_ios_custom_key") || ""
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed server API response status");
      }

      const data = await response.json();
      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date()
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === (currentThread ? currentThread.id : activeThreadId)
            ? { ...t, messages: [...updatedMsgs, assistantMsg], updatedAt: new Date() }
            : t
        )
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong. Please confirm your GEMINI_API_KEY settings.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyMessage = (id: string, content: string) => {
    triggerHapticFeedback();
    navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  // Find active chat messages
  const activeThread = threads.find((t) => t.id === activeThreadId);
  const activeMessages = activeThread ? activeThread.messages : [];

  return (
    <div className="flex h-screen w-full bg-[#0c0c0e] text-neutral-100 overflow-hidden font-sans">
      {/* 1. Sidebar Panel Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onDeleteThread={handleDeleteThread}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        user={user}
        onLogout={() => {
          triggerHapticFeedback();
          setUser({
            email: "alpha.tester@ai.com",
            name: "Guest Pilot",
            avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Guest%20Pilot",
            isLoggedIn: false
          });
        }}
        onOpenApi={() => setIsApiModalOpen(true)}
        onOpenGmail={() => setIsGmailConsoleOpen(true)}
      />

      {/* 2. Main Chat Frame Space */}
      <div className="flex-1 flex flex-col relative h-full bg-[#0c0c0e] overflow-hidden">
        
        {/* Custom iOS Title Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#1b1b1e] bg-[#0c0c0e]/95 px-4 backdrop-blur-md z-30">
          
          {/* Menu Drawer toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setIsSidebarOpen(true);
              }}
              className="rounded-xl p-2 hover:bg-neutral-900 transition text-neutral-300"
              id="header-menu-btn"
              title="Open Sidebar Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              onClick={handleNewChat}
              className="rounded-xl p-2 hover:bg-neutral-900 transition text-neutral-300 lg:hidden"
              id="header-new-chat-btn"
              title="Create New Conversation"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* iOS Style Center Model Selector Dropdown with Animations */}
          <div className="relative">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setIsModelDropdownOpen(!isModelDropdownOpen);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 py-1.5 px-3.5 text-xs font-bold hover:bg-neutral-850 hover:border-neutral-700 transition"
              id="model-selector-dropdown-trigger"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>{modelMode === "gpt-4o" ? "GPT-4o Edition" : "o1-pro Creative"}</span>
              <ChevronDown className="h-3 w-3 text-neutral-500" />
            </button>

            {/* Selector Dropdown Panel */}
            <AnimatePresence>
              {isModelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-52 rounded-xl border border-[#222226] bg-[#141416] p-1 shadow-2xl z-50 text-neutral-200"
                  >
                    <button
                      onClick={() => {
                        triggerHapticFeedback();
                        setModelMode("gpt-4o");
                        setIsModelDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-xs font-medium hover:bg-neutral-850 text-left"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-blue-400" /> GPT-4o
                        </span>
                        <span className="text-[10px] text-neutral-550">Optimized for speed</span>
                      </div>
                      {modelMode === "gpt-4o" && <Check className="h-4 w-4 text-neutral-100" />}
                    </button>

                    <button
                      onClick={() => {
                        triggerHapticFeedback();
                        setModelMode("o1-pro");
                        setIsModelDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-xs font-medium hover:bg-neutral-850 text-left mt-0.5"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-indigo-400" /> o1-pro Creative
                        </span>
                        <span className="text-[10px] text-neutral-550">Detailed system breakdown</span>
                      </div>
                      {modelMode === "o1-pro" && <Check className="h-4 w-4 text-neutral-100" />}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Right Header Navigation - GitHub Push and Profile Login widget */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGitHubPush}
              disabled={gitPushNotification.status === "processing"}
              className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                gitPushNotification.status === "processing"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400 cursor-not-allowed"
                  : "bg-neutral-900 border-[#222226] hover:bg-neutral-850 text-neutral-300 hover:text-white"
              }`}
              id="header-github-push-btn"
              title="Push Latest Code Artifact to GitHub"
            >
              {gitPushNotification.status === "processing" ? (
                <div className="h-3.5 w-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <GitBranch className="h-4 w-4" />
              )}
              
              {/* Pulsing indicator to show code is ready if thread contains code blocks */}
              {activeMessages.some(m => m.role === "assistant" && m.content.includes("```")) && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </button>

            {/* Profile Avatar Widget */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                setIsLoginOpen(true);
              }}
              className="flex items-center justify-center p-1 hover:bg-neutral-900 rounded-lg transition"
              id="header-profile-btn"
              title="Manage Account"
            >
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-7 w-7 rounded-lg bg-neutral-800 border border-[#333] object-cover"
              />
            </button>
          </div>
        </header>

        {/* 3. Conversations Screen / Message list container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
          {activeMessages.length === 0 ? (
            /* Elegant empty prompt state for ChatGPT copy */
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center h-full min-h-[70vh] text-center">
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-xl"
              >
                <div className="absolute inset-0 gpt-gradient-glow rounded-2xl pointer-events-none" />
                <Sparkles className="h-7 w-7 text-neutral-300 animate-pulse" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold tracking-tight text-neutral-100"
              >
                How can I help you today?
              </motion.h1>
              
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                Ask a question in English, Hindi/Hinglish, write code, or request ideas. Powered securely (Gemini 3.5).
              </p>

              {/* Grid of Custom Hindi / English Prompt Templates */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 w-full self-center">
                {PRESET_PROMPTS.map((preset, index) => (
                  <motion.div
                    key={preset.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                    onClick={() => handleSendMessage(preset.promptText)}
                    className="flex flex-col items-start text-left p-3 rounded-xl border border-[#1b1b1e] bg-[#111113]/60 hover:bg-neutral-900/80 hover:border-neutral-700 cursor-pointer transition text-neutral-100 group"
                  >
                    <span className="text-xl mb-1">{preset.icon}</span>
                    <span className="text-xs font-semibold group-hover:text-blue-400 transition">
                      {preset.title}
                    </span>
                    <span className="text-[10px] text-neutral-500 mt-0.5 mt-auto">
                      {preset.description}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Render active conversation chat bubbles */
            <div className="max-w-2xl mx-auto space-y-6">
              {activeMessages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {/* Assistant custom logo avatar icon representation */}
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 font-bold self-start mt-0.5 text-xs shadow">
                        GPT
                      </div>
                    )}

                    <div className="flex flex-col max-w-[85%]">
                      {/* Bubble panel */}
                      <div
                        className={`rounded-2xl px-4 py-3 leading-relaxed text-sm ${
                          isUser
                            ? "bg-[#212124] text-neutral-100 hover:bg-[#28282c] transition"
                            : "bg-transparent text-neutral-200"
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                        ) : (
                          <div className="prose prose-invert prose-xs text-neutral-200 select-text font-sans">
                            {/* Format markdown formatted response nicely */}
                            <ReactMarkdown
                              components={{
                                code({ node, className, children, ...props }) {
                                  return (
                                    <code className="bg-[#212124] text-amber-300 rounded px-1.5 py-0.5 text-xs font-mono font-medium" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                pre({ node, children, ...props }) {
                                  // Extract plain text string content of code block safely
                                  const getRawText = (element: any): string => {
                                    if (!element) return "";
                                    if (typeof element === "string") return element;
                                    if (typeof element === "number") return String(element);
                                    if (Array.isArray(element)) return element.map(getRawText).join("");
                                    if (element.props && element.props.children) return getRawText(element.props.children);
                                    return "";
                                  };
                                  
                                  const codeVal = getRawText(children).trim();

                                  // Smart filename discoverer from comments or content
                                  const detectFilename = (text: string): string => {
                                    const firstLine = text.split("\n")[0].trim();
                                    const match = /^(?:\/\/\s*|#\s*|<!--\s*|\/\*\s*)([\w.-]+\.(?:html|js|ts|tsx|css|json|py|java|sh|md))(?:\s*\*\/|\s*-->)?\s*$/i.exec(firstLine);
                                    if (match && match[1]) {
                                      return match[1];
                                    }
                                    if (text.includes("<!DOCTYPE html>") || text.includes("<html") || text.includes("<body")) {
                                      return "index.html";
                                    }
                                    if (text.includes("import React") || text.includes("export default") || text.includes("useState")) {
                                      return "App.tsx";
                                    }
                                    if (text.includes("const ") && text.includes("express =")) {
                                      return "server.ts";
                                    }
                                    if (text.includes("@import") || text.includes("@theme")) {
                                      return "index.css";
                                    }
                                    return "app.tsx";
                                  };

                                  const fileName = detectFilename(codeVal);

                                  return (
                                    <div className="my-4 overflow-hidden rounded-2xl border border-neutral-850 bg-[#121214] shadow-xl">
                                      {/* File Code Tab Header Badge block for click views */}
                                      <div className="flex items-center justify-between border-b border-[#1b1b1e] bg-neutral-900/40 px-4 py-2 select-none">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">📄</span>
                                          <span className="font-mono text-[11px] font-bold text-neutral-300">
                                            {fileName}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            triggerHapticFeedback();
                                            setSandboxCode(codeVal);
                                            setSandboxFilename(fileName);
                                            setSandboxViewMode("live");
                                            setIsSandboxOpen(true);
                                          }}
                                          className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-[10px] font-extrabold text-blue-400 hover:bg-blue-500/20 active:scale-95 transition cursor-pointer"
                                        >
                                          <Compass className="h-3.5 w-3.5" />
                                          <span>Click to View UI</span>
                                        </button>
                                      </div>
                                      <pre className="bg-[#0c0c0e]/80 m-0 max-h-[180px] overflow-auto p-4 text-[11px] font-mono text-neutral-300" {...props}>
                                        {children}
                                      </pre>
                                    </div>
                                  );
                                },
                                p({ node, children }) {
                                  return <p className="mb-2 last:mb-0 text-neutral-200">{children}</p>;
                                },
                                ul({ node, children }) {
                                  return <ul className="list-disc pl-5 mb-2.5 space-y-1">{children}</ul>;
                                },
                                ol({ node, children }) {
                                  return <ol className="list-decimal pl-5 mb-2.5 space-y-1">{children}</ol>;
                                }
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Micro actions bottom line (copy or timestamp helper) */}
                      <div className={`flex items-center gap-2 mt-1.5 text-[10px] text-neutral-500 ${isUser ? "justify-end" : "justify-start pl-1"}`}>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {!isUser && (
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="p-1 hover:bg-neutral-900 rounded text-neutral-400 hover:text-neutral-200 transition"
                            title="Copy reply text"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* User profile picture right align */}
                    {isUser && (
                      <img
                        src={user.avatarUrl}
                        alt="User profile representation"
                        className="h-7 w-7 rounded-full shrink-0 border border-neutral-700 mt-0.5"
                      />
                    )}
                  </motion.div>
                );
              })}

              {/* Simulated continuous typing or backend model fetching indicator */}
              {isAiLoading && (
                <div className="flex items-start gap-4 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 font-bold text-xs shadow-md">
                    GPT
                  </div>
                  <div className="flex flex-col max-w-[85%]">
                    <div className="flex items-center gap-1.5 bg-neutral-900/40 border border-[#1b1b1e] rounded-2xl px-4 py-3 h-10">
                      {/* Pulse waves */}
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Server-side failure notification if API is offline */}
              {errorMessage && (
                <div className="bg-red-950/20 border border-red-900/65 rounded-xl p-3 flex gap-2.5 text-xs text-red-300 max-w-lg mx-auto">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Model Request Failed</span>
                    <p className="leading-relaxed">{errorMessage}</p>
                    <button
                      onClick={() => handleSendMessage(activeMessages[activeMessages.length - 1]?.content || "")}
                      className="text-[10px] text-blue-400 underline font-bold mt-1.5 block hover:text-blue-300"
                    >
                      Retry previous prompt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dummy element for scroll trigger */}
          <div ref={messagesEndRef} />
        </div>

        {/* 4. Bottom message composer input area */}
        <footer className="p-4 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e] to-transparent z-20">
          <div className="max-w-2xl mx-auto">
            
            {/* Input Wrapper box */}
            <div className="relative flex items-center bg-[#151518] rounded-2xl border border-neutral-800 focus-within:border-neutral-700/80 p-1.5 transition">
              
              {/* Optional dynamic mic simulation launcher */}
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  setIsVoiceOpen(true);
                }}
                className="p-2 text-neutral-400 hover:text-neutral-200 transition rounded-xl"
                title="Open Voice Speech Synthesizer"
                id="footer-microphone-shortcut"
              >
                <Mic className="h-5 w-5" />
              </button>

              {/* Message textbox input field */}
              <input
                type="text"
                placeholder={isAiLoading ? "ChatGPT is computing response..." : "Message ChatGPT..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage(inputMessage);
                  }
                }}
                disabled={isAiLoading}
                className="flex-1 bg-transparent px-2.5 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-0 disabled:opacity-50"
                id="footer-chat-input-field"
              />

              {/* Animated Send button (only active when text exists) */}
              <button
                onClick={() => handleSendMessage(inputMessage)}
                disabled={!inputMessage.trim() || isAiLoading}
                className={`p-2.5 rounded-xl transition ${
                  inputMessage.trim() && !isAiLoading
                    ? "bg-neutral-100 text-[#0c0c0e] hover:bg-neutral-200 active:scale-95"
                    : "bg-neutral-850 text-neutral-600 cursor-not-allowed"
                }`}
                title="Send Chat Message"
                id="footer-submit-message-btn"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Subtext info */}
            <p className="text-[10px] text-center text-neutral-600 mt-2.5">
              ChatGPT can make mistakes. Verify important info. Secure full-stack sandbox sync.
            </p>
          </div>
        </footer>
      </div>

      {/* 5. Custom Modals overlay */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSubmit={(profile) => {
          triggerHapticFeedback();
          setUser(profile);
        }}
      />

      <VoiceOverlay
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSendVoiceQuery={async (speechContent) => {
          // Send voice request and return reply
          try {
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: [{ role: "user", content: speechContent }],
                customApiKey: localStorage.getItem("chat_gpt_ios_custom_key") || ""
              })
            });
            if (!response.ok) throw new Error("API call error");
            const data = await response.json();
            
            // Add user and assistant exchange to active thread
            const userMsg: Message = {
              id: `msg-${Date.now()}`,
              role: "user",
              content: speechContent,
              timestamp: new Date()
            };
            const assistantMsg: Message = {
              id: `msg-${Date.now() + 1}`,
              role: "assistant",
              content: data.reply,
              timestamp: new Date()
            };

            setThreads((prev) =>
              prev.map((t) =>
                t.id === activeThreadId
                  ? { ...t, messages: [...t.messages, userMsg, assistantMsg], updatedAt: new Date() }
                  : t
              )
            );

            return data.reply;
          } catch (e) {
            return "Kshama kijiye, hum aapse connect nahi kar paye.";
          }
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onClearHistory={handleClearHistory}
        hapticEnabled={hapticEnabled}
        onToggleHaptic={() => {
          triggerHapticFeedback();
          setHapticEnabled(!hapticEnabled);
        }}
        modelMode={modelMode}
        onChangeModelMode={(mode) => {
          triggerHapticFeedback();
          setModelMode(mode);
        }}
      />

      <APIModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        hapticEnabled={hapticEnabled}
      />

      <GmailConsoleModal
        isOpen={isGmailConsoleOpen}
        onClose={() => setIsGmailConsoleOpen(false)}
        hapticEnabled={hapticEnabled}
        onPromptGptFromMail={(prompt) => {
          setInputMessage(prompt);
          handleSendMessage(prompt);
        }}
      />

      {/* 6. Artifact Sandbox Drawer Overlay */}
      <AnimatePresence>
        {isSandboxOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-[150] flex flex-col bg-[#0c0c0e] text-neutral-100"
          >
            {/* Header of the live preview sandbox */}
            <div className="flex h-14 items-center justify-between border-b border-neutral-850 bg-[#0c0c0e]/95 px-4 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Device Preview Sandbox
                </span>
              </div>

              {/* View options selectors */}
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    setSandboxViewMode("live");
                  }}
                  className={`px-3 py-1 text-[10px] rounded-lg font-bold transition ${
                    sandboxViewMode === "live"
                      ? "bg-amber-500 text-neutral-950 shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Live Running App
                </button>
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    setSandboxViewMode("code");
                  }}
                  className={`px-3 py-1 text-[10px] rounded-lg font-bold transition ${
                    sandboxViewMode === "code"
                      ? "bg-amber-500 text-neutral-950 shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Code Renderer
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[10px] font-mono text-neutral-500 bg-neutral-950 border border-neutral-850 px-2 py-0.5 rounded">
                  {sandboxFilename}
                </span>
                
                {/* Close Drawer Overlay */}
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    setIsSandboxOpen(false);
                  }}
                  className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-extrabold px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  <span>Back to Chat</span>
                </button>
              </div>
            </div>

            {/* Sandbox Content Screen */}
            <div className="flex-1 relative bg-neutral-950 flex flex-col">
              {sandboxViewMode === "live" ? (
                <iframe
                  title="PocketCodex Live Running Sandbox Frame"
                  src="/"
                  className="w-full h-full border-0 bg-[#0c0c0e]"
                />
              ) : (
                <iframe
                  title="PocketCodex Code Sandbox Render Frame"
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                          body {
                            background-color: #0c0c0e;
                            color: #e4e4e7;
                            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
                            padding: 24px;
                          }
                          pre {
                            background-color: #121214;
                            padding: 16px;
                            border-radius: 12px;
                            border: 1px solid #1c1c20;
                            overflow-x: auto;
                            font-family: inherit;
                          }
                        </style>
                      </head>
                      <body>
                        <h2 class="text-base font-black text-amber-400 mb-2">${sandboxFilename}</h2>
                        <p class="text-[11px] text-neutral-400 mb-4 flex items-center gap-1">Active source snippet selected from conversation:</p>
                        <pre class="text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-wrap">${sandboxCode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</pre>
                      </body>
                    </html>
                  `}
                  className="w-full h-full border-0 bg-[#0c0c0e]"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GitHub Push Toast Notification Banner */}
      <AnimatePresence>
        {gitPushNotification.show && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            className="fixed top-4 left-4 right-4 z-[200] mx-auto max-w-sm overflow-hidden rounded-2xl border border-neutral-800 bg-[#121214]/95 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-950 border border-neutral-800">
                {gitPushNotification.status === "processing" ? (
                  <div className="h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GitBranch className="h-5 w-5 text-emerald-400" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-200">
                    {gitPushNotification.status === "processing"
                      ? "Pivoting Commit to GitHub..."
                      : "Repository Synced!"}
                  </span>
                  
                  {gitPushNotification.status === "success" && (
                    <button
                      onClick={() => setGitPushNotification((prev) => ({ ...prev, show: false }))}
                      className="text-neutral-500 hover:text-neutral-350 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-neutral-400 leading-normal">
                  {gitPushNotification.status === "processing" ? (
                    <span>Packaging code artifacts and committing securely encrypted push block...</span>
                  ) : (
                    <span>Pushed changes to <strong>itzgeniusboy/myai-app [{gitPushNotification.branch}]</strong>. Live build restored.</span>
                  )}
                </p>

                {gitPushNotification.status === "success" && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-neutral-500">
                    <span className="rounded bg-neutral-950 border border-neutral-850 px-1.5 py-0.5 text-neutral-400">
                      File: {gitPushNotification.filename}
                    </span>
                    <span className="rounded bg-neutral-950 border border-neutral-850 px-1.5 py-0.5 text-emerald-400 font-bold">
                      {gitPushNotification.sha}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
