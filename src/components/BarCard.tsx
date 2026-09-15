import {
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LatestUpdate } from "@/hooks/useBarPulse";
import {
  CONFIDENCE_META,
  STATUS_META,
  isStale,
  timeAgoLabel,
  type Bar,
  type Consensus,
} from "@/lib/barpulse";
import { cn } from "@/lib/utils";

interface Props {
  bar: Bar;
  update: LatestUpdate | undefined;
  consensus: Consensus | undefined;
  active: boolean;
  checkingIn: boolean;
  confirming: boolean;
  onSelect: () => void;
  onReport: () => void;
  onCheckIn: () => void;
  onConfirm: (vote: ConfirmVote) => void;
}

export function BarCard({
  bar,
  update,
  consensus,
  active,
  checkingIn,
  confirming,
  onSelect,
  onReport,
  onCheckIn,
  onConfirm,
}: Props) {
  const status = STATUS_META[consensus?.status ?? "unknown"];
  const stale = update ? isStale(update.created_at) : false;
  const capacity = consensus?.capacity ?? null;
  const confidence = CONFIDENCE_META[consensus?.confidence ?? "none"];
  const basis = consensus?.basis ?? "none";


  return (
    <article
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-2xl border bg-card p-4 shadow-card transition-all",
        active
          ? "border-primary ring-2 ring-primary/25"
          : "border-border hover:-translate-y-0.5 hover:border-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold">{bar.name}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {bar.neighborhood} · {bar.vibe}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            status.soft,
            status.text,
          )}
        >
          {status.label}
        </span>
      </div>

      {capacity != null && consensus ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${capacity}%`, backgroundColor: status.hex }}
              />
            </div>
            <span className="font-display text-sm font-bold tabular-nums">{capacity}%</span>
            {consensus.trend === "rising" && (
              <TrendingUp className="size-4 text-status-packed" aria-label="Filling up fast" />
            )}
            {consensus.trend === "falling" && (
              <TrendingDown className="size-4 text-status-clear" aria-label="Emptying out" />
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {consensus.waitMinutes ? `${consensus.waitMinutes} min wait` : "No wait"}
            </span>
            {consensus.checkedIn > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" />
                {consensus.checkedIn} checked in
              </span>
            )}
            {update?.vibe_note && (
              <span className="inline-flex items-center gap-1 text-secondary">
                <Sparkles className="size-3.5" />
                {update.vibe_note}
              </span>
            )}
          </div>

          <p className="mt-2 text-xs text-muted-foreground" title={confidence.blurb}>
            <span
              className={cn(
                "font-medium",
                consensus.confidence === "high" && "text-status-clear",
                consensus.confidence === "low" && "text-status-busy",
              )}
            >
              {confidence.label}
            </span>{" "}
            · {consensus.reports} report{consensus.reports === 1 ? "" : "s"} from{" "}
            {consensus.contributors} {consensus.contributors === 1 ? "person" : "people"}
            {consensus.ownerBacked && (
              <span className="font-semibold text-primary"> · staff confirmed</span>
            )}
          </p>

          {update && (
            <p className="mt-1 text-xs text-muted-foreground">
              Last:{" "}
              {update.is_owner ? (
                <span className="font-semibold text-primary">Owner update</span>
              ) : (
                <span className="font-medium">@{update.username}</span>
              )}
              , {timeAgoLabel(update.created_at)}
              {stale && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-status-busy-soft px-2 py-0.5 font-medium text-status-busy">
                  <AlertTriangle className="size-3" /> stale
                </span>
              )}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          {consensus && consensus.checkedIn > 0
            ? `${consensus.checkedIn} checked in, but nobody has rated the crowd yet.`
            : `No live signal tonight — ${bar.address}`}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={checkingIn}
          onClick={(e) => {
            e.stopPropagation();
            onCheckIn();
          }}
        >
          <MapPin className="size-4" />
          {checkingIn ? "Checking…" : "I'm here"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onReport();
          }}
        >
          Rate the crowd
        </Button>
      </div>
    </article>
  );
}
