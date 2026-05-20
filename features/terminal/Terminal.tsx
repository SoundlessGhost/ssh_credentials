"use client";

import dynamic from "next/dynamic";

// xterm.js touches `window` at module-load time, so SSR fails. Load only
// on the client.
export const Terminal = dynamic(
  () => import("./TerminalImpl").then((m) => m.TerminalImpl),
  { ssr: false },
);
