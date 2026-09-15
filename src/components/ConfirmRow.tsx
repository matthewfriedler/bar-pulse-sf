import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Consensus } from "@/lib/barpulse";

export type ConfirmVote =
  | { agrees: true }
  | { agrees: false; direction: "quieter" | "busier" };

interface Props {
  consensus: Consensus | undefined;
  busy: boolean;
  onVote: (vote: ConfirmVote) => void;
}

/** "Still accurate?" — the fastest way for a patron to turn a guess into data. */
export function ConfirmRow({ consensus, busy, onVote }: Props) {
  const [correcting, setCorrecting] = useState(false);
  if (!consensus || consensus.basis === "closed" || consensus.basis === "none") return null;

  return (
    <div className="mt-3 rounded-2xl border border-dashed border-border p-2.5">
      {correcting ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">It's actually…</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setCorrecting(false);
              onVote({ agrees: false, direction: "quieter" });
            }}
          >
            Quieter
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setCorrecting(false);
              onVote({ agrees: false, direction: "busier" });
            }}
          >
            Busier
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="mr-auto text-xs text-muted-foreground">
            {consensus.basis === "estimate" ? "Estimate — right?" : "Still accurate?"}
          </span>
          {busy && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onVote({ agrees: true });
            }}
          >
            <ThumbsUp className="size-3.5" /> Yep
            {consensus.agrees > 0 && <span className="tabular-nums">{consensus.agrees}</span>}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setCorrecting(true);
            }}
          >
            <ThumbsDown className="size-3.5" /> Way off
            {consensus.disputes > 0 && <span className="tabular-nums">{consensus.disputes}</span>}
          </Button>
        </div>
      )}
    </div>
  );
}
