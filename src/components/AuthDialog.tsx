import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/lib/barpulse";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const handle = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      toast.error("Usernames are 3–20 characters: letters, numbers, underscores.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const email = usernameToEmail(handle);
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { username: handle }, emailRedirectTo: window.location.origin },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already registered")
          ? "That username is taken. Try signing in instead."
          : error.message,
      );
      return;
    }
    toast.success(mode === "signup" ? `Welcome to BarPulse, @${handle}` : `Welcome back, @${handle}`);
    setPassword("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {mode === "signup" ? "Join BarPulse" : "Welcome back"}
          </DialogTitle>
          <DialogDescription>
            You need an account to post live crowd reports. No email required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bp-username">Username</Label>
            <Input
              id="bp-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="marinamike"
              autoComplete="username"
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bp-password">Password</Label>
            <Input
              id="bp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "One sec…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </DialogContent>
    </Dialog>
  );
}