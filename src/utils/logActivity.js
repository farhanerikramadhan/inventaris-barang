import { supabase } from "../lib/supabase";

export async function logActivity({ action, entity, entityId = null, detail = null }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("activity_logs").insert({
    action,
    entity,
    entity_id: entityId,
    detail,
    user_id: user?.id || null,
  });

  if (error) console.error("Gagal log activity:", error.message);
}