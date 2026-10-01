import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

interface PlaceDetails {
  id?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  photos?: Array<{ name?: string }>;
  websiteUri?: string;
  nationalPhoneNumber?: string;
}

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) return null;
  return { lovableKey, mapsKey };
}

async function gateway(
  path: string,
  init: RequestInit & { fieldMask?: string },
  creds: { lovableKey: string; mapsKey: string },
) {
  const { fieldMask, ...rest } = init;
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${creds.lovableKey}`,
      "X-Connection-Api-Key": creds.mapsKey,
      "Content-Type": "application/json",
      ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Maps request failed [${res.status}]: ${body}`);
  }
  return res.json();
}

/**
 * Failsafe data source: refreshes each bar's opening hours and rating from
 * Google so we never show an estimated crowd level for a bar that is closed.
 * Google does not expose live/popular-times data through any API, so the
 * hourly estimate itself comes from BarPulse's own history.
 */
export const refreshPlaceCache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const creds = credentials();
    if (!creds) {
      return { ok: false as const, reason: "not_connected" as const, updated: 0 };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: bars, error } = await supabaseAdmin
      .from("bars")
      .select("id, name, address, google_place_id");
    if (error) throw error;

    let updated = 0;
    for (const bar of bars ?? []) {
      try {
        let placeId = (bar as { google_place_id?: string | null }).google_place_id ?? null;

        if (!placeId) {
          const search = (await gateway(
            "/places/v1/places:searchText",
            {
              method: "POST",
              fieldMask: "places.id",
              body: JSON.stringify({ textQuery: `${bar.name}, ${bar.address}`, pageSize: 1 }),
            },
            creds,
          )) as { places?: Array<{ id: string }> };
          placeId = search.places?.[0]?.id ?? null;
          if (!placeId) continue;
          await supabaseAdmin.from("bars").update({ google_place_id: placeId }).eq("id", bar.id);
        }

        const details = (await gateway(
          `/places/v1/places/${placeId}`,
          {
            method: "GET",
            fieldMask:
              "id,rating,userRatingCount,regularOpeningHours,currentOpeningHours,photos,websiteUri,nationalPhoneNumber",
          },
          creds,
        )) as PlaceDetails;

        const hours = details.currentOpeningHours ?? details.regularOpeningHours ?? null;

        // One representative photo per bar, resolved to a browser-loadable URL.
        let photoUrl: string | null = null;
        const photoName = details.photos?.[0]?.name;
        if (photoName) {
          try {
            const media = (await gateway(
              `/places/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`,
              { method: "GET" },
              creds,
            )) as { photoUri?: string };
            photoUrl = media.photoUri ?? null;
          } catch {
            photoUrl = null;
          }
        }

        await supabaseAdmin.from("bar_place_cache").upsert({
          bar_id: bar.id,
          place_id: placeId,
          open_now: hours?.openNow ?? null,
          hours: hours ? { weekdayDescriptions: hours.weekdayDescriptions ?? [] } : null,
          rating: details.rating ?? null,
          user_rating_count: details.userRatingCount ?? null,
          photo_url: photoUrl,
          website: details.websiteUri ?? null,
          phone: details.nationalPhoneNumber ?? null,
          fetched_at: new Date().toISOString(),
        });
        updated += 1;
      } catch (err) {
        console.error(`Place refresh failed for ${bar.id}:`, err);
      }
    }

    return { ok: true as const, updated };
  });

/** Rebuilds the "typical for this day and hour" table from past readings. */
export const refreshBaselines = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("refresh_bar_baselines");
    if (error) throw error;
    return { rows: (data as number | null) ?? 0 };
  });
