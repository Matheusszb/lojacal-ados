"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally { setBusy(false); }
  }

  return <main className="admin-login-page"><form className="admin-login-card" onSubmit={signIn}>
    <a href="/"><img src="/logo-loja-dos-calcados.png" alt="Loja dos Calçados" /></a>
    <span className="eyebrow">ÁREA ADMINISTRATIVA</span><h1>Entrar no painel</h1>
    <label>E-mail<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <p role="alert" className="admin-login-error">{error}</p>}
    <button className="admin-primary" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
    <a className="admin-link" href="/">Voltar à loja</a>
  </form></main>;
}
