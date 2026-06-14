import { ReactNode } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
  mode?: "just_chat" | "web_project" | "android_project";
}

export interface UserProfile {
  email: string;
  name: string;
  avatarUrl: string;
  isLoggedIn: boolean;
  designatedApiKey?: string;
}

export interface PresetPrompt {
  id: string;
  icon: string;
  title: string;
  description: string;
  promptText: string;
}
