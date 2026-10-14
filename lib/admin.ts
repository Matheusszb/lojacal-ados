import { getChatGPTUser } from "@/app/chatgpt-auth";
import { first, id, now, run } from "@/lib/store";

export async function requireAdmin() {
  const user = await getChatGPTUser();
  if (!user) return null;
  // A new Site starts owner-private. Its first signed-in owner claims the admin role.
  await run("INSERT INTO admins (user_id,email,created_at) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM admins)", user.userId, user.email, now());
  const admin = await first("SELECT user_id FROM admins WHERE user_id=?", user.userId);
  return admin ? user : null;
}
