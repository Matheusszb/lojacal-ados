import { env } from "cloudflare:workers";

export type Row = Record<string, any>;
export const db = () => {
  if (!env.DB) throw new Error("Banco de dados indisponível");
  return env.DB;
};
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const clean = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);
export const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const cents = (value: unknown) => Math.round(Number(value) * 100);
export const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });
export const fail = (message: string, status = 400) => json({ error: message }, status);

export async function all(sql: string, ...args: unknown[]): Promise<Row[]> {
  const result = await db().prepare(sql).bind(...args).all();
  return result.results as Row[];
}
export async function first(sql: string, ...args: unknown[]): Promise<Row | null> {
  return await db().prepare(sql).bind(...args).first() as Row | null;
}
export async function run(sql: string, ...args: unknown[]) {
  return db().prepare(sql).bind(...args).run();
}

export const defaults: Record<string, string> = {
  store_name: "Loja dos Calçados",
  announcement: "Seu estilo começa pelos pés.",
  phone: "(47) 98410-9119",
  whatsapp: "5547984109119",
  instagram: "@loja.calçados.importados",
  address: "BR-470, KM 140, Polo Shopping, lojas 02/04 — Rio do Sul, SC",
  reference: "Próximo à Pizzaria 5322",
  hero_title: "Seu estilo começa pelos pés",
  hero_subtitle: "Encontre o calçado ideal para completar seu estilo.",
};

export async function getSettings() {
  const rows = await all("SELECT key, value FROM settings");
  return { ...defaults, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
}

export async function getCatalog(admin = false) {
  const [products, variants, images, categories, banners, settings] = await Promise.all([
    all(`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p LEFT JOIN categories c ON c.id=p.category_id ${admin ? "" : "WHERE p.active=1"} ORDER BY p.created_at DESC`),
    all("SELECT * FROM variants ORDER BY color, size"),
    all("SELECT * FROM product_images ORDER BY sort"),
    all(`SELECT * FROM categories ${admin ? "" : "WHERE active=1"} ORDER BY sort, name`),
    all(`SELECT * FROM banners ${admin ? "" : "WHERE active=1"} ORDER BY sort`),
    getSettings(),
  ]);
  return { products: products.map((p) => ({ ...p, variants: variants.filter((v) => v.product_id === p.id), images: images.filter((i) => i.product_id === p.id) })), categories, banners, settings };
}
