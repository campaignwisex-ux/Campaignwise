import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/encrypt";

export async function getWorkspaceCredentials(userId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  return { ...data, client_secret: decrypt(data.client_secret_enc) };
}
