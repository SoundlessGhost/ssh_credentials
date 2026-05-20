// Open / close the monitor dialog from anywhere.

import { create } from "zustand";

type MonitorUiState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useMonitorUi = create<MonitorUiState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
