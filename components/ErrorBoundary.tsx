// Root error boundary. Step 16 wires it into app/layout.tsx and adds
// per-feature boundaries so a failure in the terminal doesn't kill the
// file manager.

"use client";

import React from "react";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Phase 4 wires Sentry here.
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full items-center justify-center p-6 text-sm text-muted-foreground">
            Something went wrong. Try refreshing the page.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
