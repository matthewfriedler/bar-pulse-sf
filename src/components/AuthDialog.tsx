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
import { lovable } from "@/integrations/lovable";
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
  const [googleBusy, setGoogleBusy] = useState(false);

  async function signInWithGoogle() {
    setGoogleBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleBusy(false);
      toast.error("Google sign-in didn't go through. Try again or use a username instead.");
      return;
    }
    if (result.redirected) return;
    setGoogleBusy(false);
    onOpenChange(false);
    toast.success("Signed in with Google");
  }

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
            You need an account to post live crowd reports.
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={googleBusy}
          onClick={signInWithGoogle}
        >
          <GoogleMark />
          {googleBusy ? "Opening Google…" : "Continue with Google"}
        </Button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or use a username</span>
          <span className="h-px flex-1 bg-border" />
        </div>

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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}
