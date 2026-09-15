import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Clock, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useBarPulse, useSession } from "@/hooks/useBarPulse";
import { useIsAdmin, useMyStaff } from "@/hooks/useStaff";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_META, VIBE_NOTES, statusForCapacity, timeAgoLabel } from "@/lib/barpulse";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff readings — BarPulse" },
      {
        name: "description",
        content:
          "Bar owners and staff post verified crowd readings for their venue, so BarPulse shows the real door situation.",
      },
      { property: "og:title", content: "Staff readings — BarPulse" },
      {
        property: "og:description",
        content: "Verified owners and staff keep their bar's crowd level and wait time honest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff / door" },
];

function StaffPage() {
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const { bars, latestByBar, consensusByBar, refetchUpdates } = useBarPulse();
  const userId = session?.user.id ?? null;
  const { claims, approvedBarIds, isLoading, refetch } = useMyStaff(userId);
  const isAdmin = useIsAdmin(userId);

  const [claimBar, setClaimBar] = useState("");
  const [claimRole, setClaimRole] = useState("staff");
  const [claimNote, setClaimNote] = useState("");
  const [claiming, setClaiming] = useState(false);

  const approvedBars = useMemo(
    () => bars.filter((b) => approvedBarIds.has(b.id)),
    [bars, approvedBarIds],
  );
  const [activeBar, setActiveBar] = useState("");
  useEffect(() => {
    if (!activeBar && approvedBars[0]) setActiveBar(approvedBars[0].id);
  }, [approvedBars, activeBar]);

  const [capacity, setCapacity] = useState(50);
  const [wait, setWait] = useState(0);
  const [doorCount, setDoorCount] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/" });
  }, [ready, session, navigate]);

  async function submitClaim() {
    if (!userId || !claimBar) return;
    setClaiming(true);
    const { error } = await supabase.from("bar_staff").insert({
      bar_id: claimBar,
      user_id: userId,
      role: claimRole,
      note: claimNote || null,
    });
    setClaiming(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setClaimNote("");
    setClaimBar("");
    void refetch();
    toast.success("Request sent. We'll review it and let you know.");
  }

  async function postReading() {
    if (!userId || !activeBar) return;
    setPosting(true);
    const { error } = await supabase.from("bar_updates").insert({
      bar_id: activeBar,
      user_id: userId,
      capacity,
      wait_minutes: wait,
      vibe_note: note,
      is_owner: true,
      source: "staff",
      door_count: doorCount ? Number(doorCount) : null,
    });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDoorCount("");
    setNote(null);
    void refetchUpdates();
    toast.success("Posted. Your bar's reading is live.");
  }

  const preview = STATUS_META[statusForCapacity(capacity)];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" asChild aria-label="Back to the map">
            <Link to="/">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="mr-auto font-display text-xl font-extrabold">Staff readings</h1>
          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">Review requests</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading your bars…</p>}

        {approvedBars.length > 0 && (
          <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <BadgeCheck className="size-5 text-primary" /> Post a verified reading
            </h2>

            <div className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label>Bar</Label>
                <Select value={activeBar} onValueChange={setActiveBar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a bar" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedBars.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <Label>How full is it?</Label>
                  <span className={cn("font-display text-lg font-bold", preview.text)}>
                    {capacity}% · {preview.label}
                  </span>
                </div>
                <Slider
                  value={[capacity]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(v) => setCapacity(v[0] ?? 0)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wait">Wait at the door (minutes)</Label>
                  <Input
                    id="wait"
                    inputMode="numeric"
                    value={wait}
                    onChange={(e) => setWait(Number(e.target.value.replace(/\D/g, "")) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heads">Heads inside (optional)</Label>
                  <Input
                    id="heads"
                    inputMode="numeric"
                    placeholder="e.g. 120"
                    value={doorCount}
                    onChange={(e) => setDoorCount(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Vibe note (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {VIBE_NOTES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setNote(note === v ? null : v)}
                      className={cn(
                        "rounded-full border border-border px-3 py-1.5 text-sm transition-colors",
                        note === v
                          ? "border-transparent bg-secondary text-secondary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={postReading} disabled={posting || !activeBar}>
                {posting ? <Loader2 className="size-4 animate-spin" /> : "Post reading"}
              </Button>

              {activeBar && (
                <p className="text-xs text-muted-foreground">
                  On the map now:{" "}
                  {consensusByBar.get(activeBar)?.capacity != null
                    ? `${consensusByBar.get(activeBar)?.capacity}% full`
                    : "no live reading"}
                  {latestByBar.get(activeBar) &&
                    ` · last report ${timeAgoLabel(latestByBar.get(activeBar)!.created_at)}`}
                  {" · "}
                  {consensusByBar.get(activeBar)?.agrees ?? 0} confirmed,{" "}
                  {consensusByBar.get(activeBar)?.disputes ?? 0} disputed by patrons
                </p>
              )}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Claim your bar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us where you work. Once we verify you, your readings show as staff-confirmed.
          </p>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bar</Label>
                <Select value={claimBar} onValueChange={setClaimBar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a bar" />
                  </SelectTrigger>
                  <SelectContent>
                    {bars.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Your role</Label>
                <Select value={claimRole} onValueChange={setClaimRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">How can we reach you to confirm?</Label>
              <Textarea
                id="note"
                placeholder="Work email, phone at the bar, or anything that proves you work there."
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
              />
            </div>
            <Button onClick={submitClaim} disabled={claiming || !claimBar}>
              {claiming ? <Loader2 className="size-4 animate-spin" /> : "Send request"}
            </Button>
          </div>

          {claims.length > 0 && (
            <ul className="mt-5 space-y-2">
              {claims.map((c) => {
                const bar = bars.find((b) => b.id === c.bar_id);
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-2xl border border-border p-3 text-sm"
                  >
                    {c.status === "approved" ? (
                      <BadgeCheck className="size-4 text-status-clear" />
                    ) : c.status === "rejected" ? (
                      <ShieldAlert className="size-4 text-status-packed" />
                    ) : (
                      <Clock className="size-4 text-status-busy" />
                    )}
                    <span className="font-medium">{bar?.name ?? c.bar_id}</span>
                    <span className="text-muted-foreground">{c.role}</span>
                    <span className="ml-auto text-muted-foreground capitalize">{c.status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
