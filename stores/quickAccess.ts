// Pinned folders for the sidebar Quick Access section.
// localStorage-persisted, scoped per (serverId, path) so different VPS
// vaults don't bleed into each other.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PinnedFolder = {
  serverId: string | null;
  path: string;
  name: string;
  pinnedAt: number;
};

type QuickAccessState = {
  pins: PinnedFolder[];
  isPinned: (serverId: string | null, path: string) => boolean;
  pin: (p: PinnedFolder) => void;
  unpin: (serverId: string | null, path: string) => void;
  forServer: (serverId: string | null) => PinnedFolder[];
};

export const useQuickAccess = create<QuickAccessState>()(
  persist(
    (set, get) => ({
      pins: [],
      isPinned: (serverId, path) =>
        get().pins.some(
          (p) => p.serverId === serverId && p.path === path,
        ),
      pin: (p) =>
        set((s) =>
          s.pins.some(
            (x) => x.serverId === p.serverId && x.path === p.path,
          )
            ? s
            : { pins: [...s.pins, p] },
        ),
      unpin: (serverId, path) =>
        set((s) => ({
          pins: s.pins.filter(
            (p) => !(p.serverId === serverId && p.path === path),
          ),
        })),
      forServer: (serverId) =>
        get()
          .pins.filter((p) => p.serverId === serverId)
          .sort((a, b) => a.name.localeCompare(b.name)),
    }),
    { name: "vps-mgr.quickAccess" },
  ),
);
