"use client";
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Input } from "@/components/ui/input";
import React, { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Server,
  Folder,
  File,
  Upload,
  Download,
  FolderPlus,
  Trash2,
  RefreshCw,
  Terminal as TerminalIcon,
  ChevronRight,
  Lock,
  LogOut,
  Edit,
  Activity,
  Monitor,
  Save,
  X,
  Copy,
  Cpu,
  HardDrive,
  Database,
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Play,
  Moon,
  Sun,
  Pencil,
  Clock,
  Zap,
  Shield,
} from "lucide-react";

const API_URL = "https://api.dekhai.org";
// const API_URL = "http://localhost:2247";

// ===== All Interface =====
interface SSHCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface SavedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  color: string;
  username: string;
  password: string;
  lastUsed?: string;
}

interface FileItem {
  name: string;
  type: "file" | "folder";
  path: string;
  size?: number;
  sizeStr?: string;
  modified?: string;
  permissions?: string;
}

interface SystemInfo {
  cpuPercent: number;
  memory: {
    totalGb: number;
    usedGb: number;
    percent: number;
  };
  disk: {
    total: string;
    used: string;
    percent: number;
  };
  uptimeSeconds: number;
  hostname?: string;
  os?: string;
}

interface ProcessInfo {
  pid: number;
  cpuPercent: number;
  memoryPercent: number;
  status: string;
  command: string;
}

// ===== All Type =====
type TabType =
  | "files"
  | "terminal"
  | "editor"
  | "processes"
  | "monitor"
  | "linkedin";

type ClipboardState = {
  action: "copy" | "cut";
  srcPath: string;
  name: string;
  type: "file" | "folder";
} | null;

type ConfirmAction =
  | { type: "delete"; path: string }
  | { type: "kill"; pid: number }
  | { type: "closeEditor" }
  | null;

type PinnedFolder = { name: string; path: string };

