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
  Terminal,
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
} from "lucide-react";

const API_URL = "http://144.91.85.229:8080";

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
  // ===== Folder Dialog Open =====
  const [folderName, setFolderName] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  // ===== Rename Dialog Open =====
  const [renameValue, setRenameValue] = useState("");
  const [renameTargetPath, setRenameTargetPath] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);

  // ===== AlertDialog (confirm replacement) =====
  const [confirmDesc, setConfirmDesc] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("Confirm");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // ===== Connection state =====
  const [sessionId, setSessionId] = useState("");
  const [connected, setConnected] = useState(false);
  const [credentials, setCredentials] = useState<SSHCredentials>({
    host: "144.91.85.229",
    port: 22,
    username: "root",
    password: "YQUP2YcS8Baht4X3PIgiC",
  });

  // ===== Saved connections =====
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>(
    []
  );
  const [connectionName, setConnectionName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // ===== File manager state =====
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("/root");
  const [activeTab, setActiveTab] = useState<TabType>("files");

  // ===== Terminal state =====
  const terminalRef = useRef<HTMLDivElement>(null);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [terminalInput, setTerminalInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  // ===== Editor state =====
  const [editorContent, setEditorContent] = useState("");
  const [editorFile, setEditorFile] = useState<string>("");
  const [originalContent, setOriginalContent] = useState("");
  const [editorModified, setEditorModified] = useState(false);

  // ===== System monitor state =====
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // ===== Clip Board =====
  const [clipboard, setClipboard] = useState<ClipboardState>(null);

  // ===== Spinner Booting =====
  const [appBooting, setAppBooting] = useState(true);
  const restoreOnceRef = useRef(false);

  // ===== Drag & Drop Pinned Folders (Quick Tabs) =====
  const [pinnedFolders, setPinnedFolders] = useState<PinnedFolder[]>([]);
  const dragPinnedIndexRef = useRef<number | null>(null);

  const pinnedKey = connected
    ? `ssh_pinned_folders_${credentials.username}@${credentials.host}`
    : null;

  // ✅ Load saved connections from localStorage
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

  // ✅ Restore last active session on page reload
  useEffect(() => {
    const saved = localStorage.getItem("ssh_active_session");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);

      const restoredCredentials = parsed?.credentials;
      const restoredSessionId = parsed?.sessionId;
      const restoredPath = parsed?.currentPath || "/root";
      const restoredTab = parsed?.activeTab || "files";

      if (restoredCredentials) setCredentials(restoredCredentials);
      if (restoredSessionId) setSessionId(restoredSessionId);
      setCurrentPath(restoredPath);
      setActiveTab(restoredTab);

      // Verify session still alive by calling list
      fetch(
        `${API_URL}/api/ssh/list?session_id=${restoredSessionId}&path=${encodeURIComponent(
          restoredPath
        )}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data?.success) {
            setConnected(true);
            setFiles(data.items || []);
            setCurrentPath(data.path || restoredPath);

            showAlert(
              "Session restored",
              `Reconnected to ${restoredCredentials?.host || ""}`,
              "default",
              2500
            );
          } else {
            localStorage.removeItem("ssh_active_session");
          }
        })
        .catch(() => {
          localStorage.removeItem("ssh_active_session");
        });
    } catch {
      localStorage.removeItem("ssh_active_session");
    }
  }, []);

  // ✅ Persist active session state (AUTO-SAVE on change)
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
      })
    );
  }, [connected, sessionId, credentials, currentPath, activeTab]);

  // ✅ Reload the web browser with spinner
  useEffect(() => {
    if (restoreOnceRef.current) return;
    restoreOnceRef.current = true;

    const run = async () => {
      try {
        // 1️⃣ Try active session restore
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
              }&path=${encodeURIComponent(parsed.currentPath || "/root")}`
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

        // 2️⃣ Fallback: last credentials auto-connect
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
          4000
        );
      } finally {
        // ✅ spinner off ONLY after everything
        setAppBooting(false);
      }
    };

    run();
  }, []);

  // ✅ Load pinned folders on mount
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

  // ✅ Persist pinned folders
  useEffect(() => {
    if (!pinnedKey) return;
    localStorage.setItem(pinnedKey, JSON.stringify(pinnedFolders));
  }, [pinnedFolders, pinnedKey]);

  // ===== Auto scroll terminal =====
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // ===== Polling for monitor =====
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

  // ===== Connected =====
  useEffect(() => {
    if (connected) loadFiles();
  }, [connected]);

  // ===== Pinned Folder =====
  const addPinnedFolder = (folder: { name: string; path: string }) => {
    setPinnedFolders((prev) => {
      if (prev.some((p) => p.path === folder.path)) return prev;
      return [...prev, { name: folder.name, path: folder.path }];
    });
  };

  // ===== UI Alert shadcn Alert banner =====
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

  // ===== Show Alert =====
  const showAlert = (
    title: string,
    description = "",
    variant: "default" | "destructive" = "default",
    autoHideMs = 3000
  ) => {
    setUiAlert({ open: true, title, description, variant });
    if (autoHideMs > 0) {
      setTimeout(() => {
        setUiAlert((p) => ({ ...p, open: false }));
      }, autoHideMs);
    }
  };

  // ===== Open Confirm =====
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
        "destructive"
      );
      return;
    }
    if (!credentials.password?.trim()) {
      showAlert(
        "Missing password",
        "Password is required to save this connection.",
        "destructive"
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
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      lastUsed: new Date().toISOString(),
    };

    const updated = [...savedConnections, newConnection];
    setSavedConnections(updated);
    localStorage.setItem("ssh_connections", JSON.stringify(updated));
    setShowSaveDialog(false);
    setConnectionName("");
    showAlert("Saved", "Connection saved successfully.");
  };

  // ===== Load connection =====
  const loadConnection = (conn: SavedConnection) => {
    const fallbackPassword = conn.password || credentials.password || "";

    if (!fallbackPassword) {
      showAlert(
        "Saved password missing",
        "Enter password once and press Save again.",
        "destructive",
        5000
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

    // migrate missing password into storage
    const updated = savedConnections.map((c) =>
      c.id === conn.id
        ? {
            ...c,
            password: fallbackPassword,
            lastUsed: new Date().toISOString(),
          }
        : c
    );
    setSavedConnections(updated);
    localStorage.setItem("ssh_connections", JSON.stringify(updated));

    // auto connect
    setTimeout(() => {
      handleConnectWithCreds(creds);
    }, 100);
  };

  // ===== Delete connection =====
  const deleteConnection = (id: string) => {
    const updated = savedConnections.filter((c) => c.id !== id);
    setSavedConnections(updated);
    localStorage.setItem("ssh_connections", JSON.stringify(updated));
    showAlert("Deleted", "Saved connection removed.");
  };

  // ===== Handle ConnectWithCreds =====
  const handleConnectWithCreds = async (creds: SSHCredentials) => {
    if (!creds.host || !creds.username || !creds.password) {
      showAlert(
        "Missing credentials",
        "Host/Username/Password missing!",
        "destructive"
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

        setTerminalOutput([
          `[${new Date().toLocaleTimeString()}] Connected to ${creds.host}`,
        ]);

        showAlert("Connected", `${creds.username}@${creds.host}`);
      } else {
        showAlert(
          "Connection failed",
          "Please verify host/port/password.",
          "destructive",
          5000
        );
      }
    } catch (err: any) {
      showAlert(
        "Connection error",
        err?.message || "Unknown error",
        "destructive",
        6000
      );
    } finally {
      setLoading(false);
    }
  };

  // ===== Handle connect =====
  const handleConnect = () => {
    handleConnectWithCreds(credentials);
  };

  // ===== Handle Disconnect =====
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
      showAlert("Disconnected", "Session closed.");
    } catch (err: any) {
      showAlert(
        "Disconnect error",
        err?.message || "Unknown error",
        "destructive",
        5000
      );
    }
  };

  // ===== File operations =====
  const loadFiles = async (path: string = currentPath) => {
    if (!connected) return;

    try {
      const res = await fetch(
        `${API_URL}/api/ssh/list?session_id=${sessionId}&path=${encodeURIComponent(
          path
        )}`
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
        5000
      );
    }
  };

  // ===== Handle Create Folder =====
  const handleCreateFolder = () => {
    setFolderName("");
    setFolderDialogOpen(true);
  };

  // ===== Create Folder =====
  const performCreateFolder = async () => {
    const name = folderName.trim();
    if (!name) {
      showAlert(
        "Folder name required",
        "Please enter a folder name.",
        "destructive"
      );
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/ssh/create-folder?session_id=${sessionId}&path=${encodeURIComponent(
          currentPath
        )}&folder_name=${encodeURIComponent(name)}`,
        { method: "POST" }
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
          6000
        );
      }
    } catch (err: any) {
      showAlert(
        "Create folder failed",
        err?.message || "Unknown error",
        "destructive",
        6000
      );
    }
  };

  // ===== Handle Upload =====
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/ssh/upload?session_id=${sessionId}&path=${encodeURIComponent(
          currentPath
        )}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (data.success) {
        loadFiles();
        setTerminalOutput((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Uploaded: ${file.name}`,
        ]);
        showAlert("Uploaded", file.name);
      } else {
        showAlert(
          "Upload failed",
          data?.detail || "Unknown error",
          "destructive",
          5000
        );
      }
    } catch (err: any) {
      showAlert(
        "Upload failed",
        err?.message || "Unknown error",
        "destructive",
        6000
      );
    } finally {
      setLoading(false);
      // allow re-upload same file
      e.target.value = "";
    }
  };

  // ===== Handle Download =====
  const handleDownload = async (path: string, filename: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/ssh/download?session_id=${sessionId}&path=${encodeURIComponent(
          path
        )}`
      );

      if (!res.ok) {
        showAlert("Download failed", `HTTP ${res.status}`, "destructive", 5000);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      setTerminalOutput((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Downloaded: ${filename}`,
      ]);
      showAlert("Downloaded", filename);
    } catch (err: any) {
      showAlert(
        "Download failed",
        err?.message || "Unknown error",
        "destructive",
        6000
      );
    }
  };

  // ===== Delete Folder =====
  const performDelete = async (path: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/ssh/delete?session_id=${sessionId}&path=${encodeURIComponent(
          path
        )}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (data.success) {
        loadFiles();
        setTerminalOutput((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Deleted: ${path}`,
        ]);
        showAlert("Deleted", path);
      } else {
        showAlert(
          "Delete failed",
          data?.detail || "Unknown error",
          "destructive",
          6000
        );
      }
    } catch (err: any) {
      showAlert(
        "Delete failed",
        err?.message || "Unknown error",
        "destructive",
        6000
      );
    }
  };

  // ===== Handle Delete =====
  const handleDelete = (path: string) => {
    openConfirm(
      { type: "delete", path },
      "Delete item?",
      "This action will permanently delete the selected file/folder. Continue?"
    );
  };

  // ===== Open Rename Dialog =====
  const openRenameDialog = (item: FileItem) => {
    setRenameTargetPath(item.path);
    setRenameValue(item.name);
    setRenameDialogOpen(true);
  };

  // ===== Perform Rename =====
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
      } else {
        showAlert(
          "Rename failed",
          data?.detail || "Unknown error",
          "destructive"
        );
      }
    } catch (e) {
      showAlert("Rename failed", String(e), "destructive");
    }
  };

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
        setClipboard(null); // optional: paste করলে clear
      } else {
        showAlert(
          "Paste failed",
          data?.detail || "Unknown error",
          "destructive"
        );
      }
    } catch (e) {
      showAlert("Paste failed", String(e), "destructive");
    }
  };

  // ===== Copy To Clipboard =====
  const copyToClipboard = (item: FileItem) => {
    setClipboard({
      action: "copy",
      srcPath: item.path,
      name: item.name,
      type: item.type,
    });
    showAlert("Copied", `${item.name} is ready to paste`);
  };

  // ===== Text Editor =====
  const openEditor = async (path: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/ssh/read-file?session_id=${sessionId}&path=${encodeURIComponent(
          path
        )}`
      );
      const data = await res.json();

      if (data.success) {
        setEditorFile(path);
        setEditorContent(data.content || "");
        setOriginalContent(data.content || "");
        setEditorModified(false);

        // ✅ THIS LINE IS THE FIX
        setActiveTab("editor");
      } else {
        showAlert(
          "Open file failed",
          data?.detail || "Unknown error",
          "destructive",
          6000
        );
      }
    } catch (err: any) {
      showAlert(
        "Open file failed",
        err?.message || "Unknown error",
        "destructive",
        6000
      );
    }
  };

  // ===== Save Editor =====
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
        setTerminalOutput((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Saved: ${editorFile}`,
        ]);
        showAlert("Saved", editorFile);
      } else {
        showAlert(
          "Save failed",
          data?.detail || "Unknown error",
          "destructive",
          6000
        );
      }
    } catch (err: any) {
      showAlert(
        "Save failed",
        err?.message || "Unknown error",
        "destructive",
        6000
      );
    }
  };

  // ===== Close Editor =====
  const closeEditor = () => {
    if (editorModified) {
      openConfirm(
        { type: "closeEditor" },
        "Unsaved changes",
        "You have unsaved changes. Close editor anyway?"
      );
      return;
    }
    setEditorFile("");
    setEditorContent("");
    setActiveTab("files");
  };

  // ===== Terminal =====
  const executeCommand = async () => {
    if (!terminalInput.trim()) return;

    const command = terminalInput;
    setTerminalInput("");
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    setTerminalOutput((prev) => [...prev, `$ ${command}`]);

    try {
      const res = await fetch(`${API_URL}/api/ssh/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          command: command,
          working_dir: currentPath,
        }),
      });

      const data = await res.json();

      if (data.output) setTerminalOutput((prev) => [...prev, data.output]);
      if (data.error)
        setTerminalOutput((prev) => [...prev, `ERROR: ${data.error}`]);
    } catch (err: any) {
      setTerminalOutput((prev) => [
        ...prev,
        `ERROR: ${err?.message || "Unknown error"}`,
      ]);
    }
  };

  // ===== Handle Key Down =====
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setTerminalInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setTerminalInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setTerminalInput("");
      }
    }
  };

  // ===== System Monitor =====
  const loadSystemInfo = async () => {
    if (!connected) return;

    try {
      const res = await fetch(
        `${API_URL}/api/ssh/system-info?session_id=${sessionId}`
      );
      const data = await res.json();
      if (data.success) setSystemInfo(data.data);
    } catch (err) {
      console.log(err);
    }
  };

  // ===== Load Processes =====
  const loadProcesses = async () => {
    if (!connected) return;

    try {
      const res = await fetch(
        `${API_URL}/api/ssh/processes?session_id=${sessionId}`
      );
      const data = await res.json();
      if (data.success) setProcesses(data.processes);
    } catch (err) {
      console.log(err);
    }
  };

  // ===== Perform Kill Process =====
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
        setTerminalOutput((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Killed process ${pid}`,
        ]);
        showAlert("Process killed", `PID ${pid}`);
      } else {
        showAlert(
          "Kill failed",
          data?.error || data?.detail || "Unknown error",
          "destructive",
          6000
        );
      }
    } catch (err: any) {
      showAlert(
        "Kill failed",
        err?.message || "Unknown error",
        "destructive",
        6000
      );
    }
  };

  // ===== Kill Processes =====
  const killProcess = (pid: number) => {
    openConfirm(
      { type: "kill", pid },
      "Kill process?",
      `Are you sure you want to kill process PID ${pid}?`
    );
  };

  // ===== Confirm Dialog Handler =====
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

  // ===== Navigate Button =====
  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      loadFiles("/" + parts.join("/") || "/");
    }
  };

  // ===== Parent Dir =====
  const parentDir = (p: string) => {
    const parts = (p || "").split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  };

  // ===== Format Up Time =====
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  // ===== Booting Spinner UI =====
  if (appBooting) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="rounded-2xl shadow-xl px-10 py-8 flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
          <div className="text-lg font-semibold text-gray-800">
            Reconnecting...
          </div>
          <div className="text-sm text-gray-500">
            Restoring your last session
          </div>
        </div>
      </div>
    );
  }

  // ========================= UI =========================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bottom Right Alert Banner */}
      {uiAlert.open && (
        <div className="fixed bottom-4 right-4 z-50 w-105 max-w-[92vw]">
          <Alert
            variant={uiAlert.variant}
            className="relative flex items-start gap-3 pr-10"
          >
            {/* Icon */}
            {uiAlert.variant === "destructive" ? (
              <AlertTriangle className="h-5 w-5 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
            )}

            {/* Content */}
            <div className="min-w-0">
              <AlertTitle className="leading-tight">{uiAlert.title}</AlertTitle>
              {uiAlert.description ? (
                <AlertDescription className="mt-1">
                  {uiAlert.description}
                </AlertDescription>
              ) : null}
            </div>

            {/* Close */}
            <button
              onClick={() => setUiAlert((p) => ({ ...p, open: false }))}
              className="absolute right-3 top-3 opacity-70 hover:opacity-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirm}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Dialog */}
      <AlertDialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create new folder</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a folder name to create inside:{" "}
              <span className="font-mono">{currentPath}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-2">
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Linkedin"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  performCreateFolder();
                }
              }}
              autoFocus
            />
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              onClick={() => {
                setFolderDialogOpen(false);
                setFolderName("");
              }}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction onClick={performCreateFolder}>
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename</AlertDialogTitle>
            <AlertDialogDescription>Enter a new name.</AlertDialogDescription>
          </AlertDialogHeader>

          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                performRename();
              }
            }}
          />

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performRename}>
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!connected ? (
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-orange-500 p-4 rounded-full">
                <Server size={32} className="text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-1">
              SSH Server Manager
            </h1>
            <p className="text-gray-600 text-sm text-center mb-6">
              Connect to your remote Linux server
            </p>

            {/* Saved Connections */}
            {savedConnections.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-3 text-gray-700">
                  Saved Connections
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {savedConnections.map((conn) => (
                    <div
                      key={conn.id}
                      className="p-3 border-2 rounded-lg font-bold hover:border-blue-400 cursor-pointer group relative"
                      style={{ borderColor: conn.color }}
                      onClick={() => loadConnection(conn)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">{conn.name}</div>
                          <div className="text-xs text-gray-500">
                            {conn.username}@{conn.host}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConnection(conn.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-500 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">
                  Server IP/Host
                </label>
                <input
                  type="text"
                  value={credentials.host}
                  onChange={(e) =>
                    setCredentials({ ...credentials, host: e.target.value })
                  }
                  placeholder="144.91.85.229"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Port</label>
                  <input
                    type="number"
                    value={credentials.port}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        port: parseInt(e.target.value || "22", 10),
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
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
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex-1 bg-[#1a6d8e] text-white py-3 rounded-lg font-bold hover:bg-[#1a6d8e] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  {loading ? "Connecting..." : "Connect"}
                </button>

                <button
                  onClick={() => setShowSaveDialog(!showSaveDialog)}
                  className="px-4 py-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  title="Save connection"
                >
                  <Save size={18} />
                </button>
              </div>

              {showSaveDialog && (
                <div className="p-4 border rounded-lg bg-blue-50">
                  <label className="block text-sm font-bold mb-2">
                    Connection Name
                  </label>
                  <input
                    type="text"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                    placeholder="My Server"
                    className="w-full px-3 py-2 border rounded mb-2"
                  />
                  <button
                    onClick={saveConnection}
                    className="w-full bg-[#2A7B9B] text-white py-2 rounded-lg cursor-pointer font-bold hover:bg-[#1a6d8e]"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white border-b shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Remote Server Manager
                  </h1>
                  <p className="text-sm text-gray-600">
                    Connected to:{" "}
                    <span className="text-green-600 font-mono">
                      {credentials.username}@{credentials.host}
                    </span>
                    {systemInfo && (
                      <span className="ml-3 text-gray-400">
                        | {systemInfo.hostname} ({systemInfo.os})
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-4 py-2 bg-red-400 cursor-pointer text-white rounded"
                >
                  <LogOut size={18} />
                  Disconnect
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-7xl mx-auto px-4 mt-4">
            <div
              className="flex gap-2 border-b overflow-x-auto"
              onDragOver={(e) => {
                e.preventDefault();
                const types = Array.from(e.dataTransfer.types || []);
                if (types.includes("application/x-ssh-pinned")) {
                  e.dataTransfer.dropEffect = "move";
                } else {
                  e.dataTransfer.dropEffect = "copy";
                }
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
                  icon: Terminal,
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
                  className={`flex items-center cursor-pointer gap-2 px-4 py-2 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
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
                    currentPath === p.path
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-600 hover:text-gray-800"
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

                    // ✅ update current dragged index so it keeps moving smoothly
                    dragPinnedIndexRef.current = toIndex;
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  title={p.path}
                >
                  {/* Drag handle only */}
                  <span
                    className="px-2 py-2 cursor-grab active:cursor-grabbing select-none"
                    draggable
                    onDragStart={(e) => {
                      dragPinnedIndexRef.current = idx;

                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", "pinned"); // browser compat
                      e.dataTransfer.setData(
                        "application/x-ssh-pinned",
                        JSON.stringify({ fromIndex: idx, path: p.path })
                      );
                    }}
                    onDragEnd={() => {
                      dragPinnedIndexRef.current = null;
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⠿
                  </span>

                  {/* Clickable tab */}
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

            {/* Drag pinned tab here to remove */}
            {Array.isArray(pinnedFolders) && pinnedFolders.length > 0 && (
              <div
                className="ml-auto px-3 py-3 text-sm mt-6 rounded font-bold border border-dashed text-gray-500 select-none"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();

                  const raw = e.dataTransfer.getData(
                    "application/x-ssh-pinned"
                  );
                  if (!raw) return;

                  try {
                    const data = JSON.parse(raw);
                    const fromIndex = data?.fromIndex;

                    if (fromIndex === null || fromIndex === undefined) return;

                    setPinnedFolders((prev) =>
                      prev.filter((_, i) => i !== fromIndex)
                    );
                  } catch {}
                }}
              >
                ❌ Drop Here To Remove
              </div>
            )}

            {/* File Manager */}
            {activeTab === "files" && (
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={navigateUp}
                      className="p-2 hover:bg-gray-100 rounded"
                      title="Go up"
                    >
                      ↑
                    </button>
                    <span className="font-mono text-sm text-gray-600">
                      {currentPath}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateFolder}
                      className="flex items-center gap-2 px-4 py-2 bg-[#087ca6] text-white rounded cursor-pointer hover:bg-[#106d8f] text-sm"
                    >
                      <FolderPlus size={18} />
                      New Folder
                    </button>
                    <label className="flex items-center gap-2 px-4 py-2 bg-[#a881af] text-white rounded hover:bg-[#a881a8] cursor-pointer text-sm">
                      <Upload size={18} />
                      Upload
                      <input
                        type="file"
                        onChange={handleUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={pasteClipboard}
                      disabled={!clipboard}
                      className={`flex items-center cursor-pointer gap-2 px-4 py-2 rounded text-sm ${
                        clipboard
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      <ClipboardPaste size={18} />
                      Paste
                    </button>

                    <button
                      onClick={() => loadFiles()}
                      className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                    >
                      <RefreshCw size={18} />
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  {files.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
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
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer group"
                        draggable={item.type === "folder"}
                        onDragStart={(e) => {
                          if (item.type !== "folder") return;
                          e.dataTransfer.setData(
                            "application/x-ssh-folder",
                            JSON.stringify({ name: item.name, path: item.path })
                          );
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                      >
                        {item.type === "folder" ? (
                          <Folder size={18} className="text-blue-500" />
                        ) : (
                          <File size={18} className="text-gray-500" />
                        )}

                        <span
                          className="flex-1 text-sm"
                          onDoubleClick={() =>
                            item.type === "folder"
                              ? loadFiles(item.path)
                              : openEditor(item.path)
                          }
                        >
                          {item.name}
                        </span>

                        <span className="text-xs text-gray-500">
                          {item.sizeStr}
                        </span>
                        <span className="text-xs text-gray-400">
                          {item.modified}
                        </span>

                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          {item.type === "file" && (
                            <>
                              <button
                                onClick={() => openEditor(item.path)}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDownload(item.path, item.name)
                                }
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Download size={14} />
                              </button>
                            </>
                          )}

                          {item.type === "folder" && (
                            <button
                              onClick={() => loadFiles(item.path)}
                              className="p-1 hover:bg-gray-200 rounded text-blue-500"
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => openRenameDialog(item)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Rename"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            onClick={() => copyToClipboard(item)}
                            className="p-1 hover:bg-gray-200 rounded"
                            title="Copy"
                          >
                            <Copy size={14} />
                          </button>

                          <button
                            onClick={() => handleDelete(item.path)}
                            className="p-1 hover:bg-gray-200 rounded text-red-500"
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

            {/* Terminal */}
            {activeTab === "terminal" && (
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <div
                  ref={terminalRef}
                  className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm mb-4"
                >
                  {terminalOutput.map((line, i) => (
                    <div key={i} className="text-green-400 whitespace-pre-wrap">
                      {line}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-green-400 font-mono">$</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => {
                      handleKeyDown(e);
                      if (e.key === "Enter") executeCommand();
                    }}
                    placeholder="Enter command..."
                    className="flex-1 bg-transparent border-b border-gray-700 text-gray-800 focus:outline-none font-mono"
                  />
                  <button
                    onClick={executeCommand}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Execute
                  </button>
                </div>
              </div>
            )}

            {/* Editor */}
            {activeTab === "editor" && (
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                {editorFile ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Edit size={18} />
                        <span className="font-mono text-sm">{editorFile}</span>
                        {editorModified && (
                          <span className="text-orange-500 text-xs">
                            ● Modified
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditorFile}
                          disabled={!editorModified}
                          className="flex items-center cursor-pointer gap-2 px-4 py-2  text-white rounded-lg bg-black "
                        >
                          <Save size={18} />
                          Save
                        </button>
                        <button
                          onClick={closeEditor}
                          className="flex items-center cursor-pointer gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
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
                      className="w-full h-96 p-4 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <Edit size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Double-click a file in the File Manager to edit it</p>
                  </div>
                )}
              </div>
            )}

            {/* Processes */}
            {activeTab === "processes" && (
              <div className="mt-6 bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">
                    Running Processes (Top 20 by Memory)
                  </h3>
                  <button
                    onClick={loadProcesses}
                    className="p-2 border rounded hover:bg-gray-50"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">PID</th>
                        <th className="px-4 py-2 text-left">CPU %</th>
                        <th className="px-4 py-2 text-left">MEM %</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Command</th>
                        <th className="px-4 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processes.map((proc) => (
                        <tr
                          key={proc.pid}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="px-4 py-2">{proc.pid}</td>
                          <td className="px-4 py-2">
                            {proc.cpuPercent.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2">
                            {proc.memoryPercent.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2">{proc.status}</td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {proc.command.substring(0, 40)}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => killProcess(proc.pid)}
                              className="text-red-500 hover:text-red-700 text-xs"
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

            {/* System Monitor */}
            {activeTab === "monitor" && systemInfo && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <Cpu size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">CPU Usage</div>
                        <div className="text-2xl font-bold">
                          {systemInfo.cpuPercent}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${systemInfo.cpuPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <Database size={24} className="text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Memory</div>
                        <div className="text-2xl font-bold">
                          {systemInfo.memory.percent}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {systemInfo.memory.usedGb.toFixed(1)} /{" "}
                          {systemInfo.memory.totalGb.toFixed(1)} GB
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${systemInfo.memory.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <HardDrive size={24} className="text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Disk Usage</div>
                        <div className="text-2xl font-bold">
                          {systemInfo.disk.percent}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {systemInfo.disk.used} / {systemInfo.disk.total}
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${systemInfo.disk.percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">System Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Hostname:</span>
                      <span className="ml-2 font-mono">
                        {systemInfo.hostname}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">OS:</span>
                      <span className="ml-2 font-mono">{systemInfo.os}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Uptime:</span>
                      <span className="ml-2 font-mono">
                        {formatUptime(systemInfo.uptimeSeconds)}
                      </span>
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
