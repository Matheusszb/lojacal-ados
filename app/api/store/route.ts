import { all, db, fail, first, getCatalog, getSettings, id, json, now, clean } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return json(await getCatalog()); }
  catch (error) { console.error(error); return fail("Não foi possível carregar o catálogo.", 500); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, any>;
    if (body.action !== "checkout") return fail("Ação inválida.");
    const name = clean(body.name, 100), phone = clean(body.phone, 25);
    const fulfillment = clean(body.fulfillment, 25), notes = clean(body.notes, 500);
    if (name.length < 2 || !/^\+?[\d\s()\-]{10,25}$/.test(phone)) return fail("Informe nome e telefone válidos.");
    if (!["pickup", "delivery_inquiry"].includes(fulfillment)) return fail("Escolha a forma de recebimento.");
    const requested = Array.isArray(body.items) ? body.items : [];
    if (!requested.length || requested.length > 30) return fail("Carrinho inválido.");
    const quantities = new Map<string, number>();
    for (const item of requested) {
      const variantId = clean(item.variantId, 60), quantity = Number(item.quantity);
      if (!variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return fail("Quantidade inválida.");
      quantities.set(variantId, (quantities.get(variantId) ?? 0) + quantity);
    }
    const ids = [...quantities.keys()];
    const rows = await all(`SELECT v.id, v.color, v.size, v.stock, p.name, p.price_cents, p.sale_price_cents, p.active, c.active AS category_active FROM variants v JOIN products p ON p.id=v.product_id LEFT JOIN categories c ON c.id=p.category_id WHERE v.id IN (${ids.map(() => "?").join(",")})`, ...ids);
    if (rows.length !== ids.length) return fail("Um produto do carrinho não está mais disponível.", 409);
    for (const row of rows) if (!row.active || row.category_active === 0 || row.stock < quantities.get(row.id)!) return fail(`Produto indisponível: ${row.name}, ${row.color}, ${row.size}.`, 409);
    const total = rows.reduce((sum, row) => sum + (row.sale_price_cents ?? row.price_cents) * quantities.get(row.id)!, 0);
    const orderId = id(), timestamp = now();
    // Commit the order and its items together. Stock changes on confirmation.
    const statements = [
      db().prepare("INSERT INTO orders (id,number,customer_name,phone,fulfillment,notes,total_cents,status,source,created_at) VALUES (?,nextval('order_number_seq'),?,?,?,?,?,'pending','online',?)").bind(orderId, name, phone, fulfillment, notes, total, timestamp),
      ...rows.map((row) => db().prepare("INSERT INTO order_items (id,order_id,variant_id,product_name,color,size,quantity,unit_price_cents) VALUES (?,?,?,?,?,?,?,?)").bind(id(), orderId, row.id, row.name, row.color, row.size, quantities.get(row.id)!, row.sale_price_cents ?? row.price_cents)),
    ];
    await db().batch(statements);
    const order = await first("SELECT number FROM orders WHERE id=?", orderId);
    const settings = await getSettings();
    const format = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n / 100);
    const message = [
      `Olá! Quero fazer um pedido na ${settings.store_name}.`,
      `Pedido: #${String(order?.number ?? "").padStart(6, "0")}`,
      ...rows.map((row) => `\n${row.name}\nCor: ${row.color} | Tamanho: ${row.size}\nQuantidade: ${quantities.get(row.id)} | Preço: ${format(row.sale_price_cents ?? row.price_cents)}`),
      `\nTotal: ${format(total)}`,
      `Recebimento: ${fulfillment === "pickup" ? "Retirada na loja" : "Consultar entrega"}.`,
      `Nome: ${name} | Telefone: ${phone}`,
      notes ? `Observações: ${notes}` : "",
      "Gostaria de confirmar a disponibilidade e o pagamento.",
    ].filter(Boolean).join("\n");
    return json({ orderId, number: order?.number, whatsappUrl: `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}` });
  } catch (error) { console.error(error); return fail("Não foi possível registrar o pedido. Tente novamente.", 500); }
}