const EnhancedSSHManager: React.FC = () => {
  // ===== Dark Mode =====
  const [darkMode, setDarkMode] = useState(false);

  // ===== Folder Dialog Open =====
  const [folderName, setFolderName] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  // ===== Rename Dialog Open =====
  const [renameValue, setRenameValue] = useState("");
  const [renameTargetPath, setRenameTargetPath] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  // ===== Rename Connection Dialog =====
  const [renameConnectionValue, setRenameConnectionValue] = useState("");
  const [renameConnectionId, setRenameConnectionId] = useState<string | null>(
    null,
  );
  const [renameConnectionDialogOpen, setRenameConnectionDialogOpen] =
    useState(false);

  // ===== Confirm Dialog =====
  const [confirmDesc, setConfirmDesc] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // ===== Connection =====
  const [sessionId, setSessionId] = useState("");
  const [connected, setConnected] = useState(false);
  const [credentials, setCredentials] = useState<SSHCredentials>({
    host: "",
    port: 22,
    username: "root",
    password: "",
  });

  // ===== Saved connections =====
  const [connectionName, setConnectionName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>(
    [],
  );

  // ===== File manager =====
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("/root");
  const [activeTab, setActiveTab] = useState<TabType>("files");

  // ===== Transfer Progress =====
  const [transferProgress, setTransferProgress] = useState<{
    active: boolean;
    type: "upload" | "download";
    filename: string;
    loaded: number;
    total: number;
    percent: number;
    speed: string;
  } | null>(null);

  // ===== Editor =====
  const [editorContent, setEditorContent] = useState("");
  const [editorFile, setEditorFile] = useState<string>("");
  const [originalContent, setOriginalContent] = useState("");
  const [editorModified, setEditorModified] = useState(false);

  // ===== Monitor =====
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // ===== Clipboard =====
  const [clipboard, setClipboard] = useState<ClipboardState>(null);

  // ===== Booting Spinner =====
  const restoreOnceRef = useRef(false);
  const [appBooting, setAppBooting] = useState(true);

  // ===== Pinned folders =====
  const dragPinnedIndexRef = useRef<number | null>(null);
  const [pinnedFolders, setPinnedFolders] = useState<PinnedFolder[]>([]);
  const pinnedKey = connected
    ? `ssh_pinned_folders_${credentials.username}@${credentials.host}`
    : null;

  // ===== Script Run Modal =====
  const [runOut, setRunOut] = useState("");
  const [runInput, setRunInput] = useState("");
  const [runTimeout, setRunTimeout] = useState(60);
  const [runServers, setRunServers] = useState("");
  const [runResume, setRunResume] = useState(true);
  const [runApiKey, setRunApiKey] = useState("root");
  const [runScriptPath, setRunScriptPath] = useState("");
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runConcurrency, setRunConcurrency] = useState(500);

  // ===== xterm refs =====
  const pasteLockRef = useRef(false);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const suppressInputRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const xtermContainerRef = useRef<HTMLDivElement | null>(null);

  // ===== UI Alert =====
  const [uiAlert, setUiAlert] = useState<{
    open: boolean;
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    variant: "default",
  });

  // ===== Load dark mode preference =====
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("ssh_dark_mode");
    if (savedDarkMode === "true") {
      setDarkMode(true);
    }
  }, []);

  // ===== Persist dark mode =====
  useEffect(() => {
    localStorage.setItem("ssh_dark_mode", darkMode.toString());
  }, [darkMode]);

  const showAlert = (
    title: string,
    description = "",
    variant: "default" | "destructive" = "default",
    autoHideMs = 3000,
  ) => {
    setUiAlert({ open: true, title, description, variant });
    if (autoHideMs > 0) {
      setTimeout(() => setUiAlert((p) => ({ ...p, open: false })), autoHideMs);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const xtermPrint = (text: string) => {
    const t = xtermRef.current;
    if (!t) return;
    t.writeln(text.replace(/\n/g, "\r\n"));
  };

  // ===== Helpers =====
  const parentDir = (p: string) => {
    const parts = (p || "").split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  };

  // ===== WebSocket Terminal (REAL interactive) =====
  useEffect(() => {
    if (activeTab !== "terminal") return;
    if (!sessionId) return;

    let cancelled = false;

    // cleanup collectors
    const cleanupFns: Array<() => void> = [];

    const init = async () => {
      // ✅ dynamically import browser-only deps (SSR safe)
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("xterm"),
        import("xterm-addon-fit"),
      ]);

      if (cancelled) return;

      // --- init xterm once ---
      if (!xtermRef.current && xtermContainerRef.current) {
        const term = new Terminal({
          cursorBlink: true,
          convertEol: true,
          fontSize: 14,
          scrollback: 5000,
          theme: darkMode
            ? {
                background: "#1a1b26",
                foreground: "#a9b1d6",
                cursor: "#c0caf5",
              }
            : undefined,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // ✅ force clear container on reload / remount
        if (xtermContainerRef.current) {
          xtermContainerRef.current.innerHTML = "";
        }

        // open terminal
        term.open(xtermContainerRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        const container = xtermContainerRef.current;

        if (!container) return;

        // ✅ focus on click
        const handleMouseDown = () => term.focus();
        container.addEventListener("mousedown", handleMouseDown);
        cleanupFns.push(() =>
          container.removeEventListener("mousedown", handleMouseDown),
        );

        // ✅ right click paste
        const handleContextMenu = async (e: MouseEvent) => {
          e.preventDefault();
          try {
            const text = await navigator.clipboard.readText();
            if (text && wsRef.current?.readyState === WebSocket.OPEN) {
              suppressInputRef.current = true;
              wsRef.current.send(text.replace(/\r?\n$/, ""));
              setTimeout(() => {
                suppressInputRef.current = false;
              }, 150);
            }
          } catch (err) {
            console.log("Clipboard read failed:", err);
          }
        };
        container.addEventListener("contextmenu", handleContextMenu);
        cleanupFns.push(() =>
          container.removeEventListener("contextmenu", handleContextMenu),
        );

        // ✅ keyboard shortcuts (Ctrl+Shift+V paste, Ctrl+Shift+C copy)
        term.attachCustomKeyEventHandler((ev: KeyboardEvent) => {
          // ✅ only handle keydown (avoid keypress/keyup duplicates)
          if ((ev as any).type && (ev as any).type !== "keydown") return true;

          const key = ev.key.toLowerCase();
          const hasSelection = !!term.getSelection();

          // ✅ block key repeat
          if (ev.repeat) return true;

          // ✅ Paste: Ctrl+V
          if (ev.ctrlKey && !ev.shiftKey && key === "v") {
            if (pasteLockRef.current) return false; // already handled
            pasteLockRef.current = true;
            suppressInputRef.current = true; // ← IMMEDIATELY block onData to prevent duplicates

            navigator.clipboard
              .readText()
              .then((text) => {
                if (text && wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(text.replace(/\r?\n$/, ""));
                  setTimeout(() => {
                    suppressInputRef.current = false;
                  }, 150);
                }
              })
              .catch(() => {})
              .finally(() => {
                setTimeout(() => {
                  pasteLockRef.current = false;
                }, 300);
              });

            return false;
          }

          // ✅ Copy: Ctrl+C only when selection exists
          if (ev.ctrlKey && key === "c" && hasSelection) {
            navigator.clipboard.writeText(term.getSelection()).catch(() => {});
            return false;
          }

          return true;
        });

        // ✅ normal typing -> server
        term.onData((data: string) => {
          if (suppressInputRef.current) return; // ✅ block duplicates during paste
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(data);
          }
        });

        // ✅ resize fit
        const onResize = () => fitAddon.fit();
        window.addEventListener("resize", onResize);
        cleanupFns.push(() => window.removeEventListener("resize", onResize));
      } else {
        // terminal already exists
        fitAddonRef.current?.fit();
        xtermRef.current?.focus?.();

        // ✅ if container got reset/blank (after reload), re-open
        if (
          xtermContainerRef.current &&
          xtermContainerRef.current.innerHTML.trim() === ""
        ) {
          xtermRef.current?.open?.(xtermContainerRef.current);
          fitAddonRef.current?.fit?.();
        }
      }

      // --- connect websocket ---
      const wsBase = API_URL.startsWith("https")
        ? API_URL.replace("https://", "wss://")
        : API_URL.replace("http://", "ws://");

      // cleanup old ws if any
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;

      const ws = new WebSocket(`${wsBase}/ws/terminal/${sessionId}`);
      wsRef.current = ws;

      const writeln = (t: string) => {
        xtermRef.current?.writeln(String(t).replace(/\n/g, "\r\n"));
      };

      ws.onopen = () => {
        xtermRef.current?.writeln("\r\n[Connected]\r\n");
        wsRef.current?.send("\n"); // ✅ prompt trigger
      };

      ws.onmessage = (ev) => {
        xtermRef.current?.write(ev.data);
      };

      ws.onclose = () => {
        writeln("");
        writeln("[Disconnected]");
        writeln("");
      };

      ws.onerror = () => {
        writeln("");
        writeln("[WebSocket Error]");
        writeln("");
      };

      // cleanup ws
      cleanupFns.push(() => {
        try {
          ws.close();
        } catch {}
      });
    };

    init().catch((e) => console.error("xterm init failed:", e));

    return () => {
      cancelled = true;

      // run all cleanup
      for (const fn of cleanupFns) {
        try {
          fn();
        } catch {}
      }

      // also null ws ref
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
    };
  }, [activeTab, sessionId, darkMode]);

  // ===== Load saved connections =====
  useEffect(() => {
    const saved = localStorage.getItem("ssh_connections");
    if (saved) {
      try {
        setSavedConnections(JSON.parse(saved));
      } catch {
        setSavedConnections([]);
      }
    }
  }, []);

  // ===== Persist active session =====
  useEffect(() => {
    if (!connected || !sessionId) return;
    localStorage.setItem(
      "ssh_active_session",
      JSON.stringify({
        sessionId,
        credentials,
        currentPath,
        activeTab,
        savedAt: new Date().toISOString(),
      }),
    );
  }, [connected, sessionId, credentials, currentPath, activeTab]);

  // ===== Reload with spinner + auto restore =====
  useEffect(() => {
    if (restoreOnceRef.current) return;
    restoreOnceRef.current = true;

    const run = async () => {
      try {
        const rawActive = localStorage.getItem("ssh_active_session");
        if (rawActive) {
          const parsed = JSON.parse(rawActive);

          if (parsed?.credentials && parsed?.sessionId) {
            setCredentials(parsed.credentials);
            setSessionId(parsed.sessionId);
            setCurrentPath(parsed.currentPath || "/root");
            setActiveTab(parsed.activeTab || "files");

            const res = await fetch(
              `${API_URL}/api/ssh/list?session_id=${
                parsed.sessionId
              }&path=${encodeURIComponent(parsed.currentPath || "/root")}`,
            );

            const data = await res.json();
            if (data?.success) {
              setConnected(true);
              setFiles(data.items || []);
              return;
            }
          }
          localStorage.removeItem("ssh_active_session");
        }

        const rawLast = localStorage.getItem("last_connected_session");
        if (rawLast) {
          const last = JSON.parse(rawLast);
          if (last?.host && last?.username && last?.password) {
            const creds: SSHCredentials = {
              host: last.host,
              port: Number(last.port || 22),
              username: last.username,
              password: last.password,
            };
            setCredentials(creds);
            await handleConnectWithCreds(creds);
          }
        }
      } catch (e) {
        console.log(e);
        showAlert(
          "Restore failed",
          "Please connect again.",
          "destructive",
          4000,
        );
      } finally {
        setAppBooting(false);
      }
    };

    run();
  }, []);

  // ===== Load pinned folders =====
  useEffect(() => {
    if (!pinnedKey) return;

    const raw = localStorage.getItem(pinnedKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setPinnedFolders(parsed);
      } catch {
        setPinnedFolders([]);
      }
    } else {
      setPinnedFolders([]);
    }
  }, [pinnedKey]);

  // ===== Persist pinned folders =====
  useEffect(() => {
    if (!pinnedKey) return;
    localStorage.setItem(pinnedKey, JSON.stringify(pinnedFolders));
  }, [pinnedFolders, pinnedKey]);

  // ===== Polling =====
  useEffect(() => {
    if (connected && (activeTab === "monitor" || activeTab === "processes")) {
      loadSystemInfo();
      loadProcesses();
      const interval = setInterval(() => {
        loadSystemInfo();
        loadProcesses();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [connected, activeTab]);

  // ===== Connected -> load files =====
  useEffect(() => {
    if (connected) loadFiles();
  }, [connected]);

  // ===== Confirm helpers =====
  const openConfirm = (action: ConfirmAction, title: string, desc: string) => {
    setConfirmAction(action);
    setConfirmTitle(title);
    setConfirmDesc(desc);
    setConfirmOpen(true);
  };

  // ===== Close Confirm =====
  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  // ===== Save connection =====
  const saveConnection = () => {
    if (!connectionName.trim()) {
      showAlert(
        "Missing name",
        "Please enter a connection name.",
        "destructive",
      );
      return;
    }
    if (!credentials.password?.trim()) {
      showAlert(
        "Missing password",
        "Password is required to save this connection.",
        "destructive",
      );
      return;
    }

    const newConnection: SavedConnection = {
      id: Date.now().toString(),
      name: connectionName.trim(),
      host: credentials.host,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
      lastUsed: new Date().toISOString(),
    };

    const updated = [...savedConnections, newConnection];
    setSavedConnections(updated);
    localStorage.setItem("ssh_connections", JSON.stringify(updated));
    setShowSaveDialog(false);
    setConnectionName("");
    showAlert("Saved", "Connection saved successfully.");
  };

  // ===== Rename Connection =====
  const openRenameConnectionDialog = (conn: SavedConnection) => {
    setRenameConnectionId(conn.id);
    setRenameConnectionValue(conn.name);
    setRenameConnectionDialogOpen(true);
  };

  const performRenameConnection = () => {
    if (!renameConnectionId || !renameConnectionValue.trim()) {
      showAlert("Invalid name", "Please enter a valid name.", "destructive");
      return;
    }

    const updated = savedConnections.map((c) =>
      c.id === renameConnectionId
        ? { ...c, name: renameConnectionValue.trim() }
        : c,
    );
    setSavedConnections(updated);
    localStorage.setItem("ssh_connections", JSON.stringify(updated));
    setRenameConnectionDialogOpen(false);
    setRenameConnectionId(null);
    setRenameConnectionValue("");
    showAlert("Renamed", "Connection renamed successfully.");
  };

  // ===== Load connection =====
  const loadConnection = (conn: SavedConnection) => {
    const fallbackPassword = conn.password || credentials.password || "";

    if (!fallbackPassword) {
      showAlert(
        "Saved password missing",
        "Enter password once and press Save again.",
        "destructive",
        5000,
      );
      setCredentials({
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: "",
      });
      return;
    }

    const creds: SSHCredentials = {
      host: conn.host,
      port: conn.port,
      username: conn.username,
      password: fallbackPassword,
    };

    setCredentials(creds);

    const updated = savedConnections.map((c) =>
      c.id === conn.id
        ? {
            ...c,
            password: fallbackPassword,
            lastUsed: new Date().toISOString(),
          }
        : c,
    );
    setSavedConnections(updated);
    localStorage.setItem("ssh_connections", JSON.stringify(updated));

    setTimeout(() => {
      handleConnectWithCreds(creds);
    }, 100);
  };

  const deleteConnection = (id: string) => {
    const updated = savedConnections.filter((c) => c.id !== id);
    setSavedConnections(updated);
    localStorage.setItem("ssh_connections", JSON.stringify(updated));
    showAlert("Deleted", "Saved connection removed.");
  };

  // ===== Connect =====
  const handleConnectWithCreds = async (creds: SSHCredentials) => {
    if (!creds.host || !creds.username || !creds.password) {
      showAlert(
        "Missing credentials",
        "Host/Username/Password missing!",
        "destructive",
      );
      return;
    }

    setLoading(true);
    const newSessionId = `session_${Date.now()}`;

    try {
      const res = await fetch(`${API_URL}/api/ssh/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds, session_id: newSessionId }),
      });

      const data = await res.json();

      if (data.success) {
        setSessionId(newSessionId);
        setConnected(true);

        setPinnedFolders([]);

        const dir = data.currentDir || data.current_dir || "/root";
        setCurrentPath(dir);
        loadFiles(dir);

        showAlert("Connected", `${creds.username}@${creds.host}`);
      } else {
        showAlert(
          "Connection failed",
          "Please verify host/port/password.",
          "destructive",
          5000,
        );
      }
    } catch (err: any) {
      showAlert(
        "Connection error",
        err?.message || "Unknown error",
        "destructive",
        6000,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    handleConnectWithCreds(credentials);
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${API_URL}/api/ssh/disconnect?session_id=${sessionId}`, {
        method: "POST",
      });

      localStorage.removeItem("ssh_active_session");
      setFiles([]);
      setProcesses([]);
      setSessionId("");
      setConnected(false);
      setSystemInfo(null);
      setActiveTab("files");

      // close ws if open
      try {
        wsRef.current?.close();
      } catch {}

      showAlert("Disconnected", "Session closed.");
    } catch (err: any) {
      showAlert(
        "Disconnect error",
        err?.message || "Unknown error",
        "destructive",
        5000,
      );
    }
  };

  // ===== Files =====
  const loadFiles = async (path: string = currentPath) => {
    if (!connected) return;

    try {
      const res = await fetch(
        `${API_URL}/api/ssh/list?session_id=${sessionId}&path=${encodeURIComponent(path)}`,
      );
      const data = await res.json();

      if (data.success) {
        setFiles(data.items);
        setCurrentPath(data.path);
      }
    } catch (err: any) {
      showAlert(
        "Load files failed",
        err?.message || "Unknown error",
        "destructive",
        5000,
      );
    }
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      loadFiles("/" + parts.join("/") || "/");
    }
  };

  const handleCreateFolder = () => {
    setFolderName("");
    setFolderDialogOpen(true);
  };

  const performCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) {
      showAlert(
        "Folder name required",
        "Please enter a folder name.",
        "destructive",
      );
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/ssh/create-folder?session_id=${sessionId}&path=${encodeURIComponent(
          currentPath,
        )}&folder_name=${encodeURIComponent(name)}`,
        { method: "POST" },
      );

      const data = await res.json();
      if (data.success) {
        setFolderDialogOpen(false);
        setFolderName("");
        loadFiles();
        showAlert("Folder created", name);
      } else {
        showAlert(
          "Create folder failed",
          data?.detail || "Unknown error",
          "destructive",
          6000,
        );
      }
    } catch (err: any) {
      showAlert(
        "Create folder failed",
        err?.message || "Unknown error",
        "destructive",
        6000,
      );
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const formData = new FormData();
      formData.append("file", file);
      const startTime = Date.now();

      try {
        setLoading(true);
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "POST",
            `${API_URL}/api/ssh/upload?session_id=${sessionId}&path=${encodeURIComponent(currentPath)}`,
          );

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const elapsed = (Date.now() - startTime) / 1000;
              const speedBps = elapsed > 0 ? evt.loaded / elapsed : 0;
              const speedStr =
                speedBps > 1024 * 1024
                  ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`
                  : `${(speedBps / 1024).toFixed(0)} KB/s`;
              setTransferProgress({
                active: true,
                type: "upload",
                filename: file.name,
                loaded: evt.loaded,
                total: evt.total,
                percent: Math.round((evt.loaded / evt.total) * 100),
                speed: speedStr,
              });
            }
          };

          xhr.onload = () => {
            setTransferProgress(null);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                  loadFiles();
                  showAlert(
                    "Uploaded",
                    `${file.name} (${formatBytes(file.size)})`,
                  );
                  xtermPrint(
                    `[UPLOAD] ${file.name} (${formatBytes(file.size)})`,
                  );
                } else {
                  showAlert(
                    "Upload failed",
                    data?.detail || "Unknown error",
                    "destructive",
                    5000,
                  );
                }
              } catch {
                showAlert(
                  "Upload failed",
                  "Invalid response",
                  "destructive",
                  5000,
                );
              }
              resolve();
            } else {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            setTransferProgress(null);
            reject(new Error("Network error"));
          };
          xhr.send(formData);
        });
      } catch (err: any) {
        setTransferProgress(null);
        showAlert(
          "Upload failed",
          err?.message || "Unknown error",
          "destructive",
          6000,
        );
      } finally {
        setLoading(false);
      }
    }
    e.target.value = "";
  };

  const handleDownload = async (path: string, filename: string) => {
    const startTime = Date.now();
    try {
      const res = await fetch(
        `${API_URL}/api/ssh/download?session_id=${sessionId}&path=${encodeURIComponent(path)}`,
      );
      if (!res.ok) {
        showAlert("Download failed", `HTTP ${res.status}`, "destructive", 5000);
        return;
      }

      const contentLength = parseInt(
        res.headers.get("Content-Length") ||
          res.headers.get("X-File-Size") ||
          "0",
        10,
      );
      const reader = res.body?.getReader();

      if (!reader) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        showAlert("Downloaded", filename);
        return;
      }

      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const speedBps = elapsed > 0 ? received / elapsed : 0;
          const speedStr =
            speedBps > 1024 * 1024
              ? `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`
              : `${(speedBps / 1024).toFixed(0)} KB/s`;
          setTransferProgress({
            active: true,
            type: "download",
            filename,
            loaded: received,
            total: contentLength,
            percent: Math.round((received / contentLength) * 100),
            speed: speedStr,
          });
        }
      }
      setTransferProgress(null);
      const blob = new Blob(chunks as BlobPart[]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      showAlert("Downloaded", `${filename} (${formatBytes(received)})`);
      xtermPrint(`[DOWNLOAD] ${filename} (${formatBytes(received)})`);
    } catch (err: any) {
      setTransferProgress(null);
      showAlert(
        "Download failed",
        err?.message || "Unknown error",
        "destructive",
        6000,
      );
    }
  };

  const performDelete = async (path: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/ssh/delete?session_id=${sessionId}&path=${encodeURIComponent(path)}`,
        { method: "DELETE" },
      );

      const data = await res.json();
      if (data.success) {
        loadFiles();
        showAlert("Deleted", path);
        xtermPrint(`[DELETE] ${path}`);
      } else {
        showAlert(
          "Delete failed",
          data?.detail || "Unknown error",
          "destructive",
          6000,
        );
      }
    } catch (err: any) {
      showAlert(
        "Delete failed",
        err?.message || "Unknown error",
        "destructive",
        6000,
      );
    }
  };

  const handleDelete = (path: string) => {
    openConfirm(
      { type: "delete", path },
      "Delete item?",
      "This action will permanently delete the selected file/folder. Continue?",
    );
  };

  const openRenameDialog = (item: FileItem) => {
    setRenameTargetPath(item.path);
    setRenameValue(item.name);
    setRenameDialogOpen(true);
  };

  const performRename = async () => {
    const newName = renameValue.trim();
    if (!newName) {
      showAlert("Rename failed", "New name required", "destructive");
      return;
    }

    const dest = `${parentDir(renameTargetPath)}/${newName}`.replace("//", "/");

    try {
      const res = await fetch(`${API_URL}/api/ssh/mv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          src_path: renameTargetPath,
          dest_path: dest,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRenameDialogOpen(false);
        loadFiles();
        showAlert("Renamed", newName);
        xtermPrint(`[RENAME] ${renameTargetPath} -> ${dest}`);
      } else {
        showAlert(
          "Rename failed",
          data?.detail || "Unknown error",
          "destructive",
        );
      }
    } catch (e) {
      showAlert("Rename failed", String(e), "destructive");
    }
  };

  // ===== Clipboard =====
  const pasteClipboard = async () => {
    if (!clipboard) return;

    const baseName = clipboard.name;
    const destPath = `${currentPath}/${baseName}-copy`.replace("//", "/");

    try {
      const res = await fetch(`${API_URL}/api/ssh/cp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          src_path: clipboard.srcPath,
          dest_path: destPath,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showAlert("Pasted", `${baseName} copied here`);
        loadFiles();
        setClipboard(null);
        xtermPrint(`[COPY] ${clipboard.srcPath} -> ${destPath}`);
      } else {
        showAlert(
          "Paste failed",
          data?.detail || "Unknown error",
          "destructive",
        );
      }
    } catch (e) {
      showAlert("Paste failed", String(e), "destructive");
    }
  };

  const copyToClipboard = (item: FileItem) => {
    setClipboard({
      action: "copy",
      srcPath: item.path,
      name: item.name,
      type: item.type,
    });
    showAlert("Copied", `${item.name} is ready to paste`);
  };

  // ===== Editor =====
  const openEditor = async (path: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/ssh/read-file?session_id=${sessionId}&path=${encodeURIComponent(path)}`,
      );
      const data = await res.json();

      if (data.success) {
        setEditorFile(path);
        setEditorContent(data.content || "");
        setOriginalContent(data.content || "");
        setEditorModified(false);
        setActiveTab("editor");
      } else {
        showAlert(
          "Open file failed",
          data?.detail || "Unknown error",
          "destructive",
          6000,
        );
      }
    } catch (err: any) {
      showAlert(
        "Open file failed",
        err?.message || "Unknown error",
        "destructive",
        6000,
      );
    }
  };

  const saveEditorFile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/ssh/write-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          path: editorFile,
          content: editorContent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOriginalContent(editorContent);
        setEditorModified(false);
        showAlert("Saved", editorFile);
        xtermPrint(`[SAVE] ${editorFile}`);
      } else {
        showAlert(
          "Save failed",
          data?.detail || "Unknown error",
          "destructive",
          6000,
        );
      }
    } catch (err: any) {
      showAlert(
        "Save failed",
        err?.message || "Unknown error",
        "destructive",
        6000,
      );
    }
  };

  const closeEditor = () => {
    if (editorModified) {
      openConfirm(
        { type: "closeEditor" },
        "Unsaved changes",
        "You have unsaved changes. Close editor anyway?",
      );
      return;
    }
    setEditorFile("");
    setEditorContent("");
    setActiveTab("files");
  };

  // ===== Monitor =====
  const loadSystemInfo = async () => {
    if (!connected) return;
    try {
      const res = await fetch(
        `${API_URL}/api/ssh/system-info?session_id=${sessionId}`,
      );
      const data = await res.json();
      if (data.success) setSystemInfo(data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const loadProcesses = async () => {
    if (!connected) return;
    try {
      const res = await fetch(
        `${API_URL}/api/ssh/processes?session_id=${sessionId}`,
      );
      const data = await res.json();
      if (data.success) setProcesses(data.processes);
    } catch (err) {
      console.log(err);
    }
  };

  const performKillProcess = async (pid: number) => {
    try {
      const res = await fetch(`${API_URL}/api/ssh/kill-process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          pid: pid,
          action: "kill",
        }),
      });

      const data = await res.json();
      if (data.success) {
        loadProcesses();
        showAlert("Process killed", `PID ${pid}`);
        xtermPrint(`[KILL] PID ${pid}`);
      } else {
        showAlert(
          "Kill failed",
          data?.error || data?.detail || "Unknown error",
          "destructive",
          6000,
        );
      }
    } catch (err: any) {
      showAlert(
        "Kill failed",
        err?.message || "Unknown error",
        "destructive",
        6000,
      );
    }
  };

  const killProcess = (pid: number) => {
    openConfirm(
      { type: "kill", pid },
      "Kill process?",
      `Are you sure you want to kill PID ${pid}?`,
    );
  };

  const onConfirmAction = async () => {
    const action = confirmAction;
    closeConfirm();

    if (!action) return;

    if (action.type === "delete") {
      await performDelete(action.path);
      return;
    }
    if (action.type === "kill") {
      await performKillProcess(action.pid);
      return;
    }
    if (action.type === "closeEditor") {
      setEditorFile("");
      setEditorContent("");
      setEditorModified(false);
      setActiveTab("files");
      showAlert("Closed", "Editor closed without saving.");
      return;
    }
  };

  // ===== Pinned Folder =====
  const addPinnedFolder = (folder: { name: string; path: string }) => {
    setPinnedFolders((prev) => {
      if (prev.some((p) => p.path === folder.path)) return prev;
      return [...prev, { name: folder.name, path: folder.path }];
    });
  };

  // ===== Run Script =====
  const openRunScriptModal = (path: string) => {
    if (!connected || !sessionId) {
      showAlert(
        "Not connected",
        "Connect first, then run scripts.",
        "destructive",
      );
      return;
    }

    setRunScriptPath(path);
    const out = `${parentDir(path)}/output`.replace(/\/{2,}/g, "/");
    setRunOut(out);
    setRunModalOpen(true);
  };

  const runScript = async () => {
    if (!runScriptPath) {
      showAlert("Missing script", "Script path not set.", "destructive");
      return;
    }
    if (!runInput.trim()) {
      showAlert("Missing input", "Please set input file path.", "destructive");
      return;
    }
    if (!runOut.trim()) {
      showAlert(
        "Missing output",
        "Please set output folder path.",
        "destructive",
      );
      return;
    }
    if (!runServers.trim()) {
      showAlert("Missing servers", "Please set servers list.", "destructive");
      return;
    }

    const safeOut = runOut.replace(/\/{2,}/g, "/");
    const logFile = `${safeOut}/run_${Date.now()}.log`.replace(/\/{2,}/g, "/");

    const cmd = `
bash -lc 'mkdir -p "${safeOut}" && nohup python3 "${runScriptPath}" \
  --input "${runInput}" \
  --out "${safeOut}" \
  --api-key "${runApiKey}" \
  --concurrency ${Number(runConcurrency) || 1} \
  --timeout ${Number(runTimeout) || 60} \
  --servers "${runServers}" \
  ${runResume ? "--resume" : ""} \
  > "${logFile}" 2>&1 & echo "PID:$!" && echo "LOG:${logFile}"'
`.trim();

    setActiveTab("terminal");
    xtermPrint("");
    xtermPrint(`[${new Date().toLocaleTimeString()}] RUN SCRIPT`);
    xtermPrint(`$ ${cmd}`);
    xtermPrint("");

    try {
      const res = await fetch(`${API_URL}/api/ssh/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          command: cmd,
          working_dir: parentDir(runScriptPath),
        }),
      });

      const data = await res.json();

      if (data?.output) xtermPrint(data.output);
      if (data?.error) xtermPrint(`ERROR: ${data.error}`);

      xtermPrint("");
      xtermPrint(`[tip] To watch logs:`);
      xtermPrint(`$ tail -f "${logFile}"`);
      xtermPrint("");

      showAlert(
        "Started",
        "Script started in background. Check logs in Terminal.",
        "default",
        3500,
      );
      setRunModalOpen(false);
    } catch (err: any) {
      xtermPrint(`ERROR: ${err?.message || "Unknown error"}`);
      showAlert(
        "Run failed",
        err?.message || "Unknown error",
        "destructive",
        6000,
      );
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  const formatLastUsed = (dateStr?: string) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // ===== Theme classes =====
  const themeClasses = {
    bg: darkMode
      ? "bg-slate-900"
      : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100",
    card: darkMode
      ? "bg-slate-800/90 border-slate-700"
      : "bg-white/80 backdrop-blur-xl border-white/20",
    cardSolid: darkMode
      ? "bg-slate-800 border-slate-700"
      : "bg-white border-gray-200",
    text: darkMode ? "text-slate-100" : "text-slate-800",
    textMuted: darkMode ? "text-slate-400" : "text-slate-500",
    textSecondary: darkMode ? "text-slate-300" : "text-slate-600",
    input: darkMode
      ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
      : "bg-white/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20",
    button: darkMode
      ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25"
      : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25",
    buttonSecondary: darkMode
      ? "bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600"
      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200",
    header: darkMode
      ? "bg-slate-800/95 border-slate-700"
      : "bg-white/95 backdrop-blur-xl border-white/20",
  };

  // ===== Booting UI =====
  if (appBooting) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${themeClasses.bg}`}
      >
        <div
          className={`rounded-3xl shadow-2xl px-12 py-10 flex flex-col items-center gap-5 ${themeClasses.card} border`}
        >
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin" />
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-b-blue-400 animate-spin animation-delay-150" />
          </div>
          <div className={`text-xl font-semibold ${themeClasses.text}`}>
            Reconnecting...
          </div>
          <div className={`text-sm ${themeClasses.textMuted}`}>
            Restoring your last session
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${themeClasses.bg} transition-colors duration-300 ${darkMode ? "dark" : ""}`}
    >
      {/* Bottom Right Alert Banner */}
      {uiAlert.open && (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[92vw] animate-slide-up">
          <Alert
            variant={uiAlert.variant}
            className={`relative flex items-start gap-3 pr-10 shadow-2xl border ${
              darkMode
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-gray-200"
            }`}
          >
            {uiAlert.variant === "destructive" ? (
              <AlertTriangle className="h-5 w-5 mt-0.5 text-red-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-500" />
            )}

            <div className="min-w-0">
              <AlertTitle className={`leading-tight ${themeClasses.text}`}>
                {uiAlert.title}
              </AlertTitle>
              {uiAlert.description ? (
                <AlertDescription className={`mt-1 ${themeClasses.textMuted}`}>
                  {uiAlert.description}
                </AlertDescription>
              ) : null}
            </div>

            <button
              onClick={() => setUiAlert((p) => ({ ...p, open: false }))}
              className={`absolute right-3 top-3 opacity-70 hover:opacity-100 ${themeClasses.textMuted}`}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent
          className={darkMode ? "bg-slate-800 border-slate-700" : ""}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeClasses.text}>
              {confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className={themeClasses.textMuted}>
              {confirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={closeConfirm}
              className={
                darkMode
                  ? "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
                  : ""
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmAction}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename File Dialog */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent
          className={darkMode ? "bg-slate-800 border-slate-700" : ""}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeClasses.text}>
              Rename
            </AlertDialogTitle>
            <AlertDialogDescription className={themeClasses.textMuted}>
              Enter a new name for this item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New name"
            className={`mt-2 ${themeClasses.input}`}
            onKeyDown={(e) => e.key === "Enter" && performRename()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setRenameDialogOpen(false)}
              className={
                darkMode
                  ? "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
                  : ""
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performRename}
              className={themeClasses.button}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Connection Dialog */}
      <AlertDialog
        open={renameConnectionDialogOpen}
        onOpenChange={setRenameConnectionDialogOpen}
      >
        <AlertDialogContent
          className={darkMode ? "bg-slate-800 border-slate-700" : ""}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeClasses.text}>
              Rename Connection
            </AlertDialogTitle>
            <AlertDialogDescription className={themeClasses.textMuted}>
              Enter a new name for this saved connection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameConnectionValue}
            onChange={(e) => setRenameConnectionValue(e.target.value)}
            placeholder="New connection name"
            className={`mt-2 ${themeClasses.input}`}
            onKeyDown={(e) => e.key === "Enter" && performRenameConnection()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setRenameConnectionDialogOpen(false)}
              className={
                darkMode
                  ? "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
                  : ""
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performRenameConnection}
              className={themeClasses.button}
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Dialog */}
      <AlertDialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <AlertDialogContent
          className={darkMode ? "bg-slate-800 border-slate-700" : ""}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeClasses.text}>
              Create Folder
            </AlertDialogTitle>
            <AlertDialogDescription className={themeClasses.textMuted}>
              Enter a name for the new folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            className={`mt-2 ${themeClasses.input}`}
            onKeyDown={(e) => e.key === "Enter" && performCreateFolder()}
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setFolderDialogOpen(false)}
              className={
                darkMode
                  ? "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
                  : ""
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={performCreateFolder}
              className={themeClasses.button}
            >
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Run Script Modal */}
      <AlertDialog open={runModalOpen} onOpenChange={setRunModalOpen}>
        <AlertDialogContent
          className={`max-w-xl ${darkMode ? "bg-slate-800 border-slate-700" : ""}`}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className={themeClasses.text}>
              Run Script
            </AlertDialogTitle>
            <AlertDialogDescription className={themeClasses.textMuted}>
              Configure and run:{" "}
              <span className="font-mono text-cyan-500">{runScriptPath}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label
                className={`block text-sm font-semibold mb-1 ${themeClasses.text}`}
              >
                Input File (--input)
              </label>
              <Input
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder="/path/to/input.txt"
                className={themeClasses.input}
              />
            </div>

            <div>
              <label
                className={`block text-sm font-semibold mb-1 ${themeClasses.text}`}
              >
                Output Folder (--out)
              </label>
              <Input
                value={runOut}
                onChange={(e) => setRunOut(e.target.value)}
                placeholder="/path/to/output"
                className={themeClasses.input}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  className={`block text-sm font-semibold mb-1 ${themeClasses.text}`}
                >
                  API Key
                </label>
                <Input
                  value={runApiKey}
                  onChange={(e) => setRunApiKey(e.target.value)}
                  className={themeClasses.input}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-semibold mb-1 ${themeClasses.text}`}
                >
                  Concurrency
                </label>
                <Input
                  type="number"
                  value={runConcurrency}
                  onChange={(e) => setRunConcurrency(Number(e.target.value))}
                  className={themeClasses.input}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-semibold mb-1 ${themeClasses.text}`}
                >
                  Timeout (s)
                </label>
                <Input
                  type="number"
                  value={runTimeout}
                  onChange={(e) => setRunTimeout(Number(e.target.value))}
                  className={themeClasses.input}
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-sm font-semibold mb-1 ${themeClasses.text}`}
              >
                Servers (--servers)
              </label>
              <textarea
                value={runServers}
                onChange={(e) => setRunServers(e.target.value)}
                className={`w-full h-28 p-3 border rounded-xl font-mono text-sm ${themeClasses.input}`}
                placeholder="109.199.122.106:9000,109.199.122.106:8888"
              />
            </div>

            <label
              className={`flex items-center gap-2 text-sm ${themeClasses.text}`}
            >
              <input
                type="checkbox"
                checked={runResume}
                onChange={(e) => setRunResume(e.target.checked)}
                className="rounded border-slate-300"
              />
              Use --resume
            </label>
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              onClick={() => setRunModalOpen(false)}
              className={
                darkMode
                  ? "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
                  : ""
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={runScript}
              className={themeClasses.button}
            >
              <Play size={16} className="mr-2" />
              Run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!connected ? (
        /* ===== LOGIN PAGE ===== */
        <div
          className={`min-h-screen ${themeClasses.bg} flex items-center justify-center p-4 relative overflow-hidden`}
        >
          {/* Background decorations */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`absolute top-4 right-4 p-3 rounded-xl transition-all duration-300 ${themeClasses.card} border shadow-lg hover:scale-105`}
          >
            {darkMode ? (
              <Sun size={20} className="text-amber-400" />
            ) : (
              <Moon size={20} className="text-slate-600" />
            )}
          </button>

          <div
            className={`${themeClasses.card} border rounded-3xl shadow-2xl p-8 w-full max-w-4xl relative z-10`}
          >
            {/* Logo */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-br from-cyan-400 to-blue-600 rounded-2xl blur-lg opacity-50" />
                <div className="relative bg-linear-to-br from-cyan-500 to-blue-600 p-4 rounded-2xl shadow-xl">
                  <Server size={36} className="text-white" />
                </div>
              </div>
            </div>

            <h1
              className={`text-3xl font-bold text-center mb-2 ${themeClasses.text}`}
            >
              SSH Server Manager
            </h1>
            <p className={`text-center mb-8 ${themeClasses.textMuted}`}>
              🙃 Secure connection to your Linux servers Design by S!lent Ghost
              🙂
            </p>

            {/* Saved Connections */}
            {savedConnections.length > 0 && (
              <div className="mb-8">
                <h3
                  className={`text-sm font-semibold mb-3 ${themeClasses.textSecondary} flex items-center gap-2`}
                >
                  <Shield size={14} />
                  Saved Connections
                </h3>
                <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-4">
                  {savedConnections.map((conn) => (
                    <div
                      key={conn.id}
                      className={`group relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                        darkMode
                          ? "bg-slate-700/50 border-slate-600 hover:border-cyan-500/50"
                          : "bg-white/50 border-slate-200 hover:border-cyan-400"
                      }`}
                      style={{
                        borderLeftColor: conn.color,
                        borderLeftWidth: "4px",
                      }}
                      onClick={() => loadConnection(conn)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-semibold text-sm ${themeClasses.text} flex items-center gap-1 truncate`}
                          >
                            <Zap size={12} className="text-cyan-500 shrink-0" />
                            <span className="truncate">{conn.name}</span>
                          </div>
                          <div
                            className={`text-xs font-mono mt-1 ${themeClasses.textMuted} truncate`}
                          >
                            {conn.username}@{conn.host}
                          </div>
                          <div
                            className={`text-xs mt-1 flex items-center gap-1 ${themeClasses.textMuted}`}
                          >
                            <Clock size={10} />
                            {formatLastUsed(conn.lastUsed)}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRenameConnectionDialog(conn);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              darkMode
                                ? "hover:bg-slate-600 text-slate-400"
                                : "hover:bg-slate-100 text-slate-500"
                            }`}
                            title="Rename"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConnection(conn.id);
                            }}
                            className={`p-1.5 rounded-lg transition-colors text-red-500 ${
                              darkMode
                                ? "hover:bg-red-500/20"
                                : "hover:bg-red-50"
                            }`}
                            title="Delete"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connection Form */}
            <div className="space-y-5">
              <div>
                <label
                  className={`block text-sm font-semibold mb-2 ${themeClasses.text}`}
                >
                  Server IP/Host
                </label>
                <input
                  type="text"
                  value={credentials.host}
                  onChange={(e) =>
                    setCredentials({ ...credentials, host: e.target.value })
                  }
                  placeholder="192.168.1.100"
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:ring-4 ${themeClasses.input}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-semibold mb-2 ${themeClasses.text}`}
                  >
                    Port
                  </label>
                  <input
                    type="number"
                    value={credentials.port}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        port: parseInt(e.target.value || "22", 10),
                      })
                    }
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:ring-4 ${themeClasses.input}`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-semibold mb-2 ${themeClasses.text}`}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        username: e.target.value,
                      })
                    }
                    placeholder="root"
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:ring-4 ${themeClasses.input}`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-sm font-semibold mb-2 ${themeClasses.text}`}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:ring-4 ${themeClasses.input}`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className={`flex-1 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.button} hover:scale-[1.02] active:scale-[0.98]`}
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Connect
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowSaveDialog(!showSaveDialog)}
                  className={`px-5 py-4 border-2 rounded-xl transition-all duration-200 hover:scale-105 ${themeClasses.buttonSecondary}`}
                  title="Save connection"
                >
                  <Save size={18} />
                </button>
              </div>

              {/* Save Dialog */}
              {showSaveDialog && (
                <div
                  className={`p-5 border-2 rounded-2xl mt-4 ${
                    darkMode
                      ? "bg-slate-700/50 border-slate-600"
                      : "bg-cyan-50/50 border-cyan-200"
                  }`}
                >
                  <label
                    className={`block text-sm font-semibold mb-2 ${themeClasses.text}`}
                  >
                    Connection Name
                  </label>
                  <input
                    type="text"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                    placeholder="My Server"
                    className={`w-full px-4 py-3 border-2 rounded-xl mb-3 ${themeClasses.input}`}
                  />
                  <button
                    onClick={saveConnection}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${themeClasses.button}`}
                  >
                    Save Connection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ===== DASHBOARD HEADER ===== */}
          <div
            className={`${themeClasses.header} border-b shadow-sm sticky top-0 z-40`}
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="bg-linear-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-lg">
                    <Server size={24} className="text-white" />
                  </div>
                  <div>
                    <h1 className={`text-xl font-bold ${themeClasses.text}`}>
                      Remote Server Manager
                    </h1>
                    <p className={`text-sm ${themeClasses.textMuted}`}>
                      Connected to:{" "}
                      <span className="text-emerald-500 font-mono font-medium">
                        {credentials.username}@{credentials.host}
                      </span>
                      {systemInfo && (
                        <span className="ml-3 text-slate-400">
                          | {systemInfo.hostname} ({systemInfo.os})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={`p-2 rounded-xl transition-all duration-200 ${themeClasses.buttonSecondary} border`}
                  >
                    {darkMode ? (
                      <Sun size={18} className="text-amber-400" />
                    ) : (
                      <Moon size={18} />
                    )}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-red-500 to-rose-500 text-white rounded-xl font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-200"
                  >
                    <LogOut size={18} />
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== TABS ===== */}
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div
              className={`flex gap-2 border-b ${darkMode ? "border-slate-700" : "border-slate-200"} overflow-x-auto pb-px`}
              onDragOver={(e) => {
                e.preventDefault();
                const types = Array.from(e.dataTransfer.types || []);
                if (types.includes("application/x-ssh-pinned"))
                  e.dataTransfer.dropEffect = "move";
                else e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData("application/x-ssh-folder");
                if (!raw) return;
                try {
                  const folder = JSON.parse(raw);
                  if (folder?.path && folder?.name) addPinnedFolder(folder);
                } catch {}
              }}
            >
              {[
                { id: "files" as TabType, label: "Files", icon: Folder },
                {
                  id: "terminal" as TabType,
                  label: "Terminal",
                  icon: TerminalIcon,
                },
                { id: "editor" as TabType, label: "Editor", icon: Edit },
                {
                  id: "processes" as TabType,
                  label: "Processes",
                  icon: Activity,
                },
                { id: "monitor" as TabType, label: "Monitor", icon: Monitor },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center cursor-pointer gap-2 px-5 py-3 border-b-2 transition-all duration-200 whitespace-nowrap font-medium ${
                    activeTab === tab.id
                      ? "border-cyan-500 text-cyan-600"
                      : `border-transparent ${themeClasses.textMuted} hover:text-cyan-500`
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}

              {pinnedFolders.map((p, idx) => (
                <div
                  key={p.path}
                  className={`flex items-center border-b-2 whitespace-nowrap ${
                    activeTab === "files" && currentPath === p.path
                      ? "border-emerald-500 text-emerald-600"
                      : `border-transparent ${themeClasses.textMuted} hover:text-emerald-500`
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    const fromIndex = dragPinnedIndexRef.current;
                    const toIndex = idx;
                    if (fromIndex === null || fromIndex === undefined) return;
                    if (fromIndex === toIndex) return;

                    setPinnedFolders((prev) => {
                      const next = [...prev];
                      const [moved] = next.splice(fromIndex, 1);
                      next.splice(toIndex, 0, moved);
                      return next;
                    });

                    dragPinnedIndexRef.current = toIndex;
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  title={p.path}
                >
                  <span
                    className="px-2 py-2 cursor-grab active:cursor-grabbing select-none opacity-50 hover:opacity-100"
                    draggable
                    onDragStart={(e) => {
                      dragPinnedIndexRef.current = idx;
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", "pinned");
                      e.dataTransfer.setData(
                        "application/x-ssh-pinned",
                        JSON.stringify({ fromIndex: idx, path: p.path }),
                      );
                    }}
                    onDragEnd={() => {
                      dragPinnedIndexRef.current = null;
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⠿
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("files");
                      loadFiles(p.path);
                    }}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    <Folder size={18} />
                    {p.name}
                  </button>
                </div>
              ))}
            </div>

            {/* ===== Transfer Progress Bar ===== */}
            {transferProgress && (
              <div
                className={`mt-6 p-4 rounded-xl border ${darkMode ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-200"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {transferProgress.type === "upload" ? (
                      <Upload size={16} className="text-violet-500 shrink-0" />
                    ) : (
                      <Download size={16} className="text-cyan-500 shrink-0" />
                    )}
                    <span
                      className={`text-sm font-medium truncate ${darkMode ? "text-slate-200" : "text-slate-700"}`}
                    >
                      {transferProgress.type === "upload"
                        ? "Uploading"
                        : "Downloading"}
                      : {transferProgress.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0 ml-3">
                    <span
                      className={darkMode ? "text-slate-400" : "text-slate-500"}
                    >
                      {formatBytes(transferProgress.loaded)} /{" "}
                      {formatBytes(transferProgress.total)}
                    </span>
                    <span
                      className={`font-mono font-bold ${darkMode ? "text-cyan-400" : "text-cyan-600"}`}
                    >
                      {transferProgress.speed}
                    </span>
                    <span
                      className={`font-bold text-base ${darkMode ? "text-slate-200" : "text-slate-700"}`}
                    >
                      {transferProgress.percent}%
                    </span>
                  </div>
                </div>
                <div
                  className={`w-full rounded-full h-2.5 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}
                >
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      transferProgress.type === "upload"
                        ? "bg-linear-to-r from-violet-500 to-purple-500"
                        : "bg-linear-to-r from-cyan-500 to-blue-500"
                    }`}
                    style={{ width: `${transferProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Remove pinned drop zone */}
            {Array.isArray(pinnedFolders) && pinnedFolders.length > 0 && (
              <div
                className={`ml-auto px-3 py-3 text-sm mt-6 rounded-xl font-semibold border-2 border-dashed select-none ${
                  darkMode
                    ? "text-slate-500 border-slate-600"
                    : "text-slate-400 border-slate-300"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const raw = e.dataTransfer.getData(
                    "application/x-ssh-pinned",
                  );
                  if (!raw) return;
                  try {
                    const data = JSON.parse(raw);
                    const fromIndex = data?.fromIndex;
                    if (fromIndex === null || fromIndex === undefined) return;
                    setPinnedFolders((prev) =>
                      prev.filter((_, i) => i !== fromIndex),
                    );
                  } catch {}
                }}
              >
                ❌ Drop Here To Remove
              </div>
            )}

            {/* ===== FILES TAB ===== */}
            {activeTab === "files" && (
              <div
                className={`mt-6 ${themeClasses.cardSolid} rounded-2xl shadow-xl p-6 border`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={navigateUp}
                      className={`p-2 rounded-xl transition-all ${
                        darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"
                      }`}
                      title="Go up"
                    >
                      ↑
                    </button>
                    <span
                      className={`font-mono text-sm ${themeClasses.textMuted}`}
                    >
                      {currentPath}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateFolder}
                      className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                    >
                      <FolderPlus size={18} />
                      New Folder
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-violet-500 to-purple-500 text-white rounded-xl cursor-pointer text-sm font-medium shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all">
                      <Upload size={18} />
                      Upload
                      <input
                        type="file"
                        multiple
                        onChange={handleUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={pasteClipboard}
                      disabled={!clipboard}
                      className={`flex items-center cursor-pointer gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        clipboard
                          ? "bg-linear-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                          : `${darkMode ? "bg-slate-700 text-slate-500" : "bg-slate-200 text-slate-400"} cursor-not-allowed`
                      }`}
                    >
                      <ClipboardPaste size={18} />
                      Paste
                    </button>

                    <button
                      onClick={() => loadFiles()}
                      className={`p-2 border rounded-xl transition-all ${
                        darkMode
                          ? "border-slate-600 hover:bg-slate-700"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <RefreshCw size={18} className={themeClasses.textMuted} />
                    </button>
                  </div>
                </div>

                <div
                  className={`border rounded-xl overflow-hidden max-h-96 overflow-y-auto ${
                    darkMode ? "border-slate-700" : "border-slate-200"
                  }`}
                >
                  {files.length === 0 ? (
                    <div
                      className={`p-8 text-center ${themeClasses.textMuted}`}
                    >
                      No files found
                    </div>
                  ) : (
                    files.map((item) => (
                      <div
                        key={item.path}
                        onDoubleClick={() => {
                          if (item.type === "folder") loadFiles(item.path);
                          else openEditor(item.path);
                        }}
                        className={`flex items-center gap-2 p-3 cursor-pointer group transition-colors ${
                          darkMode
                            ? "hover:bg-slate-700/50"
                            : "hover:bg-slate-50"
                        }`}
                        draggable={item.type === "folder"}
                        onDragStart={(e) => {
                          if (item.type !== "folder") return;
                          e.dataTransfer.setData(
                            "application/x-ssh-folder",
                            JSON.stringify({
                              name: item.name,
                              path: item.path,
                            }),
                          );
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                      >
                        {item.type === "folder" ? (
                          <Folder size={18} className="text-cyan-500" />
                        ) : (
                          <File size={18} className={themeClasses.textMuted} />
                        )}

                        <span className={`flex-1 text-sm ${themeClasses.text}`}>
                          {item.name}
                        </span>

                        <span className={`text-xs ${themeClasses.textMuted}`}>
                          {item.sizeStr}
                        </span>
                        <span className={`text-xs ${themeClasses.textMuted}`}>
                          {item.modified}
                        </span>

                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          {item.type === "file" && (
                            <>
                              <button
                                onClick={() => openEditor(item.path)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  darkMode
                                    ? "hover:bg-slate-600"
                                    : "hover:bg-slate-200"
                                }`}
                                title="Edit"
                              >
                                <Edit
                                  size={14}
                                  className={themeClasses.textMuted}
                                />
                              </button>
                              <button
                                onClick={() =>
                                  handleDownload(item.path, item.name)
                                }
                                title="Download"
                                className={`p-1.5 rounded-lg transition-colors ${
                                  darkMode
                                    ? "hover:bg-slate-600"
                                    : "hover:bg-slate-200"
                                }`}
                              >
                                <Download
                                  size={14}
                                  className={themeClasses.textMuted}
                                />
                              </button>
                            </>
                          )}

                          {item.type === "folder" && (
                            <button
                              onClick={() => loadFiles(item.path)}
                              className={`p-1.5 rounded-lg text-cyan-500 transition-colors ${
                                darkMode
                                  ? "hover:bg-slate-600"
                                  : "hover:bg-slate-200"
                              }`}
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}

                          {item.type === "file" && item.name.endsWith(".py") ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRunScriptModal(item.path);
                              }}
                              className={`p-1.5 rounded-lg text-emerald-500 transition-colors ${
                                darkMode
                                  ? "hover:bg-slate-600"
                                  : "hover:bg-slate-200"
                              }`}
                              title="Run"
                            >
                              <Play size={14} />
                            </button>
                          ) : null}

                          <button
                            onClick={() => openRenameDialog(item)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              darkMode
                                ? "hover:bg-slate-600"
                                : "hover:bg-slate-200"
                            }`}
                            title="Rename"
                          >
                            <Pencil
                              size={14}
                              className={themeClasses.textMuted}
                            />
                          </button>

                          <button
                            onClick={() => copyToClipboard(item)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              darkMode
                                ? "hover:bg-slate-600"
                                : "hover:bg-slate-200"
                            }`}
                            title="Copy"
                          >
                            <Copy
                              size={14}
                              className={themeClasses.textMuted}
                            />
                          </button>

                          <button
                            onClick={() => handleDelete(item.path)}
                            className={`p-1.5 rounded-lg text-red-500 transition-colors ${
                              darkMode
                                ? "hover:bg-red-500/20"
                                : "hover:bg-red-50"
                            }`}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ===== TERMINAL TAB ===== */}
            {activeTab === "terminal" && (
              <div
                className={`mt-6 ${themeClasses.cardSolid} rounded-2xl shadow-xl p-6 border`}
              >
                <div
                  ref={xtermContainerRef}
                  className="rounded-xl overflow-hidden h-105 w-full bg-gray-900"
                />
              </div>
            )}

            {/* ===== EDITOR TAB ===== */}
            {activeTab === "editor" && (
              <div
                className={`mt-6 ${themeClasses.cardSolid} rounded-2xl shadow-xl p-6 border`}
              >
                {editorFile ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Edit size={18} className="text-cyan-500" />
                        <span
                          className={`font-mono text-sm ${themeClasses.text}`}
                        >
                          {editorFile}
                        </span>
                        {editorModified && (
                          <span className="text-orange-500 text-xs font-medium bg-orange-500/10 px-2 py-0.5 rounded-full">
                            ● Modified
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditorFile}
                          disabled={!editorModified}
                          className={`flex items-center cursor-pointer gap-2 px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50 ${themeClasses.button}`}
                        >
                          <Save size={18} />
                          Save
                        </button>
                        <button
                          onClick={closeEditor}
                          className={`flex items-center cursor-pointer gap-2 px-4 py-2 border rounded-xl transition-all ${themeClasses.buttonSecondary}`}
                        >
                          <X size={18} />
                          Close
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={editorContent}
                      onChange={(e) => {
                        setEditorContent(e.target.value);
                        setEditorModified(e.target.value !== originalContent);
                      }}
                      className={`w-full h-96 p-4 font-mono text-sm border-2 rounded-xl focus:ring-4 transition-all ${themeClasses.input}`}
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <div className={`p-12 text-center ${themeClasses.textMuted}`}>
                    <Edit size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Double-click a file in the File Manager to edit it</p>
                  </div>
                )}
              </div>
            )}

            {/* ===== PROCESSES TAB ===== */}
            {activeTab === "processes" && (
              <div
                className={`mt-6 ${themeClasses.cardSolid} rounded-2xl shadow-xl p-6 border`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold ${themeClasses.text}`}>
                    Running Processes (Top 20 by Memory)
                  </h3>
                  <button
                    onClick={loadProcesses}
                    className={`p-2 border rounded-xl transition-all ${
                      darkMode
                        ? "border-slate-600 hover:bg-slate-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <RefreshCw size={18} className={themeClasses.textMuted} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead
                      className={darkMode ? "bg-slate-700/50" : "bg-slate-50"}
                    >
                      <tr>
                        <th
                          className={`px-4 py-3 text-left font-semibold ${themeClasses.text}`}
                        >
                          PID
                        </th>
                        <th
                          className={`px-4 py-3 text-left font-semibold ${themeClasses.text}`}
                        >
                          CPU %
                        </th>
                        <th
                          className={`px-4 py-3 text-left font-semibold ${themeClasses.text}`}
                        >
                          MEM %
                        </th>
                        <th
                          className={`px-4 py-3 text-left font-semibold ${themeClasses.text}`}
                        >
                          Status
                        </th>
                        <th
                          className={`px-4 py-3 text-left font-semibold ${themeClasses.text}`}
                        >
                          Command
                        </th>
                        <th
                          className={`px-4 py-3 text-left font-semibold ${themeClasses.text}`}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {processes.map((proc) => (
                        <tr
                          key={proc.pid}
                          className={`border-t transition-colors ${
                            darkMode
                              ? "border-slate-700 hover:bg-slate-700/30"
                              : "border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <td className={`px-4 py-3 ${themeClasses.text}`}>
                            {proc.pid}
                          </td>
                          <td className={`px-4 py-3 ${themeClasses.text}`}>
                            {proc.cpuPercent.toFixed(1)}%
                          </td>
                          <td className={`px-4 py-3 ${themeClasses.text}`}>
                            {proc.memoryPercent.toFixed(1)}%
                          </td>
                          <td className={`px-4 py-3 ${themeClasses.text}`}>
                            {proc.status}
                          </td>
                          <td
                            className={`px-4 py-3 font-mono text-xs ${themeClasses.textMuted}`}
                          >
                            {proc.command.substring(0, 60)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => killProcess(proc.pid)}
                              className="text-red-500 hover:text-red-600 text-xs font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"
                            >
                              Kill
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== MONITOR TAB ===== */}
            {activeTab === "monitor" && systemInfo && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {/* CPU */}
                  <div
                    className={`${themeClasses.cardSolid} rounded-2xl shadow-xl p-6 border`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-linear-to-br from-cyan-400 to-blue-500 p-3 rounded-xl shadow-lg">
                        <Cpu size={24} className="text-white" />
                      </div>
                      <div>
                        <div className={`text-sm ${themeClasses.textMuted}`}>
                          CPU Usage
                        </div>
                        <div
                          className={`text-2xl font-bold ${themeClasses.text}`}
                        >
                          {systemInfo.cpuPercent}%
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-full rounded-full h-2.5 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}
                    >
                      <div
                        className="bg-linear-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${systemInfo.cpuPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory */}
                  <div
                    className={`${themeClasses.cardSolid} rounded-2xl shadow-xl p-6 border`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-linear-to-br from-emerald-400 to-green-500 p-3 rounded-xl shadow-lg">
                        <Database size={24} className="text-white" />
                      </div>
                      <div>
                        <div className={`text-sm ${themeClasses.textMuted}`}>
                          Memory
                        </div>
                        <div
                          className={`text-2xl font-bold ${themeClasses.text}`}
                        >
                          {systemInfo.memory.percent}%
                        </div>
                        <div className={`text-xs ${themeClasses.textMuted}`}>
                          {systemInfo.memory.usedGb.toFixed(1)} /{" "}
                          {systemInfo.memory.totalGb.toFixed(1)} GB
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-full rounded-full h-2.5 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}
                    >
                      <div
                        className="bg-linear-to-r from-emerald-500 to-green-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${systemInfo.memory.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Disk */}
                  <div
                    className={`${themeClasses.cardSolid} rounded-2xl shadow-xl p-6 border`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-linear-to-br from-violet-400 to-purple-500 p-3 rounded-xl shadow-lg">
                        <HardDrive size={24} className="text-white" />
                      </div>
                      <div>
                        <div className={`text-sm ${themeClasses.textMuted}`}>
                          Disk Usage
                        </div>
                        <div
                          className={`text-2xl font-bold ${themeClasses.text}`}
                        >
                          {systemInfo.disk.percent}%
                        </div>
                        <div className={`text-xs ${themeClasses.textMuted}`}>
                          {systemInfo.disk.used} / {systemInfo.disk.total}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-full rounded-full h-2.5 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}
                    >
                      <div
                        className="bg-linear-to-r from-violet-500 to-purple-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${systemInfo.disk.percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* System Info */}
                <div
                  className={`${themeClasses.cardSolid} rounded-2xl shadow-xl p-6 border`}
                >
                  <h3 className={`text-lg font-bold mb-4 ${themeClasses.text}`}>
                    System Information
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div
                      className={`p-4 rounded-xl ${darkMode ? "bg-slate-700/50" : "bg-slate-50"}`}
                    >
                      <span className={themeClasses.textMuted}>Hostname</span>
                      <div
                        className={`font-mono font-medium mt-1 ${themeClasses.text}`}
                      >
                        {systemInfo.hostname}
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-xl ${darkMode ? "bg-slate-700/50" : "bg-slate-50"}`}
                    >
                      <span className={themeClasses.textMuted}>OS</span>
                      <div
                        className={`font-mono font-medium mt-1 ${themeClasses.text}`}
                      >
                        {systemInfo.os}
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-xl ${darkMode ? "bg-slate-700/50" : "bg-slate-50"}`}
                    >
                      <span className={themeClasses.textMuted}>Uptime</span>
                      <div
                        className={`font-mono font-medium mt-1 ${themeClasses.text}`}
                      >
                        {formatUptime(systemInfo.uptimeSeconds)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default EnhancedSSHManager;
