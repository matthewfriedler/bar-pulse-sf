import { supabase } from "@/integrations/supabase/client";

/**
 * Profile pictures live either on an external provider (Google) as a full URL,
 * or in the private `avatars` bucket as a storage path we must sign.
 */
export async function resolveAvatarUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http")) return value;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(value, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}
