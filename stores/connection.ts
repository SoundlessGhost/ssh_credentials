// Active SSH connection + browsing history.
// Single source of truth for currentPath; FileList and Breadcrumbs both read here.

import { create } from "zustand";

const HISTORY_CAP = 50;

function parentOf(path: string): string {
  if (!path || path === "/") return "/";
  const trimmed = path.replace(/\/+$/, "");
  const idx = trimmed.lastIndexOf("/");
  if (idx <= 0) return "/";
  return trimmed.slice(0, idx);
}

export type ConnectionState = {
  sessionId: string | null;
  serverId: string | null;
  hostname: string | null;
  os: string | null;
  currentPath: string;
  history: string[];
  historyIndex: number;

  setSession: (s: {
    sessionId: string;
    serverId?: string | null;
    hostname?: string | null;
    os?: string | null;
    currentDir?: string | null;
  }) => void;

  navigate: (path: string) => void;
  setCurrentPath: (p: string) => void; // alias for navigate, kept for compat
  back: () => void;
  forward: () => void;
  goUp: () => void;
  canBack: () => boolean;
  canForward: () => boolean;

  clear: () => void;
};

export const useConnection = create<ConnectionState>((set, get) => ({
  sessionId: null,
  serverId: null,
  hostname: null,
  os: null,
  currentPath: "/root",
  history: ["/root"],
  historyIndex: 0,

  setSession: ({ sessionId, serverId, hostname, os, currentDir }) => {
    const path = currentDir ?? "/root";
    set({
      sessionId,
      serverId: serverId ?? null,
      hostname: hostname ?? null,
      os: os ?? null,
      currentPath: path,
      history: [path],
      historyIndex: 0,
    });
  },

  navigate: (path) => {
    const s = get();
    if (path === s.currentPath) return;
    // Drop any forward history, then append.
    const truncated = s.history.slice(0, s.historyIndex + 1);
    truncated.push(path);
    const overflow = Math.max(0, truncated.length - HISTORY_CAP);
    const trimmed = truncated.slice(overflow);
    set({
      currentPath: path,
      history: trimmed,
      historyIndex: trimmed.length - 1,
    });
  },

  setCurrentPath: (p) => get().navigate(p),

  back: () => {
    const s = get();
    if (s.historyIndex <= 0) return;
    const idx = s.historyIndex - 1;
    set({ historyIndex: idx, currentPath: s.history[idx] });
  },

  forward: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1) return;
    const idx = s.historyIndex + 1;
    set({ historyIndex: idx, currentPath: s.history[idx] });
  },

  goUp: () => {
    const s = get();
    const parent = parentOf(s.currentPath);
    if (parent !== s.currentPath) get().navigate(parent);
  },

  canBack: () => get().historyIndex > 0,
  canForward: () => get().historyIndex < get().history.length - 1,

  clear: () =>
    set({
      sessionId: null,
      serverId: null,
      hostname: null,
      os: null,
      currentPath: "/root",
      history: ["/root"],
      historyIndex: 0,
    }),
}));
