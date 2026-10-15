import { createClient } from "@/lib/supabase/server";
import { first, now, run } from "@/lib/store";

export async function requireAdmin() {
  const allowedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) return null;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email || !user.email_confirmed_at || user.email.toLowerCase() !== allowedEmail) return null;
  // Only the verified configured email can claim the administrator row.
  await run("INSERT INTO admins (user_id,email,created_at) VALUES (?,?,?) ON CONFLICT(user_id) DO NOTHING", user.id, user.email, now());
  const admin = await first("SELECT user_id FROM admins WHERE user_id=?", user.id);
  return admin ? { userId: user.id, email: user.email, displayName: user.user_metadata?.full_name || user.email } : null;
}
