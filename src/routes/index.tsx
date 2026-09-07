import { createFileRoute } from "@tanstack/react-router";
import { Activity, LogOut, Moon, Sun } from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AuthDialog } from "@/components/AuthDialog";
import { BarCard } from "@/components/BarCard";
import { DEFAULT_FILTERS, FilterBar, type Filters } from "@/components/FilterBar";
import { UpdateDialog } from "@/components/UpdateDialog";
import { Button } from "@/components/ui/button";
import { useBarPulse, useSession } from "@/hooks/useBarPulse";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import {
  NEARBY_METERS,
  STATUS_META,
  distanceMeters,
  type Bar,
} from "@/lib/barpulse";

const BarMap = lazy(() => import("@/components/BarMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BarPulse — Live Marina & Cow Hollow bar waits" },
      {
        name: "description",
        content:
          "See which Marina and Cow Hollow bars have no wait, which are filling up, and which have a line out the door — reported live by people actually there.",
      },
      { property: "og:title", content: "BarPulse — Live SF bar capacity & wait times" },
      {
        property: "og:description",
        content:
          "A live map of 15 Marina and Cow Hollow bars with crowd levels, wait times, and vibe notes verified by GPS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { theme, toggle } = useTheme();
  const { bars, latestByBar, consensusByBar, isLoading, refetchUpdates } = useBarPulse();
  const { session, username } = useSession();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [reportBar, setReportBar] = useState<Bar | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // keep "x min ago" labels honest
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);


  const visibleBars = useMemo(
    () =>
      bars.filter((bar) => {
        if (filters.neighborhood !== "all" && bar.neighborhood !== filters.neighborhood)
          return false;
        if (filters.vibe !== "all" && bar.vibe !== filters.vibe) return false;
        if (
          filters.status !== "all" &&
          (consensusByBar.get(bar.id)?.status ?? "unknown") !== filters.status
        )
          return false;
        return true;
      }),
    [bars, filters, consensusByBar],
  );

  const counts = useMemo(() => {
    const c = { clear: 0, busy: 0, packed: 0, unknown: 0 };
    for (const bar of bars) c[consensusByBar.get(bar.id)?.status ?? "unknown"] += 1;
    return c;
  }, [bars, consensusByBar]);

  function requestReport(bar: Bar) {
    setSelectedId(bar.id);
    if (!session) {
      toast.info("Create a free account to post live updates.");
      setAuthOpen(true);
      return;
    }
    setReportBar(bar);
  }

  /** One-tap, GPS-verified presence ping — the cheapest real capacity signal. */
  function checkIn(bar: Bar) {
    setSelectedId(bar.id);
    if (!session) {
      toast.info("Create a free account to check in.");
      setAuthOpen(true);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("This device can't share a location, so we can't verify you're at the bar.");
      return;
    }
    setCheckingInId(bar.id);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const distance = distanceMeters(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          { lat: bar.lat, lng: bar.lng },
        );
        if (distance > NEARBY_METERS) {
          setCheckingInId(null);
          toast.error(
            `You're about ${Math.round(distance)} m from ${bar.name} — get closer to check in.`,
          );
          return;
        }
        const { error } = await supabase.from("bar_checkins").insert({
          bar_id: bar.id,
          user_id: session.user.id,
          accuracy_meters: pos.coords.accuracy,
        });
        setCheckingInId(null);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success(`Checked in at ${bar.name}. Rate the crowd to make it count more.`);
        void refetchUpdates();
      },
      (err) => {
        setCheckingInId(null);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked. Turn it on for this site to check in."
            : "We couldn't get a location fix. Try again in a moment.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
          <div
            className="grid size-9 place-items-center rounded-xl text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Activity className="size-5" />
          </div>
          <div className="mr-auto min-w-0">
            <h1 className="font-display text-xl leading-none font-extrabold">BarPulse</h1>
            <p className="truncate text-xs text-muted-foreground">
              Marina &amp; Cow Hollow, live right now
            </p>
          </div>

          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle light and dark mode">
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>

          {session ? (
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-full py-1 pr-1 pl-3 transition-colors hover:bg-accent"
              aria-label="Your account"
            >
              <span className="hidden text-sm font-medium sm:inline">@{username ?? "you"}</span>
              <UserAvatar avatarPath={profile?.avatar_url ?? null} username={username} />
            </Link>
          ) : (
            <Button onClick={() => setAuthOpen(true)}>Sign in</Button>
          )}

        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="order-2 flex w-full flex-col gap-3 lg:order-1 lg:w-[400px] lg:shrink-0">
          <FilterBar filters={filters} onChange={setFilters} resultCount={visibleBars.length} />

          <div className="grid grid-cols-3 gap-2">
            {(["clear", "busy", "packed"] as const).map((key) => (
              <div
                key={key}
                className={`rounded-2xl p-3 text-center ${STATUS_META[key].soft} ${STATUS_META[key].text}`}
              >
                <p className="font-display text-2xl font-extrabold">{counts[key]}</p>
                <p className="text-[11px] leading-tight font-medium">{STATUS_META[key].label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-19rem)] lg:overflow-y-auto lg:pr-1">
            {isLoading && <p className="text-sm text-muted-foreground">Loading tonight's pulse…</p>}
            {!isLoading && visibleBars.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No bars match these filters right now.
              </p>
            )}
            {visibleBars.map((bar) => (
              <BarCard
                key={bar.id}
                bar={bar}
                update={latestByBar.get(bar.id)}
                consensus={consensusByBar.get(bar.id)}
                active={selectedId === bar.id}
                checkingIn={checkingInId === bar.id}
                onSelect={() => setSelectedId(bar.id)}
                onReport={() => requestReport(bar)}
                onCheckIn={() => checkIn(bar)}
              />
            ))}
          </div>
        </section>

        <section className="order-1 h-[45vh] min-h-[320px] w-full overflow-hidden rounded-3xl border border-border shadow-card lg:order-2 lg:h-[calc(100vh-6.5rem)] lg:flex-1">
          <Suspense
            fallback={
              <div className="grid h-full place-items-center bg-muted text-sm text-muted-foreground">
                Loading map…
              </div>
            }
          >
            <ClientOnlyMap
              bars={visibleBars}
              consensusByBar={consensusByBar}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </Suspense>
        </section>
      </main>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <UpdateDialog
        bar={reportBar}
        userId={session?.user.id ?? null}
        onOpenChange={(open) => !open && setReportBar(null)}
        onPosted={() => void refetchUpdates()}
      />
    </div>
  );
}

function ClientOnlyMap(props: React.ComponentProps<typeof BarMap>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="grid h-full place-items-center bg-muted text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }
  return <BarMap {...props} />;
}