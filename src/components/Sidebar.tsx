import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Plus, Trash2, Settings, X, Sparkles, User, LogOut, Cpu } from "lucide-react";
import { ChatThread, UserProfile } from "../types";
import PocketCodexLogo from "./PocketCodexLogo";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onDeleteThread: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  user: UserProfile;
  onLogout: () => void;
  onOpenApi: () => void;
  projectEnv?: "web" | "android" | "chat";
}

export default function Sidebar({
  isOpen,
  onClose,
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeleteThread,
  onOpenSettings,
  onOpenLogin,
  user,
  onLogout,
  onOpenApi,
  projectEnv = "chat",
}: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          />

          {/* Sidebar panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 left-0 z-50 flex h-full w-[290px] flex-col border-r border-[#222226] bg-[#111113] p-4 text-neutral-100 shadow-2xl lg:static lg:w-72 lg:p-4"
          >
            {/* Header: Menu Title and close option */}
            <div className="flex items-center justify-between pb-4">
              <PocketCodexLogo size="sm" />
              <button
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-neutral-800 lg:hidden text-neutral-400"
                id="sidebar-close-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick API & Gmail integration entry points */}
            <div className="mt-2 space-y-2 mb-2 shrink-0">
              <button
                onClick={() => {
                  onOpenApi();
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-xl border border-amber-500/10 bg-amber-500/5 p-3 text-sm font-medium text-amber-400 hover:bg-amber-500/15 transition cursor-pointer"
                id="sidebar-add-api-btn"
                title="Add API"
              >
                <span className="flex items-center gap-2.5">
                  <Cpu className="h-4.5 w-4.5" />
                  API Settings
                </span>
                <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">Active</span>
              </button>
            </div>

            {/* Action button: New Chat */}
            <button
              onClick={() => {
                onNewChat();
                onClose();
              }}
              className="mt-2 flex w-full items-center justify-between rounded-xl bg-neutral-800 p-3 text-sm font-medium hover:bg-neutral-700 transition"
              id="sidebar-new-chat-btn"
            >
              <span className="flex items-center gap-2.5">
                <MessageSquare className="h-4.5 w-4.5 text-neutral-300" />
                New chat
              </span>
              <Plus className="h-4.5 w-4.5 text-neutral-400" />
            </button>

            {/* Chat List category label */}
            <div className="mt-6 flex flex-col flex-1 overflow-y-auto">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-2">
                {projectEnv === "chat" 
                  ? "Standard Chat History" 
                  : projectEnv === "web" 
                  ? "Web Project History" 
                  : "Android Project History"}
              </span>
              
              <div className="mt-2 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 font-sans">
                {threads.length === 0 ? (
                  <div className="p-4 text-center text-xs text-neutral-500 italic">No conversations yet</div>
                ) : (
                  threads.map((thread) => {
                    const isActive = thread.id === activeThreadId;
                    return (
                      <div
                        key={thread.id}
                        onClick={() => {
                          onSelectThread(thread.id);
                          onClose();
                        }}
                        className={`group flex items-center justify-between rounded-lg p-2.5 text-sm cursor-pointer transition ${
                          isActive
                            ? "bg-neutral-850 border border-neutral-800/80 text-white font-medium shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                            : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-1">
                          {thread.mode === "web_project" ? (
                            <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.5 rounded font-mono font-bold leading-none shrink-0 uppercase select-none">
                              WEB
                            </span>
                          ) : thread.mode === "android_project" ? (
                            <span className="text-[8px] bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-1 py-0.5 rounded font-mono font-bold leading-none shrink-0 uppercase select-none">
                              APK
                            </span>
                          ) : (
                            <span className="text-[8px] bg-zinc-800 text-zinc-400 border border-zinc-700/50 px-1 py-0.5 rounded font-mono font-bold leading-none shrink-0 uppercase select-none">
                              CHAT
                            </span>
                          )}
                          <span className="truncate max-w-[135px] text-xs font-medium">{thread.title}</span>
                        </div>
                        <button
                          onClick={(e) => onDeleteThread(thread.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-400 transition shrink-0"
                          title="Delete Thread"
                          id={`delete-thread-${thread.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer containing User state or login request, and settings options */}
            <div className="mt-auto border-t border-[#222226] pt-4 space-y-2">
              {user.isLoggedIn ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-[#222226]">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full object-cover border border-[#444]"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-semibold truncate text-neutral-100">{user.name}</span>
                      <span className="text-[10px] text-neutral-500 truncate">{user.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-red-400 transition"
                    title="Log out"
                    id="sidebar-logout-btn"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onOpenLogin();
                    onClose();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg p-2.5 text-sm font-medium hover:bg-neutral-900 text-neutral-300 hover:text-neutral-100 transition"
                  id="sidebar-login-prompt-btn"
                >
                  <User className="h-4.5 w-4.5 text-neutral-400" />
                  Log in or register
                </button>
              )}

              <button
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg p-2.5 text-sm font-medium hover:bg-neutral-900 text-neutral-300 hover:text-neutral-100 transition"
                id="sidebar-settings-btn"
              >
                <Settings className="h-4.5 w-4.5 text-neutral-400" />
                Settings & Info
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
