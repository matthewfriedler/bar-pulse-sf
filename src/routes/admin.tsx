import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useBarPulse, useSession } from "@/hooks/useBarPulse";
import { useIsAdmin, type StaffClaim } from "@/hooks/useStaff";
import { supabase } from "@/integrations/supabase/client";
import { refreshBaselines, refreshPlaceCache } from "@/lib/places.functions";
import { timeAgoLabel } from "@/lib/barpulse";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Approve staff requests — BarPulse" },
      {
        name: "description",
        content: "Review and approve bar owner and staff verification requests for BarPulse.",
      },
      { property: "og:title", content: "Approve staff requests — BarPulse" },
      {
        property: "og:description",
        content: "Admin review queue for bar owner and staff verification on BarPulse.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const { bars } = useBarPulse();
  const userId = session?.user.id ?? null;
  const isAdmin = useIsAdmin(userId);

  const [claims, setClaims] = useState<StaffClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/" });
  }, [ready, session, navigate]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("bar_staff")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setClaims((data ?? []) as unknown as StaffClaim[]);
  }

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  async function decide(claim: StaffClaim, status: "approved" | "rejected") {
    setBusyId(claim.id);
    const { error } = await supabase.from("bar_staff").update({ status }).eq("id", claim.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Approved." : "Rejected.");
    void load();
  }

  async function refreshData() {
    setRefreshing(true);
    try {
      const [place, base] = await Promise.all([refreshPlaceCache(), refreshBaselines()]);
      if (!place.ok) {
        toast.info("Google isn't connected yet, so opening hours weren't refreshed.");
      } else {
        toast.success(`Refreshed ${place.updated} bars from Google.`);
      }
      toast.success(`Rebuilt typical-crowd history (${base.rows} slots).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed.");
    }
    setRefreshing(false);
  }

  if (ready && session && !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page reviews staff verification requests.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/">Back to the map</Link>
          </Button>
        </div>
      </div>
    );
  }

  const pending = claims.filter((c) => c.status === "pending");
  const decided = claims.filter((c) => c.status !== "pending");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" asChild aria-label="Back to the map">
            <Link to="/">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="mr-auto font-display text-xl font-extrabold">Staff requests</h1>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh data
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4">
        {loading && <p className="text-sm text-muted-foreground">Loading requests…</p>}
        {!loading && pending.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No requests waiting for review.
          </p>
        )}

        {pending.map((c) => {
          const bar = bars.find((b) => b.id === c.bar_id);
          return (
            <article key={c.id} className="rounded-3xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-display text-lg font-bold">{bar?.name ?? c.bar_id}</h2>
              <p className="text-sm text-muted-foreground capitalize">
                {c.role} · asked {timeAgoLabel(c.created_at)}
              </p>
              {c.note && <p className="mt-3 text-sm">{c.note}</p>}
              <div className="mt-4 flex gap-2">
                <Button size="sm" disabled={busyId === c.id} onClick={() => decide(c, "approved")}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === c.id}
                  onClick={() => decide(c, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </article>
          );
        })}

        {decided.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Already decided</h2>
            <ul className="space-y-2">
              {decided.map((c) => {
                const bar = bars.find((b) => b.id === c.bar_id);
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-2xl border border-border p-3 text-sm"
                  >
                    <span className="font-medium">{bar?.name ?? c.bar_id}</span>
                    <span className="text-muted-foreground capitalize">{c.role}</span>
                    <span className="ml-auto text-muted-foreground capitalize">{c.status}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
