import type { MetadataRoute } from "next";
import { all } from "@/lib/store";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://loja-dos-calcados-rio-do-sul.mtsartslogotipo.chatgpt.site";
  const pages = ["", "/calcados", "/promocoes", "/lancamentos", "/sobre", "/contato", "/privacidade", "/trocas"];
  try { const products = await all("SELECT slug,updated_at FROM products WHERE active=1"); const categories = await all("SELECT c.slug FROM categories c WHERE c.active=1 AND EXISTS(SELECT 1 FROM products p WHERE p.category_id=c.id AND p.active=1)"); return [...pages.map((p) => ({ url: base + p })), ...products.map((p) => ({ url: `${base}/produto/${p.slug}`, lastModified: p.updated_at })), ...categories.map((c) => ({ url: `${base}/categoria/${c.slug}` }))]; }
  catch { return pages.map((p) => ({ url: base + p })); }
}
