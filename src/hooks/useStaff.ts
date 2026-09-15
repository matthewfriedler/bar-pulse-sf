import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface StaffClaim {
  id: string;
  bar_id: string;
  user_id: string;
  role: string;
  status: string;
  note: string | null;
  created_at: string;
}

/** Bars this signed-in user is approved to post verified readings for. */
export function useMyStaff(userId: string | null) {
  const query = useQuery({
    queryKey: ["my_staff", userId],
    enabled: !!userId,
    queryFn: async (): Promise<StaffClaim[]> => {
      const { data, error } = await supabase
        .from("bar_staff")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StaffClaim[];
    },
  });

  const claims = query.data ?? [];
  const approvedBarIds = new Set(
    claims.filter((c) => c.status === "approved").map((c) => c.bar_id),
  );
  return { claims, approvedBarIds, isLoading: query.isLoading, refetch: query.refetch };
}

export function useIsAdmin(userId: string | null) {
  const query = useQuery({
    queryKey: ["is_admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId!,
        _role: "admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
  });
  return query.data ?? false;
}
