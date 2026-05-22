// Toggles the SettingsDialog (opened from the user menu).

import { create } from "zustand";

type SettingsUiState = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

export const useSettingsUi = create<SettingsUiState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
