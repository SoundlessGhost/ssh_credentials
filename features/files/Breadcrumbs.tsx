"use client";

import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { useConnection } from "@/stores/connection";

function segmentsOf(path: string) {
  const trimmed = path.replace(/\/+$/, "") || "/";
  if (trimmed === "/") return [{ label: "/", path: "/", isRoot: true }];
  const parts = trimmed.split("/").filter(Boolean);
  const segs: { label: string; path: string; isRoot?: boolean }[] = [
    { label: "/", path: "/", isRoot: true },
  ];
  let acc = "";
  for (const p of parts) {
    acc += "/" + p;
    segs.push({ label: p, path: acc });
  }
  return segs;
}

export function Breadcrumbs() {
  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const navigate = useConnection((s) => s.navigate);

  if (!sessionId) {
    return (
      <div className="truncate rounded-md border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
        Not connected — add a server in the sidebar
      </div>
    );
  }

  const segments = segmentsOf(currentPath);
  return (
    <nav
      className="flex min-w-0 items-center gap-0.5 truncate rounded-md border bg-muted/40 px-2 py-1 text-xs"
      aria-label="Path"
    >
      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1;
        return (
          <React.Fragment key={seg.path}>
            <button
              type="button"
              onClick={() => navigate(seg.path)}
              disabled={isLast}
              title={seg.path}
              className={`flex items-center gap-1 rounded px-1 py-0.5 ${
                isLast
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {seg.isRoot ? <Home className="h-3 w-3" /> : <span>{seg.label}</span>}
            </button>
            {!isLast && (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
