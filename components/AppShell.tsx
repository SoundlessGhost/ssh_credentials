"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Crown,
  LayoutGrid,
  List as ListIcon,
  LogOut,
  RefreshCw,
  Search,
  Server,
  Settings,
  Terminal as TerminalIcon,
  User as UserIcon,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { Breadcrumbs } from "@/features/files/Breadcrumbs";
import { useConnection } from "@/stores/connection";
import { useUiFilters } from "@/stores/uiFilters";
import { useLogout, useMe } from "@/hooks/useAuth";

type AppShellProps = {
  sidebar?: React.ReactNode;
  actionBar?: React.ReactNode;
  filePane?: React.ReactNode;
  terminal?: React.ReactNode;
  uploadTray?: React.ReactNode;
  statusBarExtra?: React.ReactNode;
};

export function AppShell({
  sidebar,
  actionBar,
  filePane,
  terminal,
  uploadTray,
  statusBarExtra,
}: AppShellProps) {
  const [terminalOpen, setTerminalOpen] = useState(false);

  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const hostname = useConnection((s) => s.hostname);
  const os = useConnection((s) => s.os);
  const canBack = useConnection((s) => s.canBack());
  const canForward = useConnection((s) => s.canForward());
  const back = useConnection((s) => s.back);
  const forward = useConnection((s) => s.forward);
  const goUp = useConnection((s) => s.goUp);

  const searchQuery = useUiFilters((s) => s.searchQuery);
  const setSearchQuery = useUiFilters((s) => s.setSearchQuery);
  const viewMode = useUiFilters((s) => s.viewMode);
  const setViewMode = useUiFilters((s) => s.setViewMode);

  const qc = useQueryClient();
  const connected = !!sessionId;

  const refresh = () => {
    if (!sessionId) return;
    qc.invalidateQueries({ queryKey: ["files", sessionId, currentPath] });
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* ===== Top header bar ===== */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-3">
        <div className="flex items-center gap-2 pr-2">
          <Server className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">VPS Manager</span>
        </div>
        <Separator orientation="vertical" className="h-6" />

        {/* Nav buttons */}
        <NavButton
          icon={<ArrowLeft className="h-4 w-4" />}
          label="Back (Alt+←)"
          disabled={!connected || !canBack}
          onClick={back}
        />
        <NavButton
          icon={<ArrowRight className="h-4 w-4" />}
          label="Forward (Alt+→)"
          disabled={!connected || !canForward}
          onClick={forward}
        />
        <NavButton
          icon={<ArrowUp className="h-4 w-4" />}
          label="Up one level (Backspace)"
          disabled={!connected || currentPath === "/"}
          onClick={goUp}
        />

        {/* Breadcrumbs */}
        <div className="ml-1 flex min-w-0 flex-1 items-center">
          <Breadcrumbs />
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter visible files"
              className="h-8 w-56 pl-7 pr-7 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!connected}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Refresh"
                disabled={!connected}
                onClick={refresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh (F5)</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                aria-label="List view"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>List view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
                disabled
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Grid view (Phase 2 later)</TooltipContent>
          </Tooltip>

          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      {/* ===== Body (sidebar + main) =====
          Plain flex layout — no more ResizablePanel for sidebar. v4 was
          collapsing below minSize unpredictably. Fixed-width sidebar
          (resizable handle for it can come back as Phase 4.5 polish).
          Vertical resize for terminal stays. */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground">
          {sidebar}
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <ResizablePanelGroup
            orientation="vertical"
            className="flex-1"
            key={`vstack-${terminalOpen ? "open" : "closed"}`}
          >
            <ResizablePanel defaultSize={terminalOpen ? 65 : 100} minSize={30}>
              <div className="flex h-full flex-col overflow-hidden">
                {actionBar}
                <main className="flex-1 overflow-hidden">{filePane}</main>
              </div>
            </ResizablePanel>

            {terminalOpen && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={35} minSize={15} maxSize={70}>
                  <section className="flex h-full flex-col border-t bg-card">
                    <div className="flex h-9 items-center justify-between border-b px-2">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <TerminalIcon className="h-3.5 w-3.5" />
                        Terminal
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setTerminalOpen(false)}
                        aria-label="Collapse terminal"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {terminal ?? <TerminalPlaceholder />}
                    </div>
                  </section>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>

      {/* ===== Status bar ===== */}
      <footer className="flex h-7 shrink-0 items-center gap-3 border-t bg-card px-3 text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={() => setTerminalOpen((v) => !v)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
        >
          <TerminalIcon className="h-3 w-3" />
          Terminal
          {terminalOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </button>
        <Separator orientation="vertical" className="h-3" />
        {connected ? (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {hostname ?? "Connected"}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
            Disconnected
          </span>
        )}
        {os && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span>{os}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {statusBarExtra}
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            v0.4 · live
          </Badge>
        </div>
      </footer>

      {/* Floating upload tray slot (step 10) */}
      {uploadTray && (
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute bottom-10 right-4">
            {uploadTray}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const router = useRouter();
  const { data: user } = useMe();
  const logout = useLogout();

  const onLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="User menu" className="relative">
          <UserIcon className="h-4 w-4" />
          {user?.is_admin && (
            <Crown className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-amber-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs">
          <div className="flex items-center gap-1.5">
            <span className="truncate">{user?.email ?? "Signed in"}</span>
            {user?.is_admin && (
              <Crown className="h-3 w-3 shrink-0 text-amber-500" />
            )}
          </div>
          {user?.is_admin && (
            <div className="mt-0.5 text-[10px] font-normal text-amber-600 dark:text-amber-500">
              Admin
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user?.is_admin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Crown className="mr-2 h-3.5 w-3.5 text-amber-500" /> Admin dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-3.5 w-3.5" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            {icon}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function TerminalPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Terminal lands in step 11.
    </div>
  );
}
