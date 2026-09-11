export type Neighborhood = "Marina" | "Cow Hollow";

export const VIBES = [
  "dive bar",
  "cocktail lounge",
  "sports bar",
  "neighborhood pub",
  "wine bar",
  "late night",
  "tiki/tropical",
] as const;

export type Vibe = (typeof VIBES)[number];

export const VIBE_NOTES = [
  "Live music",
  "DJ tonight",
  "Great patio",
  "Chill / easy seats",
  "Packed dance floor",
  "Game on the TVs",
  "Happy hour deals",
  "Long bathroom line",
] as const;

export interface Bar {
  id: string;
  name: string;
  address: string;
  neighborhood: Neighborhood;
  vibe: Vibe;
  lat: number;
  lng: number;
}

export type ReadingSource = "patron" | "staff" | "correction";

export interface BarUpdate {
  id: string;
  bar_id: string;
  user_id: string;
  capacity: number;
  wait_minutes: number;
  vibe_note: string | null;
  is_owner: boolean;
  source: ReadingSource;
  door_count: number | null;
  created_at: string;
}

export interface ReadingConfirmation {
  id: string;
  bar_id: string;
  update_id: string | null;
  user_id: string;
  agrees: boolean;
  direction: "quieter" | "busier" | null;
  created_at: string;
}

export interface Baseline {
  bar_id: string;
  dow: number;
  hour: number;
  avg_capacity: number;
  avg_wait: number;
  samples: number;
}

export interface PlaceInfo {
  bar_id: string;
  open_now: boolean | null;
  rating: number | null;
  user_rating_count: number | null;
}


export type StatusKey = "clear" | "busy" | "packed" | "unknown";

export const STATUS_META: Record<
  StatusKey,
  { label: string; blurb: string; dot: string; soft: string; text: string; hex: string }
> = {
  clear: {
    label: "No wait",
    blurb: "Walk right in",
    dot: "bg-status-clear",
    soft: "bg-status-clear-soft",
    text: "text-status-clear",
    hex: "var(--status-clear)",
  },
  busy: {
    label: "Filling up",
    blurb: "Short wait",
    dot: "bg-status-busy",
    soft: "bg-status-busy-soft",
    text: "text-status-busy",
    hex: "var(--status-busy)",
  },
  packed: {
    label: "Line out the door",
    blurb: "Packed",
    dot: "bg-status-packed",
    soft: "bg-status-packed-soft",
    text: "text-status-packed",
    hex: "var(--status-packed)",
  },
  unknown: {
    label: "No reports yet",
    blurb: "Be the first",
    dot: "bg-status-unknown",
    soft: "bg-status-unknown-soft",
    text: "text-status-unknown",
    hex: "var(--status-unknown)",
  },
};

export const STALE_MINUTES = 45;
export const NEARBY_METERS = 300;

/** Reports older than this stop counting toward the live reading. */
export const CONSENSUS_WINDOW_MINUTES = 120;
/** A report loses half its weight every this many minutes. */
export const CONSENSUS_HALF_LIFE_MINUTES = 25;
/** Staff reports count this much more than a patron report. */
export const OWNER_WEIGHT = 2.5;
/** A check-in counts as "someone is here" for this long. */
export const CHECKIN_WINDOW_MINUTES = 75;

export function statusForCapacity(capacity?: number | null): StatusKey {
  if (capacity == null) return "unknown";
  if (capacity >= 85) return "packed";
  if (capacity >= 50) return "busy";
  return "clear";
}

export function statusFor(update?: BarUpdate | null): StatusKey {
  return statusForCapacity(update?.capacity ?? null);
}

export type Confidence = "none" | "low" | "medium" | "high";

/** Where the number on screen came from. */
export type Basis = "live" | "estimate" | "closed" | "none";

/** Confirmations older than this stop counting. */
export const CONFIRMATION_WINDOW_MINUTES = 90;

export interface Consensus {
  /** Recency-weighted capacity across every recent report, 0-100. */
  capacity: number | null;
  /** Recency-weighted wait in minutes. */
  waitMinutes: number | null;
  status: StatusKey;
  /** Reports inside the consensus window. */
  reports: number;
  /** Distinct people who reported inside the window. */
  contributors: number;
  /** People checked in on site right now. */
  checkedIn: number;
  ownerBacked: boolean;
  confidence: Confidence;
  /** Newest report of all time (may be outside the window). */
  latest: BarUpdate | null;
  /** Direction of travel vs. the older half of the window. */
  trend: "rising" | "falling" | "steady" | null;
  basis: Basis;
  agrees: number;
  disputes: number;
  /** How many past readings the estimate is based on, when basis is "estimate". */
  baselineSamples: number;
}

export interface ConsensusInput {
  checkedIn?: number;
  confirmations?: ReadingConfirmation[];
  baseline?: Baseline | null;
  place?: PlaceInfo | null;
}

function decayWeight(iso: string): number {
  const mins = minutesAgo(iso);
  return Math.pow(0.5, mins / CONSENSUS_HALF_LIFE_MINUTES);
}

