import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { refreshPlaceCache } from "@/lib/places.functions";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { parseSettings, type AppSettings } from "@/lib/settings";
import {
  CHECKIN_WINDOW_MINUTES,
  CONFIRMATION_WINDOW_MINUTES,
  computeConsensus,
  currentSlot,
  type Bar,
  type Baseline,
  type BarUpdate,
  type Consensus,
  type PlaceInfo,
  type ReadingConfirmation,
} from "@/lib/barpulse";


export interface LatestUpdate extends BarUpdate {
  username: string;
}

async function fetchBars(): Promise<Bar[]> {
  const { data, error } = await supabase.from("bars").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Bar[];
}

async function fetchUpdates(): Promise<LatestUpdate[]> {
  const [{ data: updates, error }, { data: profiles }] = await Promise.all([
    supabase
      .from("bar_updates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(400),
    supabase.from("profiles").select("id, username"),
  ]);
  if (error) throw error;
  const names = new Map((profiles ?? []).map((p) => [p.id, p.username]));
  return (updates ?? []).map((u) => ({
    ...(u as unknown as BarUpdate),
    username: names.get(u.user_id) ?? "someone",
  }));
}

async function fetchCheckins(): Promise<Map<string, number>> {
  const since = new Date(Date.now() - CHECKIN_WINDOW_MINUTES * 60_000).toISOString();
  const { data, error } = await supabase
    .from("bar_checkins")
    .select("bar_id, user_id")
    .gte("created_at", since);
  if (error) throw error;
  const perBar = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const set = perBar.get(row.bar_id) ?? new Set<string>();
    set.add(row.user_id);
    perBar.set(row.bar_id, set);
  }
  return new Map([...perBar].map(([barId, people]) => [barId, people.size]));
}

async function fetchConfirmations(): Promise<ReadingConfirmation[]> {
  const since = new Date(Date.now() - CONFIRMATION_WINDOW_MINUTES * 60_000).toISOString();
  const { data, error } = await supabase
    .from("bar_reading_confirmations")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ReadingConfirmation[];
}

async function fetchBaselines(): Promise<Baseline[]> {
  const { dow, hour } = currentSlot();
  const { data, error } = await supabase
    .from("bar_baselines")
    .select("*")
    .eq("dow", dow)
    .eq("hour", hour);
  if (error) throw error;
  return (data ?? []) as unknown as Baseline[];
}

async function fetchPlaceInfo(): Promise<PlaceInfo[]> {
  const { data, error } = await supabase
    .from("bar_place_cache")
    .select("bar_id, open_now, rating, user_rating_count, photo_url, website, phone, fetched_at");
  if (error) throw error;
  return (data ?? []) as unknown as PlaceInfo[];
}

