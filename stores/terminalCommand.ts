// Cross-component channel: "Open in Terminal" from a folder right-click
// queues a command (e.g. `cd /path`) here; the Terminal component drains
// it on connect or on the next tick if already open.

import { create } from "zustand";

type TerminalCommandState = {
  pending: string | null;
  enqueue: (cmd: string) => void;
  consume: () => string | null;
};

export const useTerminalCommand = create<TerminalCommandState>((set, get) => ({
  pending: null,
  enqueue: (cmd) => set({ pending: cmd }),
  consume: () => {
    const cmd = get().pending;
    if (cmd) set({ pending: null });
    return cmd;
  },
}));
