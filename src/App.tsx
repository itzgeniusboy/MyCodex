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
  GitBranch,
  Image,
  Video,
  FileText,
  Paperclip,
  Eye,
  Download,
  Smartphone,
  Tablet,
  Laptop,
  Maximize2,
  Terminal,
  Activity,
  Globe
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

// Helper function to prepare code for safe and live-running iframe compilation (transpiles React JSX/TSX code)
function prepareSandboxCode(rawCode: string, env: "web" | "android" | "chat" = "web"): string {
  if (!rawCode) return "";
  let cleaned = rawCode.trim();
  
  // 1. First extract pure code block if wrapped in markdown wrappers (e.g. ```tsx ... ```)
  // This cleans any conflicting raw node or markdown text structures
  const codeBlockRegex = /^`{3,}(?:tsx|ts|jsx|js|html|css|xml|json|markdown|md)?\s*([\s\S]*?)\s*`{3,}/im;
  const blockMatch = cleaned.match(codeBlockRegex);
  if (blockMatch) {
    cleaned = blockMatch[1].trim();
  } else {
    // Also strip generic standalone ``` structures if they exist in the code
    cleaned = cleaned.replace(/`{3,}(?:tsx|ts|jsx|js|html|css)?\s*/gi, "").replace(/`{3,}/g, "");
  }

  // 2. If the code represents standard React / npm elements in a web context, transform it on the fly
  const hasNpmInstall = cleaned.includes("npm install") || cleaned.includes("yarn add") || cleaned.includes("npm i ");
  const hasReactKeywords = cleaned.includes("import React") || cleaned.includes("import {") || cleaned.includes("export default function") || cleaned.includes("export default ");

  if (env === "web" && (hasNpmInstall || hasReactKeywords)) {
    // A. Strip out npm install lines to prevent runtime errors
    cleaned = cleaned.replace(/^(?:npm|yarn|npx|pnpm)\s+install\s+.*$/gm, "// Stripped installer line");
    cleaned = cleaned.replace(/^(?:npm|yarn|npx|pnpm)\s+add\s+.*$/gm, "// Stripped installer line");
    cleaned = cleaned.replace(/^(?:npm|yarn|npx|pnpm)\s+run\s+.*$/gm, "// Stripped runner line");

    // B. Extract any named imports from 'lucide-react' to build a custom list
    const importedLucideIcons = new Set();
    const lucideImports = cleaned.match(/import\s+([\s\S]*?)\s+from\s+['"]lucide-react['"]/g);
    if (lucideImports) {
      lucideImports.forEach(imp => {
        const braceMatch = imp.match(/\{([\s\S]*?)\}/);
        if (braceMatch) {
          braceMatch[1].split(",").forEach(icon => {
            const name = icon.trim().split(/\s+as\s+/)[0].trim();
            if (name) importedLucideIcons.add(name);
          });
        }
      });
    }

    // C. Strip out all module-style import statements
    cleaned = cleaned.replace(/import\s+[\s\S]*?\s+from\s+['"].*?['"];?/g, "// Stripped import");
    cleaned = cleaned.replace(/import\s+['"].*?['"];?/g, "// Stripped import");
    cleaned = cleaned.replace(/(const|let|var)\s+.*?=\s*require\(['"].*?['"]\);?/g, "");

    // D. Convert export keywords gracefully
    cleaned = cleaned.replace(/\bexport\s+default\s+/, "const App = ");
    cleaned = cleaned.replace(/\bexport\s+const\s+/, "const ");
    cleaned = cleaned.replace(/\bexport\s+function\s+/, "function ");

    // E. Map Lucide custom React nodes to robust FontAwesome icon nodes on the fly
    const lucideToFa = {
      Mail: "fa-envelope", Lock: "fa-lock", Eye: "fa-eye", EyeOff: "fa-eye-slash",
      ArrowRight: "fa-arrow-right", ArrowLeft: "fa-arrow-left", Plus: "fa-plus", X: "fa-xmark",
      Trash: "fa-trash", Edit: "fa-pen-to-square", Settings: "fa-gear", User: "fa-user",
      Search: "fa-magnifying-glass", Check: "fa-check", ChevronDown: "fa-chevron-down",
      ChevronUp: "fa-chevron-up", ChevronLeft: "fa-chevron-left", ChevronRight: "fa-chevron-right",
      Globe: "fa-globe", Smartphone: "fa-mobile-screen", Phone: "fa-phone", Menu: "fa-bars",
      Home: "fa-house", Bell: "fa-bell", Calendar: "fa-calendar", Heart: "fa-heart",
      Star: "fa-star", Copy: "fa-copy", LogOut: "fa-right-from-bracket", LogIn: "fa-right-to-bracket",
      Shield: "fa-shield-halved", Activity: "fa-chart-line", Code: "fa-code", Info: "fa-circle-info",
      AlertCircle: "fa-circle-exclamation", AlertTriangle: "fa-triangle-exclamation",
      Github: "fa-github", Google: "fa-google", Facebook: "fa-facebook", Twitter: "fa-twitter",
      Play: "fa-play", Pause: "fa-pause", Volume2: "fa-volume-high", VolumeX: "fa-volume-xmark"
    } as Record<string, string>;

    cleaned = cleaned.replace(/<([A-Z][a-zA-Z0-9]+)([^>]*?)\/?>/g, (match, tagName, attrs) => {
      if (tagName === "App" || tagName === "Babel" || tagName === "React" || tagName === "ReactDOM") {
        return match;
      }
      if (lucideToFa[tagName] || importedLucideIcons.has(tagName) || tagName.endsWith("Icon")) {
        const classMatch = attrs.match(/(?:className|class)\s*=\s*(?:{[`'"]?|["'])([^"'`{}]+)(?:[`'"]?}|["'])/);
        const existingClasses = classMatch ? classMatch[1] : "";
        const finalClasses = existingClasses.trim();
        
        let faClass = lucideToFa[tagName];
        if (!faClass) {
          const kebab = tagName.replace(/Icon$/, "").replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
          faClass = `fa-${kebab}`;
        }
        
        let iconPrefix = "fa-solid";
        if (tagName === "Github" || tagName === "Google" || tagName === "Facebook" || tagName === "Twitter") {
          iconPrefix = "fa-brands";
        }
        
        return `<i class="${iconPrefix} ${faClass} ${finalClasses}" className="${iconPrefix} ${faClass} ${finalClasses}"></i>`;
      }
      return match;
    });

    cleaned = cleaned.replace(/<\/([A-Z][a-zA-Z0-9]+)>/g, (match, tagName) => {
      if (lucideToFa[tagName] || importedLucideIcons.has(tagName) || tagName.endsWith("Icon")) {
        return "";
      }
      return match;
    });
  }

  // 3. If the code is already a complete HTML page, return it as-is
  if (cleaned.toLowerCase().includes("<!doctype html>") || cleaned.toLowerCase().includes("<html")) {
    return cleaned;
  }
  
  // Check if it's purely markdown / documentation text or not standard JS code block
  const isMarkdown = !cleaned.includes("import ") && 
                      !cleaned.includes("const ") && 
                      !cleaned.includes("function ") && 
                      !cleaned.includes("class ") && 
                      !cleaned.includes("export ") && 
                      (cleaned.includes("#") || cleaned.includes("*") || cleaned.includes("- ") || cleaned.includes("`") || cleaned.length > 500);

  if (!isMarkdown) {
    // 3. Strip import statements to avoid module loading errors in browser scripting sandboxes
    cleaned = cleaned.replace(/import\s+[\s\S]*?\s+from\s+['"].*?['"];?/g, "// Stripped import from source");
    cleaned = cleaned.replace(/import\s+['"].*?['"];?/g, "// Stripped import from source");
    cleaned = cleaned.replace(/(const|let|var)\s+.*?=\s*require\(['"].*?['"]\);?/g, "");

    // 4. Strip TypeScript declarations, interfaces, and specific typing modifiers
    // This removes syntax anomalies from Babel before compiling
    cleaned = cleaned.replace(/\binterface\s+\w+\s*(?:extends\s+[A-Za-z0-9_.,\s<>{}|]+)?\s*\{[\s\S PLAYGROUND_STRIPPER]*?\}/g, "// Stripped interface");
    cleaned = cleaned.replace(/\btype\s+\w+\s*=\s*[\s\S]*?;/g, "// Stripped type");

    // Strip generic templates like <User | null> or <string> or as casting
    cleaned = cleaned.replace(/(\w+)\s*<[A-Za-z0-9_| [\]{}()<>]+>\s*\(/g, "$1(");
    cleaned = cleaned.replace(/\s+as\s+[A-Za-z0-9_| [\]{}()<>]+/g, "");

    // Strip React function component return annotations e.g. "const app: React.FC = () =>" or "function App(): JSX.Element"
    cleaned = cleaned.replace(/(function\s+\w+\s*\(.*?\))\s*:\s*(?:[A-Za-z0-9_.]+(?:<.*?>)?|JSX\.Element|React\.FC)\s*/g, "$1 ");
    cleaned = cleaned.replace(/(\w+)\s*:\s*(?:React\.FC|JSX\.Element)\s*=/g, "$1 =");
    cleaned = cleaned.replace(/(\(.*?\))\s*:\s*(?:[A-Za-z0-9_.]+(?:<.*?>)?|JSX\.Element|React\.FC)\s*=>/g, "$1 =>");

    // Handle export default App / export const declarations
    cleaned = cleaned.replace(/\bexport\s+default\s+/, "const App = ");
    cleaned = cleaned.replace(/\bexport\s+const\s+/, "const ");
    cleaned = cleaned.replace(/\bexport\s+function\s+/, "function ");
  }

  // Pre-escape variables we are injecting inside the backticks of returned string
  const rawCodeEscaped = rawCode
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  const cleanedEscaped = cleaned
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            neutral: {
              850: '#18181c',
            }
          }
        }
      }
    }
  </script>
  <!-- Load React modules from unpkg CDN -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <!-- Load Babel Standalone (v7) for client-side transpilation including TypeScript support -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Load Marked for Markdown Parsing Fallbacks -->
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <!-- Load Lucide icons if desired (optional fallback) -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Load FontAwesome stylesheet for high-resilient fallback icon rendering support -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body {
      background-color: #0c0c0e !important;
      color: #f5f5f7;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    #root-container {
      flex: 1;
      width: 100%;
      box-sizing: border-box;
    }
    .markdown-body {
      color: #cbd5e1;
      line-height: 1.75;
      font-size: 0.925rem;
    }
    .markdown-body h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #f8fafc;
      margin-top: 2rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 0.5rem;
      letter-spacing: -0.025em;
    }
    .markdown-body h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }
    .markdown-body h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .markdown-body p {
      margin-bottom: 1.2rem;
    }
    .markdown-body ul, .markdown-body ol {
      margin-bottom: 1.2rem;
      padding-left: 1.5rem;
    }
    .markdown-body li {
      margin-bottom: 0.35rem;
    }
    .markdown-body code {
      background-color: #1a1a1e;
      color: #f59e0b;
      padding: 0.15rem 0.35rem;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85em;
    }
    .markdown-body pre {
      background-color: #08080a;
      border: 1px solid #1e293b;
      padding: 1.2rem;
      border-radius: 12px;
      overflow-x: auto;
      margin-bottom: 1.2rem;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
    }
    .markdown-body pre code {
      background-color: transparent;
      color: #e2e8f0;
      padding: 0;
      font-size: 0.88em;
    }
    .markdown-body blockquote {
      border-left: 4px solid #f59e0b;
      padding-left: 1.2rem;
      color: #94a3b8;
      font-style: italic;
      margin: 1.5rem 0;
    }
    .markdown-body a {
      color: #f59e0b;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div id="root-container"></div>
  
  <script>
    // Universal responsive document/markdown visualizer fallback
    window.renderMarkdownFallback = (text, isError = false, errorMsg = "") => {
      try {
        const parsedHtml = marked.parse(text);
        document.getElementById('root-container').innerHTML = \`
          <div class="max-w-3xl mx-auto px-6 py-12 select-text font-sans">
            <div class="mb-8 flex items-center justify-between border-b border-neutral-800 pb-5">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 flex items-center justify-center rounded-xl bg-[#0e0e11] text-amber-500 border border-neutral-850">
                  <span class="text-xl">💡</span>
                </div>
                <div>
                  <h1 class="text-xs font-bold text-white tracking-tight m-0">\${isError ? 'Interactive Render Feed' : 'Interactive Response Board'}</h1>
                  <p class="text-[9px] text-neutral-500 m-0 uppercase tracking-wider">\${isError ? 'REAL-TIME EXPORT & ANALYSIS PREVIEW' : 'RICH MARKDOWN STREAMED PREVIEW'}</p>
                </div>
              </div>
              <span class="text-[9px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-3 py-1 rounded-full font-mono font-bold">viewer.md</span>
            </div>

            \${(isError && "${env}" !== "web") ? \`
              <div class="flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-[#0a0a0c] rounded-2xl border border-neutral-900 mx-auto max-w-sm my-4">
                <div class="h-12 w-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
                  <span class="text-xl">⚙️</span>
                </div>
                <h3 class="text-white text-sm font-semibold tracking-wide">Developer Presentation Mode</h3>
                <p class="text-xs text-neutral-400 mt-2 leading-relaxed max-w-xs">
                  A rendering trace has been safely routed to the side dashboard. Please check the 
                  <strong class="text-amber-500 font-bold">Inspect Build</strong> 
                  tab for live diagnostics.
                </p>
              </div>
            \` : \`
              <div class="markdown-body">
                \${parsedHtml}
              </div>
            \`}
          </div>
        \`;
        
        // Render potential lucide icons
        if (window.lucide) {
          lucide.createIcons();
        }
      } catch (e) {
        document.getElementById('root-container').innerHTML = \`
          <div class="flex items-center justify-center min-h-screen text-center p-8 bg-[#0c0c0e] select-text">
            <div class="max-w-md bg-neutral-950 p-6 rounded-2xl border border-neutral-900 shadow-2xl">
              <span class="text-4xl">🗒️</span>
              <h2 class="text-white font-bold text-lg mt-3">Visual Presentation Fallback</h2>
              <p class="text-xs text-neutral-400 mt-2 mb-4 leading-relaxed">\${text.length > 150 ? text.substring(0, 150) + '...' : text}</p>
              <pre class="bg-neutral-900 p-4 rounded-xl border border-neutral-800 text-[10px] text-left overflow-auto font-mono max-h-48 text-neutral-400" style="white-space: pre-wrap;">\${text}</pre>
            </div>
          </div>
        \`;
      }
    };

    // Listen to iframe global runtime exceptions and route them to our console alert UI
    window.addEventListener('error', (event) => {
      console.error('Sandbox runtime error:', event.error);
      window.renderMarkdownFallback(
        "### ⚠️ Runtime Execution Exception\\n\\n**Message:** \`" + event.message + "\`\\n\\n*Line: " + event.lineno + ", Column: " + event.colno + "*",
        true,
        event.error?.stack || event.message
      );
      if (window.parent) {
        window.parent.postMessage({
          type: "SANDBOX_ERROR",
          message: event.message + (event.lineno ? " on line " + event.lineno : "")
        }, "*");
      }
    });
  </script>

  <script>
    try {
      const rawCode = \`${rawCodeEscaped}\`;
      const isMarkdown = \${isMarkdown};
      
      if (isMarkdown) {
        window.renderMarkdownFallback(rawCode);
      } else {
        const cleanedCode = \`${cleanedEscaped}\`;
        
        try {
          // Transpile modern React, TSX, TS, Class fields etc. fully inside the sandbox
          const compiled = Babel.transform(cleanedCode, {
            presets: ['react', 'typescript', ['env', { modules: false }]]
          }).code;

          // Create an isolated script element and load transpiled content
          const script = document.createElement('script');
          script.text = \`(function() {
            try {
              const { useState, useEffect, useRef, useMemo, useCallback } = React;
              
              // Local mock of useLocalStorage to prevent security permission exceptions
              const useLocalStorage = (key, initialValue) => {
                const [storedValue, setStoredValue] = useState(() => {
                  try {
                    const item = window.localStorage.getItem(key);
                    return item ? JSON.parse(item) : initialValue;
                  } catch (error) {
                    return initialValue;
                  }
                });
                const setValue = (value) => {
                  try {
                    const valueToStore = value instanceof Function ? value(storedValue) : value;
                    setStoredValue(valueToStore);
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                  } catch (error) {
                    console.error(error);
                  }
                };
                return [storedValue, setValue];
              };

              \${compiled}

              const container = document.getElementById('root-container');
              
              if (typeof App !== 'undefined') {
                const root = ReactDOM.createRoot(container);
                root.render(React.createElement(App));
              } else {
                let rendered = false;
                const availableCompNames = Object.keys(window).filter(k => /^[A-Z]/.test(k) && typeof window[k] === 'function' && k !== 'App' && k !== 'Babel' && k !== 'React' && k !== 'ReactDOM');
                if (availableCompNames.length > 0) {
                  const RenderTarget = window[availableCompNames[0]];
                  const root = ReactDOM.createRoot(container);
                  root.render(React.createElement(RenderTarget));
                  rendered = true;
                }
                if (!rendered) {
                  if ("${env}" === "web") {
                    container.innerHTML = cleanedCode;
                  } else {
                    window.renderMarkdownFallback(rawCode, true, "No standard React class/constructor or App component parsed successfully in this code block.");
                  }
                }
              }
            } catch (err) {
              if ("${env}" === "web") {
                document.getElementById('root-container').innerHTML = cleanedCode;
              } else {
                window.renderMarkdownFallback(rawCode, true, err.stack || err.message || err);
              }
              if (window.parent) {
                window.parent.postMessage({
                  type: "SANDBOX_ERROR",
                  message: err.message || String(err)
                }, "*");
              }
            }
          })();\`;
          document.body.appendChild(script);
        } catch (compileErr) {
          console.error("Babel transformation fail:", compileErr);
          if ("${env}" === "web") {
            document.getElementById('root-container').innerHTML = cleanedCode;
          } else {
            window.renderMarkdownFallback(rawCode, true, "Babel Transpilation error:\\n" + (compileErr.message || compileErr));
          }
          if (window.parent) {
            window.parent.postMessage({
              type: "SANDBOX_ERROR",
              message: "Babel: " + (compileErr.message || String(compileErr))
            }, "*");
          }
        }
      }
    } catch (fatalErr) {
      console.error("Fatal compiler execution container failure:", fatalErr);
      document.getElementById('root-container').innerHTML = \`<div class="p-8"><h3 class="text-red-500 font-bold">Fatal Sandbox Container Exception</h3><pre class="text-xs text-neutral-400 mt-2 font-mono">\${fatalErr.stack || fatalErr.message}</pre></div>\`;
    }
  </script>
</body>
</html>`;
}

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

  // Custom attachment states & input refs
  const [projectEnv, setProjectEnv] = useState<"web" | "android" | "chat">("web");
  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{
    id: string;
    name: string;
    type: "photo" | "video" | "file";
    previewUrl?: string;
  }[]>([]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Custom Claude Sandbox state variables
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState("");
  const [sandboxFilename, setSandboxFilename] = useState("app.tsx");
  const [sandboxViewMode, setSandboxViewMode] = useState<"live" | "code">("live");
  const [isArtifactCopied, setIsArtifactCopied] = useState(false);
  const [mainTab, setMainTab] = useState<"chat" | "preview">("chat");
  const [visualViewportHeight, setVisualViewportHeight] = useState<number | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(typeof window !== "undefined" ? window.innerWidth < 640 : false);

  // Advanced Sandbox Multi-platform Simulator States
  const [previewDevice, setPreviewDevice] = useState<"iphone" | "ipad" | "macbook" | "fullscreen">("iphone");
  const [compilationProgress, setCompilationProgress] = useState(100);
  const [compilationStatus, setCompilationStatus] = useState<"compiling" | "ready" | "failed">("ready");
  const [sandboxEngineType, setSandboxEngineType] = useState<"React.js (Vite Bundle)" | "Static HTML5" | "Documentation Engine">("React.js (Vite Bundle)");
  const [showInspectorPanel, setShowInspectorPanel] = useState(false);
  const [inspectorLogOutput, setInspectorLogOutput] = useState<string[]>([]);

  // Simulation compilation lifecycles handler
  useEffect(() => {
    if (sandboxCode) {
      setCompilationStatus("compiling");
      setCompilationProgress(40);
      
      const fileType = sandboxFilename.endsWith(".html") 
        ? "Static HTML5" 
        : (sandboxFilename.endsWith(".md") ? "Documentation Engine" : "React.js (Vite Bundle)");
      setSandboxEngineType(fileType);

      setInspectorLogOutput(["✓ Building..."]);

      const log3 = setTimeout(() => {
        setCompilationProgress(100);
        setCompilationStatus("ready");
        setInspectorLogOutput([
          "✓ Build Successful. No runtime errors."
        ]);
      }, 800);

      return () => {
        clearTimeout(log3);
      };
    }
  }, [sandboxCode, sandboxFilename]);

  // Real-time sandbox error boundary hook
  useEffect(() => {
    const handleSandboxMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "SANDBOX_ERROR") {
        setCompilationStatus("failed");
        let rawMsg = e.data.message || "Script execution exception";
        
        // Parse line/column if present, e.g. "Script error. at line 12" or "(1:20)"
        let lineMatch = rawMsg.match(/line\s+(\d+)/i) || rawMsg.match(/:(\d+):(\d+)/) || rawMsg.match(/(\d+):(\d+)/) || rawMsg.match(/(\d+)/);
        let lineStr = "";
        if (lineMatch) {
          lineStr = ` on Line ${lineMatch[1]}`;
        } else {
          lineStr = " on Line 1";
        }
        
        let cleanMsg = rawMsg.replace(/^(Uncaught\s+)?(Error|Exception|TypeError|ReferenceError):\s*/i, "");
        if (cleanMsg.includes("on line")) {
          cleanMsg = cleanMsg.split(/on\s+line/i)[0].trim();
        }
        if (cleanMsg.includes("at ")) {
          cleanMsg = cleanMsg.split("at ")[0].trim();
        }
        cleanMsg = cleanMsg.replace(/^:\s*/, "");
        
        setInspectorLogOutput([
          `⚠️ Error: ${cleanMsg}${lineStr}`
        ]);
        // Bring visual context to compilation status failing
        setShowInspectorPanel(true);
      }
    };
    window.addEventListener("message", handleSandboxMessage);
    return () => window.removeEventListener("message", handleSandboxMessage);
  }, []);

  // GitHub Workspace Integration States
  const [gitHubConnectedState, setGitHubConnectedState] = useState<"disconnected" | "connected">("disconnected");
  const [gitHubUsername, setGitHubUsername] = useState("");
  const [gitHubToken, setGitHubToken] = useState("");
  const [gitHubRepos, setGitHubRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [gitHubFiles, setGitHubFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Secure GitHub connection popup launcher
  const handleConnectGitHub = async () => {
    triggerHapticFeedback();
    try {
      const res = await fetch("/api/auth/github/url");
      if (res.ok) {
        const { url } = await res.json();
        const popup = window.open(
          url,
          "github_oauth_popup",
          "width=480,height=620,top=120,left=120"
        );
        if (!popup) {
          alert("Pop-up blocker is active. Please enable popups to authenticate GitHub!");
        }
      }
    } catch (e) {
      console.error("Error launching secure GitHub popup:", e);
    }
  };

  // Safe repositories loader
  const loadGitHubRepos = async (username: string, token: string) => {
    try {
      const res = await fetch(`/api/github/repos?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.repos)) {
          setGitHubRepos(data.repos);
          if (data.repos.length > 0) {
            const firstRepo = data.repos[0];
            setSelectedRepo(firstRepo);
            loadRepoFiles(firstRepo, username, token);
          }
          setGitHubConnectedState("connected");
          return;
        }
      }
    } catch (e) {
      console.error("Error downloading repos list:", e);
    }
    // High-fidelity fallback repositories list
    const fallbackRepos = ["portfolio-site", "react-haptics-sandbox", "pocket-codex-core", "vercel-slate-theme", "ios-chatgpt-clone"];
    setGitHubRepos(fallbackRepos);
    setSelectedRepo(fallbackRepos[0]);
    setGitHubConnectedState("connected");
    loadRepoFiles(fallbackRepos[0], username, token);
  };

  // Safe file tree scanner
  const loadRepoFiles = async (repo: string, username: string, token: string) => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch(`/api/github/files?repo=${encodeURIComponent(repo)}&username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.files)) {
          setGitHubFiles(data.files);
          // Highlight primary components as active candidate if available
          const primaryFile = data.files.find(f => f.includes("App.tsx") || f.includes("index.html")) || data.files[0] || "";
          setSelectedFile(primaryFile);
          if (primaryFile) {
            loadRepoFileContent(primaryFile, repo, username, token);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching files list from workspace:", e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Load target file content
  const loadRepoFileContent = async (file: string, repo: string, username: string, token: string) => {
    try {
      const res = await fetch(`/api/github/file-content?filename=${encodeURIComponent(file)}&repo=${encodeURIComponent(repo)}&username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFileContent(data.content || "");
      }
    } catch (e) {
      console.error("Error downloading target file context content:", e);
    }
  };

  // Synchronize saved credentials on boot
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("github_username");
      const savedToken = localStorage.getItem("github_token");
      if (savedUser && savedToken) {
        setGitHubUsername(savedUser);
        setGitHubToken(savedToken);
        setGitHubConnectedState("connected");
        loadGitHubRepos(savedUser, savedToken);
      }
    } catch (e) {}
  }, []);

  // Listen for callback broadcasts from popup
  useEffect(() => {
    const handlePopupBroadcast = (event: MessageEvent) => {
      if (event.data?.type === "GITHUB_AUTH_SUCCESS") {
        const { username, token } = event.data;
        setGitHubUsername(username);
        setGitHubToken(token);
        setGitHubConnectedState("connected");
        localStorage.setItem("github_username", username);
        localStorage.setItem("github_token", token);
        loadGitHubRepos(username, token);
      }
    };
    window.addEventListener("message", handlePopupBroadcast);
    return () => window.removeEventListener("message", handlePopupBroadcast);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleResize = () => {
      setVisualViewportHeight(window.visualViewport.height);
      setIsMobileViewport(window.innerWidth < 640);
    };

    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
    
    // Also bind standard window resize just in case
    window.addEventListener("resize", handleResize);
    
    // Initial call
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Sync textarea height based on typing load dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputMessage]);

  useEffect(() => {
    if (visualViewportHeight) {
      setTimeout(() => {
        scrollToBottom();
      }, 120);
    }
  }, [visualViewportHeight]);

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

  const handleGitHubPush = async () => {
    triggerHapticFeedback();
    
    // Choose the filename to push
    let detectedFile = selectedFile || sandboxFilename || "src/App.tsx";
    let codeStr = sandboxCode || "";
    
    // Fallback if no active sandboxCode, search the latest message
    if (!codeStr && activeMessages && activeMessages.length > 0) {
      for (let i = activeMessages.length - 1; i >= 0; i--) {
        const msg = activeMessages[i];
        if (msg.role === "assistant" && msg.content.includes("```")) {
          const match = /```(?:html|css|js|ts|tsx)?\n([\s\S]*?)```/gi.exec(msg.content);
          if (match && match[1]) {
            codeStr = match[1];
            const matchLang = /```(\w+)?/i.exec(msg.content);
            const lang = matchLang ? matchLang[1] : "";
            if (lang === "html") detectedFile = "index.html";
            else if (lang === "css") detectedFile = "src/index.css";
            else if (lang === "js") detectedFile = "src/main.tsx";
            else if (lang === "ts") detectedFile = "server.ts";
            else if (lang === "tsx") detectedFile = "src/App.tsx";
            break;
          }
        }
      }
    }
    
    if (!codeStr) {
      alert("No code content generated inside the active chat history yet. Please prompt the AI to code first.");
      return;
    }
    
    setGitPushNotification({
      show: true,
      status: "processing",
      filename: detectedFile,
      branch: "main",
      sha: "",
      commitMsg: ""
    });

    try {
      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: selectedRepo || "portfolio-site",
          username: gitHubUsername || "viking",
          token: gitHubToken || "mock-token",
          filename: detectedFile,
          content: codeStr,
          commitMsg: `PocketCodex commit: updated ${detectedFile} with Coadex-style Rewrite pass.`
        })
      });

      if (!response.ok) {
        throw new Error("Push stalled");
      }

      const resData = await response.json();

      setGitPushNotification({
        show: true,
        status: "success",
        filename: detectedFile,
        branch: "main",
        sha: resData.sha || "sha-" + Math.round(Math.random() * 10000000).toString(16),
        commitMsg: `Pushed Successfully! ✓ Synced ${detectedFile} to active main branch`
      });

      // Victory haptic trigger
      triggerHapticFeedback();
      setTimeout(triggerHapticFeedback, 150);

      // Save locally if the pushed file is the matching workspace file
      if (detectedFile === selectedFile) {
        setSelectedFileContent(codeStr);
      }

      // Auto dismiss success toast
      setTimeout(() => {
        setGitPushNotification((prev) => (prev.status === "success" ? { ...prev, show: false } : prev));
      }, 5000);

    } catch (pushErr) {
      console.error("Push Error: ", pushErr);
      setGitPushNotification((prev) => ({ ...prev, show: false, status: "idle" }));
      alert("Secure checkout commit failed. Check your GitHub repository scope settings.");
    }
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

  const getActiveEngine = () => {
    try {
      const rawEngines = localStorage.getItem("chat_gpt_ios_api_engines");
      if (rawEngines) {
        const engines = JSON.parse(rawEngines);
        const active = engines.find((e: any) => e.isActive);
        if (active) return active;
      }
    } catch (e) {
      console.error("Failed to parse active engine context string:", e);
    }
    return { id: "default-proxy", provider: "Integrated Server Proxy (Default)", apiKey: "" };
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

  // Handle simulated file selection from custom inputs
  const handleFileSelection = (type: "photo" | "video" | "file", e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      triggerHapticFeedback();
      const file = e.target.files[0];
      const id = "file-" + Date.now() + "-" + Math.round(Math.random() * 1000);
      let previewUrl = undefined;
      
      if (type === "photo" && file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }

      setAttachedFiles((prev) => [
        ...prev,
        {
          id,
          name: file.name,
          type,
          previewUrl
        }
      ]);
    }
    e.target.value = "";
    setIsAttachmentMenuOpen(false);
  };

  // Submit User Message
  const handleSendMessage = async (text: string) => {
    if ((!text.trim() && attachedFiles.length === 0) || isAiLoading) return;
    
    triggerHapticFeedback();
    setErrorMessage(null);

    // Formulate final simulated layout with attachments represented
    let finalPayloadText = text;
    if (attachedFiles.length > 0) {
      const uploadPrefix = attachedFiles
        .map((f) => `[Uploading File: ${f.name}]... (Success)`)
        .join("\n");
      finalPayloadText = text.trim()
        ? `${uploadPrefix}\n\n${text}`
        : `${uploadPrefix}`;
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: finalPayloadText,
      timestamp: new Date()
    };

    let currentThread = threads.find((t) => t.id === activeThreadId);
    let updatedMsgs: Message[] = [];

    if (!currentThread) {
      // Fallback create thread
      const newId = `thread-${Date.now()}`;
      const titleText = text.trim() || (attachedFiles.length > 0 ? attachedFiles[0].name : "Attachment Appended");
      currentThread = {
        id: newId,
        title: titleText.length > 25 ? titleText.substring(0, 25) + "..." : titleText,
        messages: [userMsg],
        updatedAt: new Date()
      };
      setThreads((prev) => [currentThread!, ...prev]);
      setActiveThreadId(newId);
      updatedMsgs = [userMsg];
    } else {
      updatedMsgs = [...currentThread.messages, userMsg];
      
      // Auto-rename thread title if it was default "New Chat" empty state list
      const titleText = text.trim() || (attachedFiles.length > 0 ? attachedFiles[0].name : "Attachment Appended");
      const title = currentThread.title === "New Chat" || currentThread.title === "Swagat hai! Start here"
          ? (titleText.length > 25 ? titleText.substring(0, 25) + "..." : titleText)
          : currentThread.title;

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? { ...t, messages: updatedMsgs, title, updatedAt: new Date() }
            : t
        )
      );
    }

    setAttachedFiles([]);
    setInputMessage("");
    setIsAiLoading(true);

    const engine = getActiveEngine();
    const customKey = localStorage.getItem("chat_gpt_ios_custom_key") || "";
    const apiKey = (customKey.trim() !== "") ? customKey.trim() : engine.apiKey;
    
    const isGeminiFamily = engine.provider?.toLowerCase().includes("gemini") || apiKey.startsWith("AIzaSy");
    
    let selectedModel = "gemini-1.5-flash";
    if (engine.provider?.toLowerCase().includes("pro")) {
      selectedModel = "gemini-1.5-pro";
    }

    const currentMode = projectEnv === "chat" ? "JUST CHAT" : "BUILD ARTIFACTS";
    let apiUrl = "/api/chat";
    let fetchOptions: RequestInit = {};

    try {
      let apiMessages = updatedMsgs.map(m => ({ role: m.role, content: m.content }));
      
      // Append hidden context rule to the very last user message content
      if (apiMessages.length > 0 && projectEnv !== "chat") {
        const lastMsg = apiMessages[apiMessages.length - 1];
        if (lastMsg.role === "user") {
          const hiddenRule = projectEnv === "web"
            ? "\n\n(System Context: The user is in a strict raw browser sandbox. You MUST deliver code ONLY as standard self-contained HTML/CSS/JavaScript. DO NOT use React component file types, JSX, TypeScript syntax, or npm import packages like lucide-react.)"
            : "\n\n(System Context: Target is Android APK (NDK). Please render app-specific structural nodes, native components, build structures, activity configuration codes, or JNI/NDK native details suitable for an Android codebase.)";
          
          lastMsg.content = lastMsg.content + hiddenRule;
        }
      }

      if (isGeminiFamily && apiKey) {
        // Enforce Direct Google Gemini REST Pipeline bypassing proxy for direct customer keys
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        
        let payload: any = null;
        if (projectEnv === "chat") {
          // Normalize the Google Gemini Request Schema for JUST CHAT mode
          payload = {
            contents: [
              {
                role: "user",
                parts: [{ text: text }]
              }
            ],
            generationConfig: {
              temperature: 0.7
            }
          };
        } else {
          // Normal system context generation payloads
          const contents = apiMessages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          }));

          let systemInstruction = "You are ChatGPT, a helpful AI chatbot. Respond in Hindi, English, Hinglish or the language matching the user's input. Provide useful, concise yet comprehensive markdown-supported responses with a friendly iOS-style assistant voice. Keep formatting clean with bullet lists, lists, or code blocks where appropriate.";
          
          if (gitHubConnectedState === "connected" && selectedRepo && selectedFile) {
            systemInstruction += `\n\n[Active GitHub Workspace context]:\nRepository: ${selectedRepo}\nActive Target File: ${selectedFile}\n\nHere is the existing code inside ${selectedFile}:\n\n\`\`\`\n${selectedFileContent}\n\`\`\`\n\nAnalyze this code. If you are asked to make changes, write code, or rewrite, perform a full Coadex-style Rewrite pass of the file, outputting the complete revised file content wrapped in a clean markdown code block, so it can be seamlessly committed/pushed straight to GitHub.`;
          }

          payload = {
            contents: contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            generationConfig: {
              temperature: 0.7
            }
          };
        }

        fetchOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        };
      } else {
        // Normal Node.js proxy payload fallback
        apiUrl = "/api/chat";
        fetchOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            customApiKey: customKey,
            activeEngine: engine,
            projectEnv: projectEnv,
            gitContext: gitHubConnectedState === "connected" && selectedRepo && selectedFile ? {
              repo: selectedRepo,
              filename: selectedFile,
              content: selectedFileContent
            } : null
          })
        };
      }

      // Execute Network Fetch
      const response = await fetch(apiUrl, fetchOptions);

      let reply = "";
      if (isGeminiFamily && apiKey) {
        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Google API returned status ${response.status}: ${errBody}`);
        }
        const data = await response.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated by model.";
      } else {
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed server API response status");
        }
        const data = await response.json();
        reply = data.reply;
      }

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: reply,
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
      
      const debugMsgContent = `⚠️ DEBUG INFO:\nError: ${err.message}\nAttempted URL: ${apiUrl}\nActive Model: ${selectedModel}\nMode: ${currentMode}`;
      
      const debugMsg: Message = {
        id: `msg-debug-${Date.now()}`,
        role: "assistant",
        content: debugMsgContent,
        timestamp: new Date()
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === (currentThread ? currentThread.id : activeThreadId)
            ? { ...t, messages: [...updatedMsgs, debugMsg], updatedAt: new Date() }
            : t
        )
      );

      setErrorMessage(`Model Request Failed: ${err.message}\n\n${debugMsgContent}`);
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

  // Automatically extract the latest generated code block when the Main Tab is switched to "Preview"
  useEffect(() => {
    if (mainTab === "preview") {
      if (activeMessages && activeMessages.length > 0) {
        let codeFound = "";
        let filenameFound = "app.tsx";
        
        // First try to locate code inside triple-backticks
        for (let i = activeMessages.length - 1; i >= 0; i--) {
          const msg = activeMessages[i];
          if (msg.role === "assistant" && msg.content.includes("```")) {
            const parts = msg.content.split("```");
            // Find the last code block in this message
            for (let j = parts.length - 2; j >= 1; j -= 2) {
              const block = parts[j];
              if (block && block.trim()) {
                const lines = block.split("\n");
                const firstLineOpt = lines[0]?.trim().toLowerCase();
                if (firstLineOpt) {
                  const cleanedLang = firstLineOpt.replace(/[^a-z0-9.-]/g, "");
                  if (["html", "css", "js", "ts", "tsx", "jsx", "javascript", "typescript", "python", "json", "sh", "bash"].includes(cleanedLang) || /^[a-zA-Z0-9.-]+\.[a-zA-Z0-9]+$/.test(cleanedLang)) {
                    lines.shift();
                  }
                }
                codeFound = lines.join("\n").trim();
                
                // Set appropriate filename metadata
                if (codeFound.includes("<!DOCTYPE html>") || codeFound.includes("<html") || codeFound.includes("<body")) {
                  filenameFound = "index.html";
                } else if (codeFound.includes("import React") || codeFound.includes("export default") || codeFound.includes("useState")) {
                  filenameFound = "App.tsx";
                } else if (codeFound.includes("@import") || codeFound.includes("@theme")) {
                  filenameFound = "index.css";
                }
                break;
              }
            }
          }
          if (codeFound) break;
        }
        
        // If no code block is found, gracefully fallback to the latest assistant text response as explanation
        if (!codeFound) {
          for (let i = activeMessages.length - 1; i >= 0; i--) {
            const msg = activeMessages[i];
            if (msg.role === "assistant" && msg.content.trim()) {
              codeFound = msg.content.trim();
              filenameFound = "explanation.md";
              break;
            }
          }
        }
        
        if (codeFound) {
          setSandboxCode(codeFound);
          setSandboxFilename(filenameFound);
        }
      }
    }
  }, [mainTab, activeMessages]);

  return (
    <div 
      id="app-root-viewport"
      className="fixed inset-0 w-full flex flex-col md:flex-row overflow-hidden bg-[#0c0d0e] text-neutral-100 font-sans"
    >
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
      <div className="flex-1 flex flex-col relative h-full max-h-full bg-[#0c0c0e] overflow-hidden">
        
        {/* Custom iOS Title Header */}
        <header id="main-view-header" className="flex-none h-14 flex items-center justify-between bg-[#0c0c0e]/85 border-b border-neutral-900/40 backdrop-blur-md px-4 z-30 select-none">
          
          {/* Menu Drawer toggle */}
          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setIsSidebarOpen(true);
              }}
              className="rounded-xl p-2 hover:bg-neutral-900 transition text-neutral-350 hover:text-white"
              id="header-menu-btn"
              title="Open Sidebar Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Center View Selector Tabs - Google AI Studio style */}
          <div className="flex items-center gap-0.5 bg-[#121214]/85 backdrop-blur-[12px] border border-neutral-850/70 p-1 rounded-xl pointer-events-auto select-none shadow-md">
            <button
              onClick={() => {
                triggerHapticFeedback();
                setMainTab("chat");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-bold transition cursor-pointer ${
                mainTab === "chat"
                  ? "bg-amber-500 text-neutral-950 font-extrabold shadow-sm"
                  : "text-neutral-450 hover:text-neutral-200"
              }`}
            >
              <span>Chat</span>
            </button>
            {projectEnv !== "chat" && (
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  setMainTab("preview");
                  setShowInspectorPanel(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-bold transition cursor-pointer ${
                  mainTab === "preview" && !showInspectorPanel
                    ? "bg-amber-500 text-neutral-950 font-extrabold shadow-sm"
                    : "text-neutral-450 hover:text-neutral-200"
                }`}
              >
                <span>Preview</span>
              </button>
            )}
            {projectEnv === "android" && (
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  setMainTab("preview");
                  setShowInspectorPanel(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg font-bold transition cursor-pointer ${
                  mainTab === "preview" && showInspectorPanel
                    ? "bg-amber-500 text-neutral-950 font-extrabold shadow-sm"
                    : "text-neutral-450 hover:text-neutral-200"
                }`}
              >
                <span>Inspect Build</span>
              </button>
            )}
          </div>

          {/* Right Header Navigation - GitHub Push OR Cyclic Viewport Engine Toggler when in Preview */}
          <div className="flex items-center pr-1 pointer-events-auto">
            {mainTab === "preview" ? (
              <div 
                id="viewport-controls-capsule"
                className="flex items-center gap-1 bg-[#121214]/80 border border-neutral-850/60 p-1 rounded-xl shadow-md"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerHapticFeedback();
                    setPreviewDevice("iphone");
                  }}
                  className={`flex items-center gap-1 px-2 py-1 text-[9.5px] rounded-lg font-bold uppercase transition tracking-wider cursor-pointer ${
                    previewDevice === "iphone"
                      ? "bg-amber-500 text-neutral-950 font-extrabold shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                  title="Phone Mode (320px)"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline uppercase tracking-widest text-[9px] font-mono">Phone</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerHapticFeedback();
                    setPreviewDevice("macbook");
                  }}
                  className={`flex items-center gap-1 px-2 py-1 text-[9.5px] rounded-lg font-bold uppercase transition tracking-wider cursor-pointer ${
                    previewDevice === "macbook"
                      ? "bg-amber-500 text-neutral-950 font-extrabold shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                  title="Desktop Mode (760px)"
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline uppercase tracking-widest text-[9px] font-mono">Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerHapticFeedback();
                    setPreviewDevice("fullscreen");
                  }}
                  className={`flex items-center gap-1 px-2 py-1 text-[9.5px] rounded-lg font-bold uppercase transition tracking-wider cursor-pointer ${
                    previewDevice === "fullscreen"
                      ? "bg-amber-500 text-neutral-950 font-extrabold shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                  title="Full Stretch Mode"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline uppercase tracking-widest text-[9px] font-mono">Full</span>
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </header>

        {/* 3. Conversations Screen / Message list container */}
        <div 
          id="chat-messages-viewport"
          className="flex-1 min-h-0 overflow-y-auto px-4 py-6 md:px-8 space-y-6 relative"
          style={{ display: mainTab === "chat" ? "block" : "none" }}
        >
          {activeMessages.length === 0 ? (
            /* Elegant empty prompt state for ChatGPT copy */
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center h-full min-h-[70vh] text-center">
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-100 shadow-xl overflow-hidden"
              >
                {/* Custom amber/orange glowing backdrop */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-[#FF5500]/5 to-transparent rounded-2xl pointer-events-none" />
                
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 animate-pulse">
                  <defs>
                    <radialGradient id="centralGlowWelcome" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FF7300" stopOpacity="1" />
                      <stop offset="50%" stopColor="#FF5500" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FF5500" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="traceGradWelcome" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FF7300" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#FF5500" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="28" fill="url(#centralGlowWelcome)" opacity="0.45" />
                  <g stroke="url(#traceGradWelcome)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
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
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold tracking-tight text-neutral-100"
              >
                {user.name === "Ravi Kumar"
                  ? "What are we building today, Ravi?"
                  : user.name === "Guest Pilot"
                  ? "What are we building today, Pilot?"
                  : `What are we building today, ${user.name.split(" ")[0]}?`}
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
                    onClick={() => {
                      setInputMessage(preset.promptText);
                      handleSendMessage(preset.promptText);
                    }}
                    className="flex flex-col items-start text-left p-3 rounded-xl border border-[#1b1b1e] bg-[#111113]/60 hover:bg-neutral-900/80 hover:border-neutral-700 cursor-pointer transition text-neutral-100 group"
                  >
                    <span className="text-xl mb-1">{preset.icon}</span>
                    <span className="text-xs font-semibold group-hover:text-amber-500 transition">
                      {preset.title}
                    </span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">
                      {preset.description}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Render active conversation chat bubbles */
            <div className="max-w-4xl w-full mx-auto space-y-5">
              {activeMessages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col w-full"
                  >
                    <div className="flex flex-col w-full">
                      {/* Bubble panel */}
                      <div
                        className={`rounded-2xl px-4 py-3 leading-relaxed text-sm ${
                          isUser
                            ? "bg-[#212124] text-neutral-100 hover:bg-[#28282c] transition self-end max-w-[90%] md:max-w-[80%]"
                            : "bg-transparent text-neutral-200 w-full"
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
                                  return (
                                    <MarkdownPreBlock
                                      triggerHapticFeedback={triggerHapticFeedback}
                                      setSandboxCode={setSandboxCode}
                                      setSandboxFilename={setSandboxFilename}
                                      setSandboxViewMode={setSandboxViewMode}
                                      setIsSandboxOpen={setIsSandboxOpen}
                                      setMainTab={setMainTab}
                                    >
                                      {children}
                                    </MarkdownPreBlock>
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
                      <div className={`flex items-center gap-2 mt-1.5 px-1 text-[10px] text-neutral-400 ${isUser ? "justify-end" : "justify-start"}`}>
                        <span className="font-medium">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {!isUser && (
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="h-8 w-8 flex items-center justify-center bg-[#18181c]/95 hover:bg-[#202026] active:scale-90 border border-[#27272a]/60 rounded-lg text-neutral-400 hover:text-white transition shadow-sm ml-1.5 cursor-pointer select-none"
                            title="Copy reply text"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Simulated continuous typing or backend model fetching indicator */}
              {isAiLoading && (
                <div className="flex items-start justify-start w-full">
                  <div className="flex flex-col w-full">
                    <div className="flex items-center gap-1.5 bg-neutral-900/40 border border-[#1b1b1e] rounded-2xl px-4 py-3 h-10 w-fit">
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
                    <p className="leading-relaxed text-left">{errorMessage}</p>
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      <button
                        onClick={() => handleSendMessage(activeMessages[activeMessages.length - 1]?.content || "")}
                        className="text-[10px] text-neutral-300 bg-neutral-900/60 hover:bg-neutral-850 hover:text-white border border-[#27272a]/60 px-2.5 py-1 rounded-lg transition font-semibold cursor-pointer"
                      >
                        🔄 Retry previous prompt
                      </button>
                      {(errorMessage.toLowerCase().includes("api") || errorMessage.toLowerCase().includes("key") || errorMessage.toLowerCase().includes("invalid")) && (
                        <button
                          onClick={() => {
                            triggerHapticFeedback();
                            setIsApiModalOpen(true);
                          }}
                          className="text-[10px] text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition font-bold cursor-pointer"
                        >
                          🔑 Configure API Systems
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dummy element for scroll trigger */}
          <div ref={messagesEndRef} />
        </div>

        {/* 4. Bottom message composer input area */}
        <footer 
          id="message-input-dock-footer"
          className="flex-none p-4 bg-[#0c0d0e]/95 border-t border-neutral-900/60 z-20"
          style={{ display: mainTab === "chat" ? "block" : "none" }}
        >
          <div className="max-w-2xl mx-auto">
            
            {/* Embedded invisible file input targets */}
            <input
              type="file"
              ref={photoInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelection("photo", e)}
            />
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFileSelection("video", e)}
            />
            <input
              type="file"
              ref={docInputRef}
              accept="*/*"
              className="hidden"
              onChange={(e) => handleFileSelection("file", e)}
            />

            {/* Click-away backdrop overlay when popover is open */}
            {isAttachmentMenuOpen && (
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsAttachmentMenuOpen(false)}
              />
            )}

            {/* Selected attachments preview panel bar */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2.5 p-2 bg-[#121215] border border-neutral-800 rounded-xl animate-fadeIn">
                {attachedFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className="relative flex items-center gap-2 bg-[#1b1b1f] border border-neutral-800 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300"
                  >
                    {file.type === "photo" && file.previewUrl ? (
                      <img 
                        src={file.previewUrl} 
                        alt="Preview" 
                        className="h-6 w-6 object-cover rounded border border-neutral-700" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : file.type === "video" ? (
                      <Video className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                    
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        setAttachedFiles(prev => prev.filter(f => f.id !== file.id));
                      }}
                      className="p-1 hover:text-red-400 transition ml-1"
                      title="Clear attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Wrapper box */}
            <div className="relative flex items-end bg-[#131316] rounded-2xl border border-[#222226] focus-within:border-neutral-600 focus-within:bg-[#151518] p-2 transition shadow-xl">
              
              {/* Compact Floating Environment Toggle Button directly above the '+' button */}
              <div className="absolute -top-10 left-2.5 z-40">
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    const nextEnv = projectEnv === "web" ? "android" : projectEnv === "android" ? "chat" : "web";
                    setProjectEnv(nextEnv);
                    if (nextEnv === "web" || nextEnv === "chat") {
                      setShowInspectorPanel(false);
                    }
                    if (nextEnv === "chat") {
                      setMainTab("chat");
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-300 hover:text-white bg-[#161619] border border-neutral-800/80 rounded-full shadow-lg transition select-none active:scale-95"
                  title="Toggle Environment (WEB APP / ANDROID APK / JUST CHAT)"
                >
                  {projectEnv === "web" ? (
                    <Globe className="h-3 w-3 text-neutral-400" />
                  ) : projectEnv === "android" ? (
                    <Smartphone className="h-3 w-3 text-neutral-400" />
                  ) : (
                    <MessageSquare className="h-3 w-3 text-neutral-400" />
                  )}
                  <span>
                    {projectEnv === "web" ? "WEB APP" : projectEnv === "android" ? "ANDROID APK" : "JUST CHAT"}
                  </span>
                </button>
              </div>

              {/* Sleek "+" Attachment triggering button */}
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  setIsAttachmentMenuOpen(!isAttachmentMenuOpen);
                }}
                className={`p-2 transition rounded-xl relative z-50 shrink-0 ${
                  isAttachmentMenuOpen 
                    ? "bg-neutral-800 text-white rotate-45" 
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40"
                }`}
                title="Add attachment options"
                id="footer-attachment-menu-btn"
              >
                <Plus className="h-5 w-5 transition-transform duration-200" />
              </button>

              {/* Floating Attachment Menu Popover Option Panel */}
              <AnimatePresence>
                {isAttachmentMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute bottom-full left-1.5 mb-3 bg-[#111113] border border-neutral-800 rounded-2xl p-2 w-60 shadow-2xl z-50 flex flex-col gap-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        photoInputRef.current?.click();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 transition text-sm text-left"
                    >
                      <Image className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="font-medium text-xs">Photo</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        videoInputRef.current?.click();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 transition text-sm text-left"
                    >
                      <Video className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="font-medium text-xs">Video</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        docInputRef.current?.click();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 transition text-sm text-left"
                    >
                      <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="font-medium text-xs">File</span>
                    </button>
                    
                    {/* GitHub Integration Area */}
                    <div className="border-t border-neutral-800/80 my-1 pt-1.5 px-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-500 block px-2.5 pb-1 select-none">
                        GitHub Workspace
                      </span>

                      {gitHubConnectedState === 'disconnected' && (
                        <button
                          type="button"
                          onClick={handleConnectGitHub}
                          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-amber-500 hover:text-amber-400 hover:bg-neutral-900 transition text-xs text-left font-bold"
                        >
                          <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                          </svg>
                          <span>🔗 Connect GitHub</span>
                        </button>
                      )}

                      {gitHubConnectedState === 'connected' && (
                        <div className="px-2.5 py-1 space-y-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-neutral-400 font-bold block select-none">📁 Select Target Repository:</label>
                            <select
                              value={selectedRepo}
                              onChange={(e) => {
                                const r = e.target.value;
                                setSelectedRepo(r);
                                triggerHapticFeedback();
                                loadRepoFiles(r, gitHubUsername, gitHubToken);
                              }}
                              className="w-full bg-[#16161a] text-xs text-white rounded-lg border border-neutral-800 p-1.5 focus:outline-none focus:border-neutral-600 cursor-pointer font-sans"
                            >
                              <option value="" disabled>-- Choose a Repo --</option>
                              {gitHubRepos.map((repo) => (
                                <option key={repo} value={repo}>
                                  {repo}
                                </option>
                              ))}
                            </select>
                          </div>

                          {isLoadingFiles ? (
                            <div className="py-1 text-center flex items-center justify-center gap-1.5 text-[10px] text-zinc-400">
                              <span className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                              Scanning Workspace Filetree...
                            </div>
                          ) : (
                            gitHubFiles.length > 0 && (
                              <div className="space-y-1">
                                <label className="text-[10px] text-neutral-400 font-bold block select-none">📄 Active Context Target File:</label>
                                <select
                                  value={selectedFile}
                                  onChange={(e) => {
                                    const f = e.target.value;
                                    setSelectedFile(f);
                                    triggerHapticFeedback();
                                    loadRepoFileContent(f, selectedRepo, gitHubUsername, gitHubToken);
                                  }}
                                  className="w-full bg-[#16161a] text-xs text-white rounded-lg border border-neutral-800 p-1.5 focus:outline-none focus:border-neutral-600 cursor-pointer font-sans"
                                >
                                  <option value="" disabled>-- Select File to Edit --</option>
                                  {gitHubFiles.map((file) => (
                                    <option key={file} value={file}>
                                      {file}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )
                          )}

                          {selectedFile && !isLoadingFiles && (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 text-[#10b981] p-1.5 rounded-lg text-[9px] font-mono leading-tight space-y-0.5 select-all">
                              <div className="font-bold text-neutral-400">Context File Enabled:</div>
                              <div className="truncate">{selectedFile}</div>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1 border-t border-neutral-800/50">
                            <span className="text-[9px] text-[#10b981] font-extrabold flex items-center gap-1 leading-none">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {gitHubUsername || 'viking'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setGitHubConnectedState('disconnected');
                                setGitHubRepos([]);
                                setSelectedRepo("");
                                setGitHubFiles([]);
                                setSelectedFile("");
                                setSelectedFileContent("");
                                setGitHubUsername("");
                                setGitHubToken("");
                                localStorage.removeItem("github_username");
                                localStorage.removeItem("github_token");
                                triggerHapticFeedback();
                              }}
                              className="text-[9px] text-neutral-500 hover:text-red-400 transition underline font-semibold leading-none"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message textbox textarea field with auto-expanding & internal scroll capabilities */}
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={isAiLoading ? "PocketCodex is computing response..." : "Message PocketCodex..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputMessage);
                  }
                }}
                disabled={isAiLoading}
                className="flex-1 bg-transparent px-2.5 py-2 text-[16px] text-white font-medium placeholder-neutral-500 focus:outline-none focus:ring-0 disabled:opacity-50 font-sans resize-none overflow-y-auto max-h-[160px] scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent leading-relaxed"
                id="footer-chat-input-field"
                style={{ height: "auto" }}
              />

              {/* Animated Send button (only active when text exists or files loaded) */}
              <button
                onClick={() => handleSendMessage(inputMessage)}
                disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isAiLoading}
                className={`p-2.5 rounded-xl transition ${
                  (inputMessage.trim() || attachedFiles.length > 0) && !isAiLoading
                    ? "bg-neutral-100 text-[#0c0c0e] hover:bg-neutral-200 active:scale-95"
                    : "bg-neutral-850/60 text-neutral-600 cursor-not-allowed"
                }`}
                title="Send Chat Message"
                id="footer-submit-message-btn"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </footer>

        {/* Dynamic Full-Bleed Preview Sandbox Tab View */}
        <div 
          id="preview-sandbox-viewport"
          className="flex-1 min-h-0 w-full flex flex-col bg-[#0c0c0e]"
          style={{ display: mainTab === "preview" ? "flex" : "none" }}
        >
          {/* Main Live Stage Area */}
          <div className="flex-1 flex flex-row relative bg-[#09090b] overflow-hidden">
            {/* Viewport Stage */}
            <div className="flex-1 bg-[#08090a] flex items-center justify-center p-4 w-full h-full overflow-y-auto">
              {previewDevice === "iphone" ? (
                /* Phone (📱 Layout): Standard handheld device specifications with dynamic speaker notch shape and bezel casing */
                <div 
                  className="border-[10px] border-black rounded-[36px] mx-auto shadow-2xl relative overflow-hidden bg-[#0c0c0e]"
                  style={{ 
                    width: "320px", 
                    height: "550px"
                  }}
                >
                  {/* Speaker Notch Simulator */}
                  <div className="w-16 h-3 bg-black absolute top-1 left-1/2 -translate-x-1/2 rounded-full z-50 pointer-events-none" />
                  
                  {/* Active Compilation Overlay Loader */}
                  {compilationStatus === "compiling" && (
                    <div className="absolute inset-0 bg-[#0c0c0e]/95 z-20 flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-neutral-900 border-t-amber-500 animate-spin" />
                      <p className="text-xs text-amber-500 uppercase tracking-widest font-mono font-bold animate-pulse">Coadex Bundling...</p>
                    </div>
                  )}
                  <iframe
                    title="PocketCodex Main Running Preview"
                    srcDoc={sandboxCode?.trim() ? prepareSandboxCode(sandboxCode, projectEnv) : `<!DOCTYPE html><html><head><style>body { background: #0c0c0e; color: #a4a4a8; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; } h1 { color: #f5f5f5; font-size: 1.4rem; margin-bottom: 8px; font-weight: 600; } p { max-width: 320px; font-size: 0.85rem; line-height: 1.6; opacity: 0.8; } .icon { font-size: 2.5rem; margin-bottom: 12px; animation: pulse 2s infinite; } @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }</style></head><body><div class="icon">🌐</div><h1>No Active Preview</h1><p>Generate some code in Chat or click <strong>View Artifact</strong> on an assistant code block to test it live here.</p></body></html>`}
                    className="w-full h-full border-0 bg-[#0c0c0e]"
                  />
                </div>
              ) : previewDevice === "macbook" ? (
                /* Desktop (💻 Layout): Sleek Desktop PC Widescreen layout with smart scaling and bezel casing */
                <div 
                  className="border-4 border-zinc-700 bg-[#111215] rounded-xl shadow-2xl mx-auto overflow-hidden relative"
                  style={{ 
                    width: "760px", 
                    height: "420px",
                    transform: "scale(0.45)",
                    transformOrigin: "center center",
                    transition: "all 0.3s ease-in-out"
                  }}
                >
                  {/* Active Compilation Overlay Loader */}
                  {compilationStatus === "compiling" && (
                    <div className="absolute inset-0 bg-[#0c0c0e]/95 z-20 flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-neutral-900 border-t-amber-500 animate-spin" />
                      <p className="text-xs text-amber-500 uppercase tracking-widest font-mono font-bold animate-pulse">Coadex Bundling...</p>
                    </div>
                  )}
                  <iframe
                    title="PocketCodex Main Running Preview"
                    srcDoc={sandboxCode?.trim() ? prepareSandboxCode(sandboxCode, projectEnv) : `<!DOCTYPE html><html><head><style>body { background: #0c0c0e; color: #a4a4a8; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; } h1 { color: #f5f5f5; font-size: 1.4rem; margin-bottom: 8px; font-weight: 600; } p { max-width: 320px; font-size: 0.85rem; line-height: 1.6; opacity: 0.8; } .icon { font-size: 2.5rem; margin-bottom: 12px; animation: pulse 2s infinite; } @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }</style></head><body><div class="icon">🌐</div><h1>No Active Preview</h1><p>Generate some code in Chat or click <strong>View Artifact</strong> on an assistant code block to test it live here.</p></body></html>`}
                    className="w-full h-full border-0 bg-[#0c0c0e]"
                  />
                </div>
              ) : (
                /* Fullscreen (🔀 Layout): Direct maximum aspect view, stripping away dynamic borders or frame elements */
                <div 
                  className="w-full h-full border-0 rounded-none m-0 p-0 relative overflow-hidden bg-[#0c0c0e]"
                  style={{ 
                    width: "100%", 
                    height: "100%"
                  }}
                >
                  {/* Active Compilation Overlay Loader */}
                  {compilationStatus === "compiling" && (
                    <div className="absolute inset-0 bg-[#0c0c0e]/95 z-20 flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-neutral-900 border-t-amber-500 animate-spin" />
                      <p className="text-xs text-amber-500 uppercase tracking-widest font-mono font-bold animate-pulse">Coadex Bundling...</p>
                    </div>
                  )}
                  <iframe
                    title="PocketCodex Main Running Preview"
                    srcDoc={sandboxCode?.trim() ? prepareSandboxCode(sandboxCode, projectEnv) : `<!DOCTYPE html><html><head><style>body { background: #0c0c0e; color: #a4a4a8; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; } h1 { color: #f5f5f5; font-size: 1.4rem; margin-bottom: 8px; font-weight: 600; } p { max-width: 320px; font-size: 0.85rem; line-height: 1.6; opacity: 0.8; } .icon { font-size: 2.5rem; margin-bottom: 12px; animation: pulse 2s infinite; } @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }</style></head><body><div class="icon">🌐</div><h1>No Active Preview</h1><p>Generate some code in Chat or click <strong>View Artifact</strong> on an assistant code block to test it live here.</p></body></html>`}
                    className="w-full h-full border-0 bg-[#0c0c0e]"
                  />
                </div>
              )}
            </div>

            {/* Slide-out Terminal Logs Inspector Panel */}
            <AnimatePresence>
              {showInspectorPanel && (
                <motion.div
                  initial={{ opacity: 0, x: 50, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 340 }}
                  exit={{ opacity: 0, x: 50, width: 0 }}
                  transition={{ type: "spring", duration: 0.35 }}
                  className="h-full border-l border-neutral-900 bg-[#0a0a0c] flex flex-col select-none shrink-0 text-left"
                >
                  {/* Inspector Panel Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-900 bg-[#0e0e11]">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="h-4 w-4 text-amber-500" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-neutral-300">Live Build Terminal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInspectorPanel(false)}
                      className="text-neutral-500 hover:text-neutral-300 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Logs Feed - Terminal Style */}
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed bg-neutral-950 space-y-2 text-left flex flex-col justify-start">
                    {inspectorLogOutput.map((logLine, idx) => {
                      const isError = logLine.includes("⚠️ Error") || logLine.includes("error");
                      const isSuccess = logLine.includes("✓ Build Successful") || logLine.includes("SUCCESSFUL");
                      return (
                        <div 
                          key={idx} 
                          className={`break-words ${
                            isError ? "text-red-500 font-bold" 
                            : (isSuccess ? "text-emerald-500 font-bold" : "text-amber-500 animate-pulse")
                          }`}
                        >
                          {logLine}
                        </div>
                      );
                    })}
                  </div>

                  {/* Compiler State Metrics Bar */}
                  <div className="p-3 border-t border-neutral-900 bg-[#0e0e11] font-mono text-[9px] text-neutral-500 flex justify-between items-center bg-neutral-950/20">
                    <span>Virtual Env: sandbox-v3</span>
                    <span>Babel v7.x (TSPreset)</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
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
                customApiKey: localStorage.getItem("chat_gpt_ios_custom_key") || "",
                activeEngine: getActiveEngine(),
                projectEnv: "chat"
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
        activeUser={user}
        onActiveUserChange={setUser}
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
      <div
        style={{ display: isSandboxOpen ? "flex" : "none" }}
        className="fixed inset-0 w-full h-full bg-[#111214] z-[99999] flex flex-col overflow-hidden text-neutral-100"
      >
        {isSandboxOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="w-full h-full flex flex-col overflow-hidden"
          >
            {/* Header of the live preview sandbox */}
            <div className="bg-[#1a1b1e] border-b border-zinc-800 p-3 flex items-center justify-between z-30 flex-none select-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-850 text-amber-500 shrink-0">
                  <Code className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-neutral-200 truncate leading-tight">
                    {sandboxFilename}
                  </span>
                  <span className="block text-[9px] text-neutral-400 font-semibold uppercase tracking-wider leading-none">
                    Artifact Active Layer
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 md:gap-2">
                {/* Copy Action */}
                <button
                  onClick={async () => {
                    triggerHapticFeedback();
                    try {
                      await navigator.clipboard.writeText(sandboxCode);
                      setIsArtifactCopied(true);
                      setTimeout(() => setIsArtifactCopied(false), 2000);
                    } catch (e) {
                      console.error("Failed to copy", e);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold transition cursor-pointer ${
                    isArtifactCopied
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-neutral-900 border border-neutral-850 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                  }`}
                >
                  {isArtifactCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>
 
                {/* Save as HTML Action */}
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    try {
                      const element = document.createElement("a");
                      const file = new Blob([sandboxCode], { type: "text/plain;charset=utf-8" });
                      element.href = URL.createObjectURL(file);
                      element.download = sandboxFilename.endsWith(".html") ? sandboxFilename : `${sandboxFilename}.html`;
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    } catch (err) {
                      console.error("Failed to download code", err);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-neutral-900 border border-neutral-850 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 px-2.5 py-1.5 text-[10px] font-extrabold transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Save as HTML</span>
                  <span className="sm:hidden">Save</span>
                </button>
                
                {/* Close Drawer Overlay */}
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    setIsSandboxOpen(false);
                  }}
                  className="flex items-center justify-center rounded-lg bg-neutral-900 border border-neutral-850 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 px-2.5 py-1.5 text-[10px] transition cursor-pointer select-none"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Sandbox Content Screen */}
            <div className="bg-[#151619] text-zinc-100 p-4 font-mono text-sm overflow-auto w-full flex-1 select-text">
              <pre className="whitespace-pre font-mono leading-relaxed">
                <code>{sandboxCode}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </div>

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

interface MarkdownPreBlockProps {
  children: React.ReactNode;
  triggerHapticFeedback: () => void;
  setSandboxCode: (code: string) => void;
  setSandboxFilename: (filename: string) => void;
  setSandboxViewMode: (mode: "live" | "code") => void;
  setIsSandboxOpen: (open: boolean) => void;
  setMainTab?: (tab: "chat" | "preview") => void;
}

function MarkdownPreBlock({
  children,
  triggerHapticFeedback,
  setSandboxCode,
  setSandboxFilename,
  setSandboxViewMode,
  setIsSandboxOpen,
  setMainTab,
}: MarkdownPreBlockProps) {
  const getRawText = (element: any): string => {
    if (!element) return "";
    if (typeof element === "string") return element;
    if (typeof element === "number") return String(element);
    if (Array.isArray(element)) return element.map(getRawText).join("");
    if (element.props && element.props.children) return getRawText(element.props.children);
    return "";
  };
  
  const codeVal = getRawText(children).trim();

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

  const getLanguageLabel = (name: string): string => {
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html": return "HTML";
      case "css": return "CSS";
      case "ts": return "TypeScript";
      case "tsx": return "React TSX";
      case "js": return "JavaScript";
      case "jsx": return "React JSX";
      case "py": return "Python";
      case "json": return "JSON";
      case "sh": return "Shell";
      case "md": return "Markdown";
      default: return "TypeScript";
    }
  };

  const detectedLang = getLanguageLabel(fileName);

  return (
    <div 
      onClick={() => {
        triggerHapticFeedback();
        setSandboxCode(codeVal);
        setSandboxFilename(fileName);
        setSandboxViewMode("live");
        setIsSandboxOpen(true);
        if (setMainTab) setMainTab("preview");
      }}
      className="my-3 border border-[#1b1b1e] hover:border-neutral-700 bg-[#121214] hover:bg-[#18181c] rounded-xl p-3.5 flex items-center justify-between cursor-pointer group transition h-14 shadow-md w-full select-none"
    >
      <div className="min-w-0 flex-1 text-left">
        <div className="text-xs font-bold text-neutral-200 truncate group-hover:text-neutral-100">
          {fileName}
        </div>
        <div className="text-[10px] text-neutral-500 font-semibold tracking-tight">
          Code · {detectedLang}
        </div>
      </div>
    </div>
  );
}
