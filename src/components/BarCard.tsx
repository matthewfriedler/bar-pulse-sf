import { AlertTriangle, Clock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LatestUpdate } from "@/hooks/useBarPulse";
import { STATUS_META, isStale, statusFor, timeAgoLabel, type Bar } from "@/lib/barpulse";
import { cn } from "@/lib/utils";

interface Props {
  bar: Bar;
  update: LatestUpdate | undefined;
  active: boolean;
  onSelect: () => void;
  onReport: () => void;
}

export function BarCard({ bar, update, active, onSelect, onReport }: Props) {
  const status = STATUS_META[statusFor(update)];
  const stale = update ? isStale(update.created_at) : false;

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

      {update ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${update.capacity}%`, backgroundColor: status.hex }}
              />
            </div>
            <span className="font-display text-sm font-bold tabular-nums">
              {update.capacity}%
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {update.wait_minutes === 0 ? "No wait" : `${update.wait_minutes} min wait`}
            </span>
            {update.vibe_note && (
              <span className="inline-flex items-center gap-1 text-secondary">
                <Sparkles className="size-3.5" />
                {update.vibe_note}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
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
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          No reports yet tonight — {bar.address}
        </p>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
        onClick={(e) => {
          e.stopPropagation();
          onReport();
        }}
      >
        Post an update
      </Button>
    </article>
  );
}