export function useBarPulse() {
  const queryClient = useQueryClient();

  const barsQuery = useQuery({ queryKey: ["bars"], queryFn: fetchBars, staleTime: Infinity });
  const updatesQuery = useQuery({
    queryKey: ["bar_updates"],
    queryFn: fetchUpdates,
    refetchInterval: 30_000,
  });
  const checkinsQuery = useQuery({
    queryKey: ["bar_checkins"],
    queryFn: fetchCheckins,
    refetchInterval: 60_000,
  });
  const confirmationsQuery = useQuery({
    queryKey: ["bar_confirmations"],
    queryFn: fetchConfirmations,
    refetchInterval: 45_000,
  });
  const baselinesQuery = useQuery({
    queryKey: ["bar_baselines", currentSlot().hour],
    queryFn: fetchBaselines,
    staleTime: 10 * 60_000,
  });
  const placeQuery = useQuery({
    queryKey: ["bar_place_cache"],
    queryFn: fetchPlaceInfo,
    staleTime: 15 * 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("bar_pulse_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bar_updates" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["bar_updates"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bar_checkins" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["bar_checkins"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bar_reading_confirmations" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["bar_confirmations"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const latestByBar = useMemo(() => {
    const map = new Map<string, LatestUpdate>();
    for (const u of updatesQuery.data ?? []) {
      if (!map.has(u.bar_id)) map.set(u.bar_id, u);
    }
    return map;
  }, [updatesQuery.data]);

  const placeInfoByBar = useMemo(() => {
    const map = new Map<string, PlaceInfo>();
    for (const p of placeQuery.data ?? []) map.set(p.bar_id, p);
    return map;
  }, [placeQuery.data]);

  const consensusByBar = useMemo(() => {
    const grouped = new Map<string, BarUpdate[]>();
    for (const u of updatesQuery.data ?? []) {
      const list = grouped.get(u.bar_id) ?? [];
      list.push(u);
      grouped.set(u.bar_id, list);
    }
    const confirmationsByBar = new Map<string, ReadingConfirmation[]>();
    for (const c of confirmationsQuery.data ?? []) {
      const list = confirmationsByBar.get(c.bar_id) ?? [];
      list.push(c);
      confirmationsByBar.set(c.bar_id, list);
    }
    const baselineByBar = new Map((baselinesQuery.data ?? []).map((b) => [b.bar_id, b]));

    const map = new Map<string, Consensus>();
    const barIds = new Set([
      ...(barsQuery.data ?? []).map((b) => b.id),
      ...grouped.keys(),
    ]);
    for (const id of barIds) {
      map.set(
        id,
        computeConsensus(grouped.get(id) ?? [], {
          checkedIn: checkinsQuery.data?.get(id) ?? 0,
          confirmations: confirmationsByBar.get(id) ?? [],
          baseline: baselineByBar.get(id) ?? null,
          place: placeInfoByBar.get(id) ?? null,
        }),
      );
    }
    return map;
  }, [
    updatesQuery.data,
    checkinsQuery.data,
    barsQuery.data,
    confirmationsQuery.data,
    baselinesQuery.data,
    placeInfoByBar,
  ]);

  return {
    bars: barsQuery.data ?? [],
    latestByBar,
    consensusByBar,
    placeByBar: placeInfoByBar,
    isLoading: barsQuery.isLoading || updatesQuery.isLoading,
    refetchUpdates: () => {
      void queryClient.invalidateQueries({ queryKey: ["bar_updates"] });
      void queryClient.invalidateQueries({ queryKey: ["bar_checkins"] });
      void queryClient.invalidateQueries({ queryKey: ["bar_confirmations"] });
    },
  };
}

/** How stale the Google-sourced place data may get before it is refreshed. */
const PLACE_CACHE_MAX_AGE_MS = 6 * 60 * 60_000;

/**
 * Keeps Google place data (photo, rating, open/closed) fresh. Runs at most
 * once per mount, only for signed-in visitors, and only when the cache is
 * older than 6 hours — keeps Google usage small and bounded.
 */
export function usePlaceAutoRefresh(signedIn: boolean) {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void (async () => {
      // Give the place-cache query a moment to load before deciding.
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (cancelled) return;
        const cached = queryClient.getQueryData<PlaceInfo[]>(["bar_place_cache"]);
        if (!cached) continue;
        if (ran.current) return;
        ran.current = true;
        const newest = cached.reduce(
          (max, p) => (p.fetched_at ? Math.max(max, new Date(p.fetched_at).getTime()) : max),
          0,
        );
        if (Date.now() - newest < PLACE_CACHE_MAX_AGE_MS) return;
        const res = await refreshPlaceCache();
        if (res.ok && res.updated > 0) {
          await queryClient.invalidateQueries({ queryKey: ["bar_place_cache"] });
        }
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, queryClient]);
}


export interface Profile {
  id: string;
  username: string;
  username_confirmed: boolean;
  avatar_url: string | null;
  settings: AppSettings;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, username_confirmed, avatar_url, settings")
      .eq("id", userId)
      .maybeSingle();
    if (!data) {
      setProfile(null);
      return;
    }
    setProfile({
      id: data.id,
      username: data.username,
      username_confirmed: Boolean((data as { username_confirmed?: boolean }).username_confirmed),
      avatar_url: (data as { avatar_url?: string | null }).avatar_url ?? null,
      settings: parseSettings((data as { settings?: unknown }).settings),
    });
  }, [userId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return { session, profile, username: profile?.username ?? null, ready, refreshProfile: loadProfile };
}
