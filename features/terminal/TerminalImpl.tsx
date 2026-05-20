"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { useTheme } from "next-themes";
import { AlertCircle, Loader2 } from "lucide-react";

import { env } from "@/lib/env";
import { endpoints } from "@/lib/api/endpoints";
import { useConnection } from "@/stores/connection";
import { useTerminalCommand } from "@/stores/terminalCommand";

type Status = "idle" | "connecting" | "open" | "closed" | "error";

function wsBaseFrom(apiUrl: string): string {
  if (apiUrl.startsWith("https://")) return "wss://" + apiUrl.slice(8);
  if (apiUrl.startsWith("http://")) return "ws://" + apiUrl.slice(7);
  return apiUrl;
}

const darkTheme = {
  background: "#0a0a0a",
  foreground: "#fafafa",
  cursor: "#fafafa",
  cursorAccent: "#0a0a0a",
  selectionBackground: "#3b82f680",
  black: "#000000",
  red: "#ff5555",
  green: "#50fa7b",
  yellow: "#f1fa8c",
  blue: "#bd93f9",
  magenta: "#ff79c6",
  cyan: "#8be9fd",
  white: "#bbbbbb",
  brightBlack: "#666666",
  brightRed: "#ff6e6e",
  brightGreen: "#69ff94",
  brightYellow: "#ffffa5",
  brightBlue: "#d6acff",
  brightMagenta: "#ff92df",
  brightCyan: "#a4ffff",
  brightWhite: "#ffffff",
};

const lightTheme = {
  ...darkTheme,
  background: "#ffffff",
  foreground: "#1a1a1a",
  cursor: "#1a1a1a",
  cursorAccent: "#ffffff",
  selectionBackground: "#3b82f640",
};

export function TerminalImpl() {
  const sessionId = useConnection((s) => s.sessionId);
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const theme = useMemo(
    () => (resolvedTheme === "dark" ? darkTheme : lightTheme),
    [resolvedTheme],
  );

  // Mount xterm once
  useEffect(() => {
    if (!containerRef.current) return;
    const term = new XTerm({
      fontSize: 13,
      fontFamily:
        '"JetBrains Mono", "SFMono-Regular", Menlo, Consolas, "DejaVu Sans Mono", monospace',
      lineHeight: 1.2,
      cursorBlink: true,
      convertEol: true,
      scrollback: 5000,
      allowProposedApi: true,
      theme,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // ignore — container may be 0×0 mid-animation
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-apply theme on toggle
  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = theme;
  }, [theme]);

  // (Re)connect WebSocket when session changes
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    term.clear();
    setErrorMsg(null);

    if (!sessionId) {
      setStatus("idle");
      term.writeln(
        "\x1b[90mConnect a server in the sidebar to open a shell.\x1b[0m",
      );
      return;
    }

    setStatus("connecting");
    term.writeln("\x1b[90mOpening shell…\x1b[0m");

    const wsUrl = `${wsBaseFrom(env.apiUrl)}${endpoints.terminalWs}/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("open");
      term.clear();
      // Drain any queued command from "Open in Terminal" right-click.
      const pending = useTerminalCommand.getState().consume();
      if (pending) {
        // Small delay so the remote shell prompt is ready first.
        setTimeout(() => {
          try {
            ws.send(pending);
          } catch {
            // ignore
          }
        }, 250);
      }
    };
    ws.onmessage = (e) => {
      term.write(typeof e.data === "string" ? e.data : "");
    };
    ws.onerror = () => {
      setStatus("error");
      setErrorMsg("WebSocket error");
    };
    ws.onclose = (e) => {
      setStatus("closed");
      if (!e.wasClean) {
        setErrorMsg(`Closed (${e.code})`);
      }
      term.writeln("\r\n\x1b[90m[terminal closed]\x1b[0m");
    };

    const dataDisp = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    // Subscribe to terminal command queue so a later "Open in Terminal"
    // (after WS already open) still flows in.
    const unsubCmd = useTerminalCommand.subscribe((state, prev) => {
      if (state.pending && state.pending !== prev.pending) {
        const cmd = useTerminalCommand.getState().consume();
        if (cmd && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(cmd);
          } catch {
            // ignore
          }
        }
      }
    });

    return () => {
      dataDisp.dispose();
      unsubCmd();
      try {
        ws.close();
      } catch {
        // ignore
      }
    };
  }, [sessionId]);

  return (
    <div className="relative flex h-full flex-col bg-[#0a0a0a]">
      {status === "connecting" && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin" /> connecting
        </div>
      )}
      {errorMsg && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded bg-destructive/20 px-2 py-1 text-[10px] text-destructive backdrop-blur">
          <AlertCircle className="h-3 w-3" /> {errorMsg}
        </div>
      )}
      <div ref={containerRef} className="h-full w-full p-2" />
    </div>
  );
}
