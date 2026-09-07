import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/useBarPulse";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { VIBES } from "@/lib/barpulse";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your BarPulse account — username, photo & preferences" },
      {
        name: "description",
        content:
          "Update your BarPulse username, profile picture and password, and set the neighborhood, vibe and display preferences the map opens with.",
      },
      { property: "og:title", content: "Your BarPulse account" },
      {
        property: "og:description",
        content: "Manage your BarPulse username, profile picture, password and app preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { session, profile, ready, refreshProfile } = useSession();
  const { theme, set: setTheme } = useTheme();

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/" });
  }, [ready, session, navigate]);

  if (!session || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading your account…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" asChild aria-label="Back to the map">
            <Link to="/">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="font-display mr-auto text-xl font-extrabold">Your account</h1>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Signed out");
              void navigate({ to: "/" });
            }}
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl p-4">
        <Tabs defaultValue="profile">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">
              Profile
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1">
              Password
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              App settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <ProfileSection
              userId={profile.id}
              username={profile.username}
              avatarPath={profile.avatar_url}
              onSaved={refreshProfile}
            />
          </TabsContent>

          <TabsContent value="password" className="mt-4">
            <PasswordSection />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <SettingsSection
              userId={profile.id}
              settings={profile.settings}
              theme={theme}
              setTheme={setTheme}
              onSaved={refreshProfile}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="shadow-card space-y-4 rounded-3xl border border-border bg-card p-5">
      {children}
    </div>
  );
}

function ProfileSection({
  userId,
  username,
  avatarPath,
  onSaved,
}: {
  userId: string;
  username: string;
  avatarPath: string | null;
  onSaved: () => Promise<void> | void;
}) {
  const [handle, setHandle] = useState(username);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveUsername() {
    const next = handle.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(next)) {
      toast.error("Usernames are 3–20 characters: letters, numbers, underscores.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: next, username_confirmed: true })
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
    toast.success("Username updated");
    await onSaved();
  }

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file for your profile picture.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That picture is over 5 MB — try a smaller one.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }
    const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile picture updated");
    await onSaved();
  }

  return (
    <Card>
      <div className="flex items-center gap-4">
        <UserAvatar avatarPath={avatarPath} username={username} className="size-16" />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">JPG or PNG, up to 5 MB.</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {uploading ? "Uploading…" : "Change picture"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadAvatar(file);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="acct-username">Username</Label>
        <Input
          id="acct-username"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground">
          Shown next to every crowd report you post.
        </p>
      </div>
      <Button onClick={saveUsername} disabled={busy || handle.trim().toLowerCase() === username}>
        {busy ? "Saving…" : "Save username"}
      </Button>
    </Card>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const attrs: Record<string, string> = { password: next };
    if (current) attrs.current_password = current;
    const { error } = await supabase.auth.updateUser(attrs as { password: string });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    setCurrent("");
    setNext("");
  }

  return (
    <Card>
      <div className="space-y-2">
        <Label htmlFor="acct-current">Current password</Label>
        <Input
          id="acct-current"
          type="password"
          value={current}
          autoComplete="current-password"
          onChange={(e) => setCurrent(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank if you signed up with Google and are setting a password for the first time.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="acct-new">New password</Label>
        <Input
          id="acct-new"
          type="password"
          value={next}
          autoComplete="new-password"
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <Button onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Update password"}
      </Button>
    </Card>
  );
}

function SettingsSection({
  userId,
  settings,
  theme,
  setTheme,
  onSaved,
}: {
  userId: string;
  settings: AppSettings;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  onSaved: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<AppSettings>({ ...DEFAULT_SETTINGS, ...settings, theme });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ settings: draft as unknown as Record<string, never> }).eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTheme(draft.theme);
    toast.success("Settings saved");
    await onSaved();
  }

  return (
    <Card>
      <div className="space-y-2">
        <Label>Neighborhood the map opens with</Label>
        <Select
          value={draft.defaultNeighborhood}
          onValueChange={(v) => setDraft({ ...draft, defaultNeighborhood: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All neighborhoods</SelectItem>
            {(["Marina", "Cow Hollow"] as const).map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Vibe you usually look for</Label>
        <Select value={draft.defaultVibe} onValueChange={(v) => setDraft({ ...draft, defaultVibe: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any vibe</SelectItem>
            {VIBES.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ToggleRow
        label="Hide bars with no live reports"
        hint="Only show places someone has reported on recently."
        checked={draft.hideUnknown}
        onChange={(v) => setDraft({ ...draft, hideUnknown: v })}
      />
      <ToggleRow
        label="Sort the list by how close I am"
        hint="Uses your location once when the list loads."
        checked={draft.sortByDistance}
        onChange={(v) => setDraft({ ...draft, sortByDistance: v })}
      />
      <ToggleRow
        label="Dark mode"
        hint="Follows your account on any device."
        checked={draft.theme === "dark"}
        onChange={(v) => setDraft({ ...draft, theme: v ? "dark" : "light" })}
      />

      <Button onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save settings"}
      </Button>
    </Card>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
