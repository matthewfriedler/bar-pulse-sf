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

interface Props {
  open: boolean;
  userId: string;
  suggested: string;
  onDone: () => void;
}

export function UsernamePrompt({ open, userId, suggested, onDone }: Props) {
  const [username, setUsername] = useState(suggested);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const handle = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      toast.error("Usernames are 3–20 characters: letters, numbers, underscores.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: handle, username_confirmed: true })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("duplicate")
          ? "That username is taken — try another."
          : error.message,
      );
      return;
    }
    toast.success(`You're @${handle} on BarPulse`);
    onDone();
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Pick your username</DialogTitle>
          <DialogDescription>
            This is the name shown next to the crowd reports you post.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bp-new-username">Username</Label>
            <Input
              id="bp-new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "That's me"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
