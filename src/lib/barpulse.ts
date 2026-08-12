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

export interface BarUpdate {
  id: string;
  bar_id: string;
  user_id: string;
  capacity: number;
  wait_minutes: number;
  vibe_note: string | null;
  is_owner: boolean;
  created_at: string;
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

export function statusFor(update?: BarUpdate | null): StatusKey {
  if (!update) return "unknown";
  if (update.capacity >= 85) return "packed";
  if (update.capacity >= 50) return "busy";
  return "clear";
}

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