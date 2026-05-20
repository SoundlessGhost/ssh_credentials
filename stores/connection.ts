// Active SSH connection + browsing history.
// Persisted (sessionStorage) so a tab reload reuses the existing backend SSH
// session — backend keeps the SSHManager alive across HTTP reloads, only
// container restart kills it. App-shell mount validates via /api/ssh/list
// and clears if the backend reports 404.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  setCurrentPath: (p: string) => void;
  back: () => void;
  forward: () => void;
  goUp: () => void;
  canBack: () => boolean;
  canForward: () => boolean;

  clear: () => void;
};

export const useConnection = create<ConnectionState>()(
  persist(
    (set, get) => ({
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
    }),
    {
      name: "vps-mgr.connection",
      // sessionStorage so a logout/tab-close drops it; persist across reload only.
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        sessionId: s.sessionId,
        serverId: s.serverId,
        hostname: s.hostname,
        os: s.os,
        currentPath: s.currentPath,
        history: s.history,
        historyIndex: s.historyIndex,
      }),
    },
  ),
);
