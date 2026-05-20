"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useMe } from "@/hooks/useAuth";
import { useConnection } from "@/stores/connection";
import { api, ApiError } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useMe();

  const sessionId = useConnection((s) => s.sessionId);
  const currentPath = useConnection((s) => s.currentPath);
  const clearConnection = useConnection((s) => s.clear);

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.replace("/login");
    }
  }, [isLoading, isError, user, router]);

  // Validate persisted SSH session on app mount — if the backend has
  // restarted / GC'd the session, drop the stale sessionId so the UI
  // shows "Disconnected" instead of pretending we're still in.
  useEffect(() => {
    if (!user || !sessionId) return;
    let cancelled = false;
    api(endpoints.ssh.list, {
      query: { session_id: sessionId, path: currentPath || "/" },
    }).catch((err) => {
      if (cancelled) return;
      if (err instanceof ApiError && err.status === 404) {
        clearConnection();
      }
    });
    return () => {
      cancelled = true;
    };
    // Run once per user-login event. sessionId/currentPath changes don't retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