function confidenceFor(
  contributors: number,
  checkedIn: number,
  ownerBacked: boolean,
  agrees = 0,
  disputes = 0,
): Confidence {
  if (contributors === 0) return "none";
  const signal =
    contributors + checkedIn * 0.5 + (ownerBacked ? 2 : 0) + agrees * 0.75 - disputes * 1.5;
  if (signal >= 5) return "high";
  if (signal >= 2.5) return "medium";
  return "low";
}

/**
 * Blends every recent report for one bar into a single live reading instead of
 * trusting whoever happened to post last. Newer reports and staff reports carry
 * more weight; on-site check-ins and confirmations raise confidence, disputes
 * knock it down. With no live signal at all we fall back to the bar's own
 * history for this day and hour, clearly flagged as an estimate.
 */
export function computeConsensus(
  updates: BarUpdate[],
  input: ConsensusInput | number = {},
): Consensus {
  const opts: ConsensusInput = typeof input === "number" ? { checkedIn: input } : input;
  const checkedIn = opts.checkedIn ?? 0;
  const recentConfirmations = (opts.confirmations ?? []).filter(
    (c) => minutesAgo(c.created_at) < CONFIRMATION_WINDOW_MINUTES,
  );
  const agrees = recentConfirmations.filter((c) => c.agrees).length;
  const disputes = recentConfirmations.filter((c) => !c.agrees).length;

  const sorted = [...updates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latest = sorted[0] ?? null;
  const recent = sorted.filter((u) => minutesAgo(u.created_at) < CONSENSUS_WINDOW_MINUTES);

  if (recent.length === 0) {
    const closed = opts.place?.open_now === false;
    const baseline = opts.baseline ?? null;
    const estimate = !closed && baseline && baseline.samples >= 3 ? baseline : null;
    const capacity = estimate ? Math.round(Number(estimate.avg_capacity)) : null;
    return {
      capacity,
      waitMinutes: estimate ? Math.round(Number(estimate.avg_wait)) : null,
      status: closed ? "unknown" : statusForCapacity(capacity),
      reports: 0,
      contributors: 0,
      checkedIn,
      ownerBacked: false,
      confidence: "none",
      latest,
      trend: null,
      basis: closed ? "closed" : estimate ? "estimate" : "none",
      agrees,
      disputes,
      baselineSamples: estimate?.samples ?? 0,
    };
  }

  let weightSum = 0;
  let capacitySum = 0;
  let waitSum = 0;
  const people = new Set<string>();
  let ownerBacked = false;

  for (const u of recent) {
    const staff = u.is_owner || u.source === "staff";
    const w = decayWeight(u.created_at) * (staff ? OWNER_WEIGHT : 1);
    weightSum += w;
    capacitySum += u.capacity * w;
    waitSum += u.wait_minutes * w;
    people.add(u.user_id);
    if (staff) ownerBacked = true;
  }

  let capacity = Math.round(capacitySum / weightSum);

  // Disputes that say which way it's off nudge the number toward the crowd.
  const nudge = recentConfirmations
    .filter((c) => !c.agrees && c.direction)
    .reduce((sum, c) => sum + (c.direction === "busier" ? 6 : -6) * decayWeight(c.created_at), 0);
  if (nudge !== 0) capacity = Math.max(0, Math.min(100, Math.round(capacity + nudge)));

  const half = CONSENSUS_WINDOW_MINUTES / 2;
  const fresh = recent.filter((u) => minutesAgo(u.created_at) < half);
  const older = recent.filter((u) => minutesAgo(u.created_at) >= half);
  let trend: Consensus["trend"] = null;
  if (fresh.length && older.length) {
    const avg = (rows: BarUpdate[]) =>
      rows.reduce((s, r) => s + r.capacity, 0) / rows.length;
    const delta = avg(fresh) - avg(older);
    trend = delta >= 8 ? "rising" : delta <= -8 ? "falling" : "steady";
  }

  return {
    capacity,
    waitMinutes: Math.round(waitSum / weightSum),
    status: statusForCapacity(capacity),
    reports: recent.length,
    contributors: people.size,
    checkedIn,
    ownerBacked,
    confidence: confidenceFor(people.size, checkedIn, ownerBacked, agrees, disputes),
    latest,
    trend,
    basis: "live",
    agrees,
    disputes,
    baselineSamples: 0,
  };
}

/** Local day-of-week and hour used to look up a bar's historical baseline. */
export function currentSlot(now = new Date()): { dow: number; hour: number } {
  return { dow: now.getDay(), hour: now.getHours() };
}


export const CONFIDENCE_META: Record<Confidence, { label: string; blurb: string }> = {
  none: { label: "No signal", blurb: "Nobody has reported in the last 2 hours" },
  low: { label: "Low confidence", blurb: "Based on a single recent report" },
  medium: { label: "Good confidence", blurb: "Several people agree on this" },
  high: { label: "High confidence", blurb: "Lots of live signal from the door" },
};

export function minutesAgo(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export function timeAgoLabel(iso: string): string {
  const mins = minutesAgo(iso);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function isStale(iso: string): boolean {
  return minutesAgo(iso) >= STALE_MINUTES;
}

/** Great-circle distance in meters. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@barpulse.app`;
}