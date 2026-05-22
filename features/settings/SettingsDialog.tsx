"use client";

import React, { useState } from "react";
import { Loader2, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useSettingsUi } from "@/stores/settingsUi";
import { useMe } from "@/hooks/useAuth";
import * as authApi from "@/lib/api/auth";

export function SettingsDialog() {
  const open = useSettingsUi((s) => s.open);
  const setOpen = useSettingsUi((s) => s.setOpen);
  const { data: me } = useMe();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-3 pt-2">
            <Row label="Email">
              <span className="font-mono">{me?.email ?? "—"}</span>
            </Row>
            <Row label="Role">
              {me?.is_admin ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="h-3 w-3" /> Admin
                </span>
              ) : (
                <span className="text-muted-foreground">User</span>
              )}
            </Row>
            <Row label="Member since">
              {me?.created_at?.slice(0, 10) ?? "—"}
            </Row>
            <Row label="Email verified">
              {me?.email_verified_at ? (
                <span className="text-emerald-500">Verified</span>
              ) : (
                <span className="text-amber-500">Not verified</span>
              )}
            </Row>
          </TabsContent>

          <TabsContent value="security" className="space-y-3 pt-2">
            <ChangePasswordForm />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Sign out from every browser and device. The current tab stays
              signed in.
            </p>
            <SignOutEverywhere />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function ChangePasswordForm() {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New password and confirmation do not match");
      return;
    }
    if (oldPw === newPw) {
      toast.error("New password must differ from current");
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword(oldPw, newPw);
      toast.success("Password changed · other devices signed out");
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium">Current password</label>
      <Input
        type="password"
        value={oldPw}
        autoComplete="current-password"
        onChange={(e) => setOldPw(e.target.value)}
      />
      <label className="block text-xs font-medium">New password</label>
      <Input
        type="password"
        value={newPw}
        autoComplete="new-password"
        onChange={(e) => setNewPw(e.target.value)}
      />
      <label className="block text-xs font-medium">Confirm new password</label>
      <Input
        type="password"
        value={confirmPw}
        autoComplete="new-password"
        onChange={(e) => setConfirmPw(e.target.value)}
      />
      <Separator className="my-2" />
      <Button
        size="sm"
        onClick={submit}
        disabled={busy || !oldPw || !newPw || !confirmPw}
        className="w-full"
      >
        {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Change password
      </Button>
      <p className="text-[10px] text-muted-foreground">
        Changing your password signs out all other browsers automatically.
      </p>
    </div>
  );
}

function SignOutEverywhere() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (
      !window.confirm(
        "Sign out from every other browser and device? This tab stays signed in.",
      )
    )
      return;
    setBusy(true);
    try {
      await authApi.logoutAll();
      toast.success("Signed out everywhere else");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={run}
      className="w-full"
    >
      {busy ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
      )}
      Sign out everywhere
    </Button>
  );
}
