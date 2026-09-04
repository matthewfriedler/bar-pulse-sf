import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  CHECKIN_WINDOW_MINUTES,
  computeConsensus,
  type Bar,
  type BarUpdate,
  type Consensus,
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

  const consensusByBar = useMemo(() => {
    const grouped = new Map<string, BarUpdate[]>();
    for (const u of updatesQuery.data ?? []) {
      const list = grouped.get(u.bar_id) ?? [];
      list.push(u);
      grouped.set(u.bar_id, list);
    }
    const map = new Map<string, Consensus>();
    const barIds = new Set([
      ...(barsQuery.data ?? []).map((b) => b.id),
      ...grouped.keys(),
    ]);
    for (const id of barIds) {
      map.set(
        id,
        computeConsensus(grouped.get(id) ?? [], checkinsQuery.data?.get(id) ?? 0),
      );
    }
    return map;
  }, [updatesQuery.data, checkinsQuery.data, barsQuery.data]);

  return {
    bars: barsQuery.data ?? [],
    latestByBar,
    consensusByBar,
    isLoading: barsQuery.isLoading || updatesQuery.isLoading,
    refetchUpdates: () => {
      void queryClient.invalidateQueries({ queryKey: ["bar_updates"] });
      void queryClient.invalidateQueries({ queryKey: ["bar_checkins"] });
    },
  };
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
