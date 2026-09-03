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

export function useBarPulse() {
  const queryClient = useQueryClient();

  const barsQuery = useQuery({ queryKey: ["bars"], queryFn: fetchBars, staleTime: Infinity });
  const updatesQuery = useQuery({
    queryKey: ["bar_updates"],
    queryFn: fetchUpdates,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("bar_updates_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bar_updates" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["bar_updates"] });
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

  return {
    bars: barsQuery.data ?? [],
    latestByBar,
    isLoading: barsQuery.isLoading || updatesQuery.isLoading,
    refetchUpdates: () => queryClient.invalidateQueries({ queryKey: ["bar_updates"] }),
  };
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
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

  useEffect(() => {
    if (!session?.user) {
      setUsername(null);
      return;
    }
    void supabase
      .from("profiles")
      .select("username")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? null));
  }, [session?.user]);

  return { session, username, ready };
}