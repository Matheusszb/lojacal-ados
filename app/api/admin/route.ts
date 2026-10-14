import { requireAdmin } from "@/lib/admin";
import { all, clean, db, fail, first, getCatalog, getSettings, id, json, now, run, slugify } from "@/lib/store";

export const dynamic = "force-dynamic";
const int = (v: unknown) => Number.isInteger(Number(v)) ? Number(v) : NaN;

export async function GET() {
  try {
    const user = await requireAdmin();
    if (!user) return fail("Acesso restrito ao administrador.", 403);
    const [catalog, orders, movements] = await Promise.all([
      getCatalog(true),
      all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200"),
      all("SELECT m.*, v.sku, p.name AS product_name FROM stock_movements m JOIN variants v ON v.id=m.variant_id JOIN products p ON p.id=v.product_id ORDER BY m.created_at DESC LIMIT 100"),
    ]);
    const items = orders.length ? await all(`SELECT * FROM order_items WHERE order_id IN (${orders.map(() => "?").join(",")})`, ...orders.map((o) => o.id)) : [];
    return json({ ...catalog, orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })), movements, admin: { name: user.displayName, email: user.email } });
  } catch (error) { console.error(error); return fail("Não foi possível carregar o painel.", 500); }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return fail("Origem não permitida.", 403);
    const user = await requireAdmin();
    if (!user) return fail("Acesso restrito ao administrador.", 403);
    const body = await request.json() as Record<string, any>;
    const action = clean(body.action, 30), timestamp = now();
    if (action === "saveCategory") {
      const name = clean(body.name, 80), slug = slugify(name);
      if (!name || !slug) return fail("Informe a categoria.");
      const categoryId = clean(body.id, 60) || id();
      await run("INSERT INTO categories (id,name,slug,active,sort) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,active=excluded.active,sort=excluded.sort", categoryId, name, slug, body.active === false ? 0 : 1, int(body.sort) || 0);
      return json({ ok: true, id: categoryId });
    }
    if (action === "saveSettings") {
      const allowed = ["store_name", "announcement", "phone", "whatsapp", "instagram", "address", "reference", "hero_title", "hero_subtitle", "hours"];
      const statements = allowed.filter((key) => key in body.values).map((key) => db().prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key, clean(body.values[key], 400)));
      if (statements.length) await db().batch(statements);
      return json({ ok: true });
    }
    if (action === "saveBanner") {
      const bannerId = clean(body.id, 60) || id(), title = clean(body.title, 140);
      if (!title) return fail("Informe o título do banner.");
      const link = clean(body.link, 250) || "/calcados";
      if (!link.startsWith("/") || link.startsWith("//")) return fail("O link deve ser interno.");
      await run("INSERT INTO banners (id,title,subtitle,image_key,link,active,sort) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,subtitle=excluded.subtitle,image_key=excluded.image_key,link=excluded.link,active=excluded.active,sort=excluded.sort", bannerId, title, clean(body.subtitle, 250), clean(body.imageKey, 250) || null, link, body.active === false ? 0 : 1, int(body.sort) || 0);
      return json({ ok: true, id: bannerId });
    }
    if (action === "saveProduct") {
      const productId = clean(body.id, 60) || id(), name = clean(body.name, 140), brand = clean(body.brand, 100);
      const slug = slugify(clean(body.slug, 140) || name);
      const price = int(body.priceCents), sale = body.salePriceCents == null || body.salePriceCents === "" ? null : int(body.salePriceCents);
      if (!name || !brand || !slug || !Number.isFinite(price) || price <= 0 || (sale !== null && (!Number.isFinite(sale) || sale <= 0 || sale >= price))) return fail("Confira nome, marca e preços.");
      const categoryId = clean(body.categoryId, 60) || null;
      if (categoryId && !await first("SELECT id FROM categories WHERE id=?", categoryId)) return fail("Categoria inválida.");
      const variants = Array.isArray(body.variants) ? body.variants : [];
      if (!variants.length || variants.length > 80) return fail("Cadastre ao menos uma cor e numeração.");
      const existing = await first("SELECT id,created_at FROM products WHERE id=?", productId);
      if (!existing && variants.some((v: any) => v.id)) return fail("Variação inválida para novo produto.");
      const normalized = variants.map((v: any) => ({ id: clean(v.id, 60) || id(), color: clean(v.color, 50), size: clean(v.size, 12), sku: clean(v.sku, 80), stock: int(v.stock), minStock: int(v.minStock) }));
      if (normalized.some((v) => !v.color || !v.size || !v.sku || !Number.isInteger(v.stock) || v.stock < 0 || !Number.isInteger(v.minStock) || v.minStock < 0)) return fail("Confira SKU, cor, numeração e estoque das variações.");
      if (new Set(normalized.map((v) => `${v.color.toLowerCase()}|${v.size}`)).size !== normalized.length || new Set(normalized.map((v) => v.sku)).size !== normalized.length) return fail("Variações ou SKUs duplicados.");
      if (existing) {
        for (const v of normalized.filter((v) => body.variants.some((x: any) => x.id === v.id))) {
          const row = await first("SELECT id FROM variants WHERE id=? AND product_id=?", v.id, productId);
          if (!row) return fail("Variação inválida.");
        }
      }
      const statements = [
        db().prepare("INSERT INTO products (id,name,slug,brand,category_id,description,price_cents,sale_price_cents,active,featured,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,brand=excluded.brand,category_id=excluded.category_id,description=excluded.description,price_cents=excluded.price_cents,sale_price_cents=excluded.sale_price_cents,active=excluded.active,featured=excluded.featured,updated_at=excluded.updated_at").bind(productId, name, slug, brand, categoryId, clean(body.description, 4000), price, sale, body.active ? 1 : 0, body.featured ? 1 : 0, existing?.created_at ?? timestamp, timestamp),
        ...normalized.map((v) => db().prepare("INSERT INTO variants (id,product_id,sku,color,size,stock,min_stock) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,color=excluded.color,size=excluded.size,min_stock=excluded.min_stock").bind(v.id, productId, v.sku, v.color, v.size, v.stock, v.minStock)),
        ...normalized.filter((v) => !body.variants.some((x: any) => x.id === v.id)).filter((v) => v.stock > 0).map((v) => db().prepare("INSERT INTO stock_movements (id,variant_id,delta,reason,reference,actor_id,created_at) VALUES (?,?,?,?,?,?,?)").bind(id(), v.id, v.stock, "initial", productId, user.userId, timestamp)),
        db().prepare("DELETE FROM product_images WHERE product_id=?").bind(productId),
        ...(Array.isArray(body.images) ? body.images.slice(0, 8) : []).filter((x: any) => typeof x.key === "string" && x.key.startsWith("product/")).map((x: any, index: number) => db().prepare("INSERT INTO product_images (id,product_id,key,alt,sort) VALUES (?,?,?,?,?)").bind(id(), productId, x.key, clean(x.alt, 180) || name, index)),
      ];
      await db().batch(statements);
      return json({ ok: true, id: productId });
    }
    if (action === "adjustStock") {
      const variantId = clean(body.variantId, 60), delta = int(body.delta), reason = clean(body.reason, 100);
      if (!variantId || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 10000 || !reason) return fail("Ajuste inválido.");
      const results = await db().batch([
        db().prepare("UPDATE variants SET stock=stock+? WHERE id=? AND stock+?>=0").bind(delta, variantId, delta),
        db().prepare("INSERT INTO stock_movements (id,variant_id,delta,reason,reference,actor_id,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1").bind(id(), variantId, delta, reason, clean(body.reference, 100), user.userId, timestamp),
      ]);
      if (!results[0].meta.changes) return fail("Estoque insuficiente ou variação inválida.", 409);
      return json({ ok: true });
    }
    if (action === "confirmOrder") {
      const orderId = clean(body.orderId, 60);
      const order = await first("SELECT id,status FROM orders WHERE id=?", orderId);
      if (!order || order.status !== "pending") return fail("Pedido não está pendente.", 409);
      const results = await db().batch([
        db().prepare("UPDATE variants SET stock=stock-(SELECT quantity FROM order_items WHERE order_id=? AND variant_id=variants.id) WHERE id IN (SELECT variant_id FROM order_items WHERE order_id=?) AND (SELECT COUNT(*) FROM order_items oi JOIN variants vv ON vv.id=oi.variant_id WHERE oi.order_id=? AND vv.stock>=oi.quantity)=(SELECT COUNT(*) FROM order_items WHERE order_id=?) AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='pending')").bind(orderId, orderId, orderId, orderId, orderId),
        db().prepare("UPDATE orders SET status='confirmed',confirmed_at=? WHERE id=? AND status='pending' AND changes()=(SELECT COUNT(*) FROM order_items WHERE order_id=?)").bind(timestamp, orderId, orderId),
        db().prepare("INSERT INTO stock_movements (id,variant_id,delta,reason,reference,actor_id,created_at) SELECT lower(hex(randomblob(16))),variant_id,-quantity,'sale',?, ?, ? FROM order_items WHERE order_id=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='confirmed') AND NOT EXISTS (SELECT 1 FROM stock_movements WHERE reference=? AND reason='sale')").bind(orderId, user.userId, timestamp, orderId, orderId, orderId),
      ]);
      if (!results[1].meta.changes) return fail("Estoque insuficiente para confirmar este pedido.", 409);
      return json({ ok: true });
    }
    if (action === "recordSale") {
      const selected = Array.isArray(body.items) ? body.items : [];
      if (!selected.length || selected.length > 30) return fail("Selecione ao menos um item.");
      const quantities = new Map<string, number>();
      for (const item of selected) { const variantId = clean(item.variantId, 60), quantity = int(item.quantity); if (!variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return fail("Quantidade inválida."); quantities.set(variantId, (quantities.get(variantId) ?? 0) + quantity); }
      const variantIds = [...quantities.keys()];
      const rows = await all(`SELECT v.id,v.color,v.size,v.stock,p.name,p.price_cents,p.sale_price_cents FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id IN (${variantIds.map(() => "?").join(",")})`, ...variantIds);
      if (rows.length !== variantIds.length || rows.some((row) => row.stock < quantities.get(row.id)!)) return fail("Estoque insuficiente para a venda.", 409);
      const saleId = id(), total = rows.reduce((sum, row) => sum + (row.sale_price_cents ?? row.price_cents) * quantities.get(row.id)!, 0);
      const statements = [
        db().prepare("INSERT INTO orders (id,number,customer_name,phone,fulfillment,notes,total_cents,status,source,created_at) VALUES (?,(SELECT COALESCE(MAX(number),0)+1 FROM orders),?,?,?,'',?,'pending','in_person',?)").bind(saleId, clean(body.customerName, 100) || "Venda presencial", clean(body.phone, 25), "pickup", total, timestamp),
        ...rows.map((row) => db().prepare("INSERT INTO order_items (id,order_id,variant_id,product_name,color,size,quantity,unit_price_cents) VALUES (?,?,?,?,?,?,?,?)").bind(id(), saleId, row.id, row.name, row.color, row.size, quantities.get(row.id)!, row.sale_price_cents ?? row.price_cents)),
        db().prepare("UPDATE variants SET stock=stock-(SELECT quantity FROM order_items WHERE order_id=? AND variant_id=variants.id) WHERE id IN (SELECT variant_id FROM order_items WHERE order_id=?) AND (SELECT COUNT(*) FROM order_items oi JOIN variants vv ON vv.id=oi.variant_id WHERE oi.order_id=? AND vv.stock>=oi.quantity)=(SELECT COUNT(*) FROM order_items WHERE order_id=?)").bind(saleId, saleId, saleId, saleId),
        db().prepare("UPDATE orders SET status='confirmed',confirmed_at=? WHERE id=? AND changes()=(SELECT COUNT(*) FROM order_items WHERE order_id=?)").bind(timestamp, saleId, saleId),
        db().prepare("INSERT INTO stock_movements (id,variant_id,delta,reason,reference,actor_id,created_at) SELECT lower(hex(randomblob(16))),variant_id,-quantity,'sale',?,?,? FROM order_items WHERE order_id=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='confirmed')").bind(saleId, user.userId, timestamp, saleId, saleId),
      ];
      const results = await db().batch(statements);
      if (!results[results.length - 2].meta.changes) { await run("UPDATE orders SET status='cancelled' WHERE id=? AND status='pending'", saleId); return fail("O estoque mudou. A venda não foi confirmada.", 409); }
      return json({ ok: true, id: saleId });
    }
    if (action === "reverseSale") {
      const orderId = clean(body.orderId, 60);
      const results = await db().batch([
        db().prepare("UPDATE variants SET stock=stock+(SELECT quantity FROM order_items WHERE order_id=? AND variant_id=variants.id) WHERE id IN (SELECT variant_id FROM order_items WHERE order_id=?) AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='confirmed')").bind(orderId, orderId, orderId),
        db().prepare("UPDATE orders SET status='cancelled' WHERE id=? AND status='confirmed' AND changes()=(SELECT COUNT(*) FROM order_items WHERE order_id=?)").bind(orderId, orderId),
        db().prepare("INSERT INTO stock_movements (id,variant_id,delta,reason,reference,actor_id,created_at) SELECT lower(hex(randomblob(16))),variant_id,quantity,'reversal',?,?,? FROM order_items WHERE order_id=? AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='cancelled') AND NOT EXISTS (SELECT 1 FROM stock_movements WHERE reference=? AND reason='reversal')").bind(orderId, user.userId, timestamp, orderId, orderId, orderId),
      ]);
      if (!results[1].meta.changes) return fail("Esta venda não pode ser estornada.", 409);
      return json({ ok: true });
    }
    if (action === "cancelOrder") {
      const result = await run("UPDATE orders SET status='cancelled' WHERE id=? AND status='pending'", clean(body.orderId, 60));
      return result.meta.changes ? json({ ok: true }) : fail("Somente pedidos pendentes podem ser cancelados.", 409);
    }
    return fail("Ação inválida.");
  } catch (error) { console.error(error); return fail("Não foi possível salvar. Confira os dados e tente novamente.", 500); }
}
