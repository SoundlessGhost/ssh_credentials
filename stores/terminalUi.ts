// Global UI state for the terminal panel. Promoted out of AppShell so
// "Open in Terminal" right-clicks can open it from any feature.

import { create } from "zustand";

type TerminalUiState = {
  open: boolean;
  maximized: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setMaximized: (maximized: boolean) => void;
  toggleMaximize: () => void;
};

export const useTerminalUi = create<TerminalUiState>((set) => ({
  open: false,
  maximized: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  setMaximized: (maximized) => set({ maximized }),
  toggleMaximize: () => set((s) => ({ maximized: !s.maximized })),
}));
