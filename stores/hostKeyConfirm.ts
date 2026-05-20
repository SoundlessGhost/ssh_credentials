// Global TOFU dialog state. Any connect attempt that 428s pushes the
// challenge here; the dialog is mounted once at page level.

import { create } from "zustand";

import type { HostKeyRequired } from "@/lib/api/servers";

export type Pending = {
  challenge: HostKeyRequired;
  /** Re-run the original connect attempt after the key is trusted. */
  retry: () => Promise<void>;
};

type HostKeyConfirmState = {
  pending: Pending | null;
  open: (p: Pending) => void;
  close: () => void;
};

export const useHostKeyConfirm = create<HostKeyConfirmState>((set) => ({
  pending: null,
  open: (pending) => set({ pending }),
  close: () => set({ pending: null }),
}));
