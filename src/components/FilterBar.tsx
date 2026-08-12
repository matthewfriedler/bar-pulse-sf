import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_META, VIBES } from "@/lib/barpulse";

export interface Filters {
  neighborhood: string;
  vibe: string;
  status: string;
}

export const DEFAULT_FILTERS: Filters = { neighborhood: "all", vibe: "all", status: "all" };

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  resultCount: number;
}

export function FilterBar({ filters, onChange, resultCount }: Props) {
  const dirty =
    filters.neighborhood !== "all" || filters.vibe !== "all" || filters.status !== "all";

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-card">
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={filters.neighborhood}
          onValueChange={(v) => onChange({ ...filters, neighborhood: v })}
        >
          <SelectTrigger className="w-full" aria-label="Filter by neighborhood">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            <SelectItem value="Marina">Marina</SelectItem>
            <SelectItem value="Cow Hollow">Cow Hollow</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.vibe} onValueChange={(v) => onChange({ ...filters, vibe: v })}>
          <SelectTrigger className="w-full" aria-label="Filter by vibe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vibes</SelectItem>
            {VIBES.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
          <SelectTrigger className="w-full" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="clear">{STATUS_META.clear.label}</SelectItem>
            <SelectItem value="busy">{STATUS_META.busy.label}</SelectItem>
            <SelectItem value="packed">{STATUS_META.packed.label}</SelectItem>
            <SelectItem value="unknown">{STATUS_META.unknown.label}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-2 flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {resultCount} bar{resultCount === 1 ? "" : "s"} on the map
        </span>
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            <X className="size-3" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}