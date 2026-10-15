"use client";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  async function logout() {
    await createClient().auth.signOut();
    window.location.assign("/admin/login");
  }
  return <button className="admin-logout" type="button" onClick={logout}>Sair do painel</button>;
}
