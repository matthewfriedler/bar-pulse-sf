import { CheckCircle2, Loader2, MapPin, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import {
  NEARBY_METERS,
  STATUS_META,
  VIBE_NOTES,
  distanceMeters,
  statusFor,
  type Bar,
} from "@/lib/barpulse";
import { cn } from "@/lib/utils";

type GeoState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "ok"; distance: number }
  | { phase: "far"; distance: number }
  | { phase: "denied" }
  | { phase: "unavailable"; message: string };

interface Props {
  bar: Bar | null;
  userId: string | null;
  onOpenChange: (open: boolean) => void;
  onPosted: () => void;
}

const WAITS = [0, 5, 10, 15, 20, 30, 45, 60];

export function UpdateDialog({ bar, userId, onOpenChange, onPosted }: Props) {
  const [geo, setGeo] = useState<GeoState>({ phase: "idle" });
  const [capacity, setCapacity] = useState(50);
  const [wait, setWait] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bar) return;
    setGeo({ phase: "idle" });
    setCapacity(50);
    setWait(0);
    setNote(null);
    setIsOwner(false);
  }, [bar]);

  function verifyLocation() {
    if (!bar) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({
        phase: "unavailable",
        message: "This device can't share a location, so we can't confirm you're at the bar.",
      });
      return;
    }
    setGeo({ phase: "checking" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = distanceMeters(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          { lat: bar.lat, lng: bar.lng },
        );
        setGeo(distance <= NEARBY_METERS ? { phase: "ok", distance } : { phase: "far", distance });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeo({ phase: "denied" });
        } else {
          setGeo({
            phase: "unavailable",
            message: "We couldn't get a location fix. Step outside or try again in a moment.",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  async function submit() {
    if (!bar || !userId || geo.phase !== "ok") return;
    setSaving(true);
    const { error } = await supabase.from("bar_updates").insert({
      bar_id: bar.id,
      user_id: userId,
      capacity,
      wait_minutes: wait,
      vibe_note: note,
      is_owner: isOwner,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Thanks! ${bar.name} is updated for everyone.`);
    onPosted();
    onOpenChange(false);
  }

  const preview = STATUS_META[statusFor({ capacity } as never)];

  return (
    <Dialog open={!!bar} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {bar && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Report {bar.name}</DialogTitle>
              <DialogDescription>
                We check your location first so every report comes from someone actually there.
              </DialogDescription>
            </DialogHeader>

            {geo.phase !== "ok" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-muted/60 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-5 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium">Confirm you're at {bar.name}</p>
                      <p className="text-muted-foreground">
                        You need to be within {NEARBY_METERS} meters (about two blocks) of{" "}
                        {bar.address}.
                      </p>
                    </div>
                  </div>
                </div>

                {geo.phase === "far" && (
                  <p className="flex gap-2 rounded-2xl bg-status-packed-soft p-3 text-sm text-status-packed">
                    <ShieldAlert className="size-4 shrink-0" />
                    You're about {Math.round(geo.distance)} m away — too far to report on{" "}
                    {bar.name}. Head over and try again from the door.
                  </p>
                )}
                {geo.phase === "denied" && (
                  <p className="flex gap-2 rounded-2xl bg-status-packed-soft p-3 text-sm text-status-packed">
                    <ShieldAlert className="size-4 shrink-0" />
                    Location access was blocked. Turn location on for this site in your browser
                    settings, then try again — we can't verify a report without it.
                  </p>
                )}
                {geo.phase === "unavailable" && (
                  <p className="flex gap-2 rounded-2xl bg-status-packed-soft p-3 text-sm text-status-packed">
                    <ShieldAlert className="size-4 shrink-0" />
                    {geo.message}
                  </p>
                )}

                <Button className="w-full" onClick={verifyLocation} disabled={geo.phase === "checking"}>
                  {geo.phase === "checking" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Checking your location…
                    </>
                  ) : (
                    "Check my location"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="flex items-center gap-2 rounded-2xl bg-status-clear-soft p-3 text-sm text-status-clear">
                  <CheckCircle2 className="size-4" />
                  Verified — you're {Math.round(geo.distance)} m from the door.
                </p>

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

                <div className="space-y-2">
                  <Label>Wait at the door</Label>
                  <div className="flex flex-wrap gap-2">
                    {WAITS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWait(w)}
                        className={cn(
                          "rounded-full border border-border px-3 py-1.5 text-sm transition-colors",
                          wait === w
                            ? "border-transparent bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        {w === 0 ? "No wait" : `${w} min`}
                      </button>
                    ))}
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

                {isStaff ? (
                  <>
                    <label className="flex items-center gap-3 rounded-2xl border border-border p-3 text-sm">
                      <Checkbox
                        checked={asStaff}
                        onCheckedChange={(c) => setAsStaff(c === true)}
                      />
                      <span>
                        <span className="font-medium">Post as verified staff</span>
                        <span className="block text-muted-foreground">
                          Your reading carries more weight than a patron's.
                        </span>
                      </span>
                    </label>
                    {asStaff && (
                      <div className="space-y-2">
                        <Label htmlFor="door-count">Heads inside right now (optional)</Label>
                        <Input
                          id="door-count"
                          inputMode="numeric"
                          placeholder="e.g. 120"
                          value={doorCount}
                          onChange={(e) => setDoorCount(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                    Work here? <Link to="/staff" className="font-medium text-primary underline">
                      Ask to be verified
                    </Link>{" "}
                    and your readings will count for more.
                  </p>
                )}


                <Button className="w-full" onClick={submit} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : "Post update"}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}