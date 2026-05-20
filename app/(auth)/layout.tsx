import React from "react";
import { Server } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-6 flex items-center gap-2 text-foreground">
        <Server className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">VPS Manager</span>
      </div>
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        {children}
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground">
        Linux VPS files via Windows-Explorer UI · v0.3 · phase 3
      </p>
    </div>
  );
}
