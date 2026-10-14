"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, Heart, MapPin, Menu, Minus, Plus, Search, ShoppingBag, SlidersHorizontal, X } from "lucide-react";

type Variant = { id: string; sku: string; color: string; size: string; stock: number };
type Product = { id: string; name: string; slug: string; brand: string; category_name: string | null; category_slug: string | null; description: string; price_cents: number; sale_price_cents: number | null; featured: number; created_at: string; variants: Variant[]; images: { key: string; alt: string }[] };
type Catalog = { products: Product[]; categories: { id: string; name: string; slug: string }[]; banners: { title: string; subtitle: string; image_key: string | null; link: string }[]; settings: Record<string, string> };
type CartItem = { variantId: string; quantity: number };
const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n / 100);
const imageUrl = (key?: string) => key ? `/api/image/${key}` : "";

export default function Storefront() {
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [brandFilter, setBrandFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState("pickup");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/store", { cache: "no-store" }).then(async (r) => { const result = await r.json() as any; if (!r.ok) throw new Error(result.error); return result as Catalog; }).then(setData).catch((e) => setError(e.message));
    try { setCart(JSON.parse(localStorage.getItem("lc-cart") || "[]")); setFavorites(JSON.parse(localStorage.getItem("lc-favorites") || "[]")); } catch {}
  }, []);
  useEffect(() => { localStorage.setItem("lc-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("lc-favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { setMenuOpen(false); setSelectedColor(""); setSelectedSize(""); setQuantity(1); window.scrollTo(0, 0); }, [path]);
  const s = data?.settings;
  const whatsapp = `https://wa.me/${(s?.whatsapp || "5547984109119").replace(/\D/g, "")}`;
  const visibleCategories = data?.categories.filter((c) => data.products.some((p) => p.category_slug === c.slug)) || [];
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentProduct = path.startsWith("/produto/") ? data?.products.find((p) => p.slug === decodeURIComponent(path.split("/")[2] || "")) : null;
  const currentVariant = currentProduct?.variants.find((v) => v.color === selectedColor && v.size === selectedSize);
  const cartDetails = cart.map((item) => {
    for (const product of data?.products || []) { const variant = product.variants.find((v) => v.id === item.variantId); if (variant) return { ...item, product, variant }; }
    return null;
  }).filter(Boolean) as { variantId: string; quantity: number; product: Product; variant: Variant }[];
  const total = cartDetails.reduce((sum, item) => sum + (item.product.sale_price_cents ?? item.product.price_cents) * item.quantity, 0);

  const catalogProducts = useMemo(() => {
    let products = [...(data?.products || [])];
    const category = path.startsWith("/categoria/") ? decodeURIComponent(path.split("/")[2] || "") : "";
    if (category) products = products.filter((p) => p.category_slug === category);
    if (path === "/promocoes") products = products.filter((p) => p.sale_price_cents !== null);
    if (path === "/lancamentos") products = products.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 16);
    const q = (searchParams.get("q") || query).toLocaleLowerCase("pt-BR").trim();
    if (q) products = products.filter((p) => `${p.name} ${p.brand} ${p.variants.map((v) => v.sku).join(" ")}`.toLocaleLowerCase("pt-BR").includes(q));
    if (brandFilter) products = products.filter((p) => p.brand === brandFilter);
    if (sizeFilter) products = products.filter((p) => p.variants.some((v) => v.size === sizeFilter && (!onlyAvailable || v.stock > 0)));
    if (colorFilter) products = products.filter((p) => p.variants.some((v) => v.color === colorFilter && (!onlyAvailable || v.stock > 0)));
    if (onlyAvailable) products = products.filter((p) => p.variants.some((v) => v.stock > 0));
    if (minPrice && Number(minPrice) >= 0) products = products.filter((p) => (p.sale_price_cents ?? p.price_cents) >= Number(minPrice) * 100);
    if (maxPrice && Number(maxPrice) >= 0) products = products.filter((p) => (p.sale_price_cents ?? p.price_cents) <= Number(maxPrice) * 100);
    if (sort === "price-asc") products.sort((a, b) => (a.sale_price_cents ?? a.price_cents) - (b.sale_price_cents ?? b.price_cents));
    if (sort === "price-desc") products.sort((a, b) => (b.sale_price_cents ?? b.price_cents) - (a.sale_price_cents ?? a.price_cents));
    if (sort === "name") products.sort((a, b) => a.name.localeCompare(b.name));
    return products;
  }, [data, path, searchParams, query, sort, brandFilter, sizeFilter, colorFilter, minPrice, maxPrice, onlyAvailable]);

  function addToCart() {
    if (!currentVariant || currentVariant.stock < 1) { setNotice("Selecione cor e numeração disponíveis."); return; }
    const existing = cart.find((item) => item.variantId === currentVariant.id)?.quantity || 0;
    if (existing + quantity > currentVariant.stock) { setNotice("Quantidade acima do estoque disponível."); return; }
    setCart((items) => [...items.filter((item) => item.variantId !== currentVariant.id), { variantId: currentVariant.id, quantity: existing + quantity }]);
    setNotice("Adicionado ao carrinho.");
  }
  function updateCart(variantId: string, newQuantity: number, stock: number) {
    if (newQuantity > stock) { setNotice("Estoque insuficiente."); return; }
    setCart((items) => newQuantity < 1 ? items.filter((item) => item.variantId !== variantId) : items.map((item) => item.variantId === variantId ? { ...item, quantity: newQuantity } : item));
  }
  async function checkout(event: React.FormEvent) {
    event.preventDefault(); setNotice(""); setSubmitting(true);
    try {
      const response = await fetch("/api/store", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "checkout", name, phone, fulfillment, notes, items: cart }) });
      const result = await response.json() as any;
      if (!response.ok) throw new Error(result.error);
      setCart([]);
      setNotice(`Pedido #${String(result.number).padStart(6, "0")} registrado. Abrindo WhatsApp…`);
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) { setNotice(e.message || "Não foi possível registrar o pedido."); }
    finally { setSubmitting(false); }
  }
  const productCard = (p: Product) => <article className="product-card" key={p.id}>
    <a href={`/produto/${p.slug}`} className="product-image">{p.images[0] ? <img src={imageUrl(p.images[0].key)} alt={p.images[0].alt || p.name} loading="lazy" /> : <span className="product-placeholder">Foto em breve</span>}{p.variants.every((v) => v.stock === 0) ? <span className="pill">Esgotado</span> : p.sale_price_cents !== null && <span className="pill">Oferta</span>}</a>
    <button className={`heart ${favorites.includes(p.id) ? "active" : ""}`} aria-label="Favoritar" onClick={() => setFavorites((items) => items.includes(p.id) ? items.filter((x) => x !== p.id) : [...items, p.id])}><Heart size={19} fill={favorites.includes(p.id) ? "currentColor" : "none"} /></button>
    <div className="product-copy"><small>{p.brand} · {p.category_name || "Calçados"}</small><a href={`/produto/${p.slug}`}><h3>{p.name}</h3></a><div className="price-line">{p.sale_price_cents !== null && <del>{money(p.price_cents)}</del>}<strong>{money(p.sale_price_cents ?? p.price_cents)}</strong></div><a className="text-link" href={`/produto/${p.slug}`}>Ver detalhes <ArrowRight size={15} /></a></div>
  </article>;

  return <div className="site-shell">
    <div className="announcement">{s?.announcement || "Seu estilo começa pelos pés."}</div>
    <header className="site-header"><div className="header-inner">
      <button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(true)}><Menu size={23} /></button>
      <a className="brand" href="/"><img src="/logo-loja-dos-calcados.png" alt="Loja dos Calçados" /></a>
      <nav className="desktop-nav" aria-label="Navegação principal"><a href="/">Início</a><a href="/calcados">Todos os calçados</a>{visibleCategories.slice(0, 3).map((c) => <a key={c.id} href={`/categoria/${c.slug}`}>{c.name}</a>)}<a href="/promocoes">Promoções</a><a href="/contato">Contato</a></nav>
      <div className="header-actions"><button className="icon-button search-button" aria-label="Buscar" onClick={() => document.getElementById("header-search")?.focus()}><Search size={21} /></button><a className="icon-button" href="/favoritos" aria-label="Favoritos"><Heart size={21} /></a><a className="icon-button bag-button" href="/carrinho" aria-label={`Carrinho com ${count} itens`}><ShoppingBag size={21} />{count > 0 && <span>{count}</span>}</a></div>
    </div><div className="search-row"><form onSubmit={(e) => { e.preventDefault(); router.push(`/calcados?q=${encodeURIComponent(query)}`); }}><Search size={17} /><input id="header-search" placeholder="Busque por modelo, marca ou código" value={query} onChange={(e) => setQuery(e.target.value)} /><button type="submit">Buscar</button></form><a className="whatsapp-top" href={whatsapp} target="_blank" rel="noreferrer">Atendimento pelo WhatsApp <ArrowRight size={15} /></a></div></header>
    {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)}><nav className="mobile-drawer" onClick={(e) => e.stopPropagation()}><button className="icon-button drawer-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X /></button><img src="/logo-loja-dos-calcados.png" alt="Loja dos Calçados" /><a href="/">Início</a><a href="/calcados">Todos os calçados</a>{visibleCategories.map((c) => <a key={c.id} href={`/categoria/${c.slug}`}>{c.name}</a>)}<a href="/promocoes">Promoções</a><a href="/sobre">Sobre a loja</a><a href="/contato">Contato</a></nav></div>}
    <main>
      {error && <div className="container error-panel">{error} <button onClick={() => location.reload()}>Tentar novamente</button></div>}
      {!data && !error && <div className="container loading-panel">Carregando a loja…</div>}
      {data && path === "/" && <>
        <section className="hero" style={{ backgroundImage: `url(${data.banners[0]?.image_key ? imageUrl(data.banners[0].image_key) : "/banner-editorial.png"})` }}><div className="hero-inner"><span className="eyebrow">LOJA DOS CALÇADOS · RIO DO SUL</span><h1>{data.banners[0]?.title || s?.hero_title}</h1><p>{data.banners[0]?.subtitle || s?.hero_subtitle}</p><a className="button-dark" href={data.banners[0]?.link || "/calcados"}>Explorar coleção <ArrowRight size={17} /></a><span className="illustrative">Imagem editorial ilustrativa</span></div></section>
        <div className="trust-strip"><span>Curadoria de calçados</span><span>Atendimento próximo</span><span>Retirada na loja</span></div>
        <section className="container section"><div className="section-heading"><div><span className="eyebrow">ENCONTRE SEU ESTILO</span><h2>Explore por categoria</h2></div><a className="text-link" href="/calcados">Ver todos <ArrowRight size={17} /></a></div>{visibleCategories.length ? <div className="category-grid">{visibleCategories.slice(0, 5).map((c, i) => <a className="category-tile" href={`/categoria/${c.slug}`} key={c.id}><span className="category-number">0{i + 1}</span><strong>{c.name}</strong><span>Explorar <ArrowRight size={16} /></span></a>)}</div> : <div className="empty-state compact">Nossa seleção está sendo preparada. Em breve, você poderá explorar as categorias por aqui.</div>}</section>
        <section className="container section"><div className="section-heading"><div><span className="eyebrow">CURADORIA DA LOJA</span><h2>Acabaram de chegar</h2></div><a className="text-link" href="/lancamentos">Ver novidades <ArrowRight size={17} /></a></div>{data.products.length ? <div className="product-grid">{data.products.slice(0, 4).map(productCard)}</div> : <div className="empty-state"><ShoppingBag size={32} /><h3>Novidades a caminho</h3><p>Os produtos aparecerão aqui assim que forem cadastrados pela loja.</p><a className="button-outline" href={whatsapp} target="_blank" rel="noreferrer">Fale com a loja</a></div>}</section>
        {data.products.some((p) => p.featured) && <section className="container section"><div className="section-heading"><div><span className="eyebrow">ESCOLHAS ESPECIAIS</span><h2>Destaques da loja</h2></div></div><div className="product-grid">{data.products.filter((p) => p.featured).slice(0, 4).map(productCard)}</div></section>}
        {data.products.some((p) => p.sale_price_cents !== null) && <section className="container section"><div className="section-heading"><div><span className="eyebrow">OPORTUNIDADES</span><h2>Promoções</h2></div><a className="text-link" href="/promocoes">Ver ofertas <ArrowRight size={17} /></a></div><div className="product-grid">{data.products.filter((p) => p.sale_price_cents !== null).slice(0, 4).map(productCard)}</div></section>}
        <section className="editorial-band"><div className="container editorial-grid"><div><span className="eyebrow">MAIS QUE CALÇADOS</span><h2>Um passo de cada vez, com você.</h2><p>Na Loja dos Calçados, atendemos quem busca opções para o dia a dia e para momentos especiais. Estamos em Rio do Sul e será um prazer receber você.</p><a className="button-outline" href="/sobre">Conheça a loja <ArrowRight size={17} /></a></div><div className="editorial-mark"><img src="/logo-loja-dos-calcados.png" alt="" /></div></div></section>
        <section className="container section visit-section"><div><span className="eyebrow">VISITE A LOJA</span><h2>Estamos em Rio do Sul</h2><p>{s?.address}</p><p className="muted">{s?.reference}</p><a className="button-dark" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s?.address || "Rio do Sul SC")}`} target="_blank" rel="noreferrer">Ver localização <MapPin size={17} /></a></div><div className="visit-card"><MapPin size={29} /><strong>Atendimento pessoal</strong><p>Quer confirmar um modelo ou numeração? Fale diretamente com nossa equipe.</p><a href={whatsapp} target="_blank" rel="noreferrer">Conversar no WhatsApp <ArrowRight size={16} /></a></div></section>
      </>}
      {data && (path === "/calcados" || path === "/promocoes" || path === "/lancamentos" || path.startsWith("/categoria/")) && <section className="container catalog-page"><span className="eyebrow">LOJA DOS CALÇADOS</span><h1>{path === "/promocoes" ? "Promoções" : path === "/lancamentos" ? "Lançamentos" : path.startsWith("/categoria/") ? data.categories.find((c) => c.slug === path.split("/")[2])?.name || "Categoria" : "Todos os calçados"}</h1><p className="muted">Escolha o par que combina com você.</p><div className="catalog-toolbar"><span><SlidersHorizontal size={17} /> {catalogProducts.length} {catalogProducts.length === 1 ? "produto" : "produtos"}</span><label>Ordenar por <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Mais recentes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="name">Nome</option></select><ChevronDown size={15} /></label></div><div className="filter-bar"><label>Marca<select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}><option value="">Todas</option>{[...new Set(data.products.map((p) => p.brand))].sort().map((v) => <option key={v}>{v}</option>)}</select></label><label>Numeração<select value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}><option value="">Todas</option>{[...new Set(data.products.flatMap((p) => p.variants.map((v) => v.size)))].sort().map((v) => <option key={v}>{v}</option>)}</select></label><label>Cor<select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)}><option value="">Todas</option>{[...new Set(data.products.flatMap((p) => p.variants.map((v) => v.color)))].sort().map((v) => <option key={v}>{v}</option>)}</select></label><label>Preço mínimo<input type="number" min="0" step=".01" placeholder="R$" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} /></label><label>Preço máximo<input type="number" min="0" step=".01" placeholder="R$" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} /></label><label className="filter-check"><input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> Disponíveis</label></div>{catalogProducts.length ? <div className="product-grid">{catalogProducts.map(productCard)}</div> : <div className="empty-state"><Search size={31} /><h3>Nenhum calçado encontrado</h3><p>Tente outra busca ou volte ao catálogo completo.</p><a className="button-outline" href="/calcados">Ver todos os calçados</a></div>}</section>}
      {data && path.startsWith("/produto/") && (currentProduct ? <section className="container detail-page"><div className="breadcrumbs"><a href="/">Início</a> / <a href="/calcados">Calçados</a> / {currentProduct.name}</div><div className="detail-grid"><div className="detail-gallery">{currentProduct.images.length ? currentProduct.images.map((img) => <img key={img.key} src={imageUrl(img.key)} alt={img.alt || currentProduct.name} />) : <div className="detail-placeholder">Foto em breve</div>}</div><div className="detail-info"><span className="eyebrow">{currentProduct.brand}</span><h1>{currentProduct.name}</h1><p className="muted">Código: {currentProduct.variants[0]?.sku || "—"}</p><div className="detail-price">{currentProduct.sale_price_cents !== null && <del>{money(currentProduct.price_cents)}</del>}<strong>{money(currentProduct.sale_price_cents ?? currentProduct.price_cents)}</strong></div><p>{currentProduct.description}</p><div className="selector"><strong>Cor</strong><div className="choices">{[...new Set(currentProduct.variants.map((v) => v.color))].map((color) => <button className={selectedColor === color ? "selected" : ""} onClick={() => { setSelectedColor(color); setSelectedSize(""); }} key={color}>{color}</button>)}</div></div><div className="selector"><strong>Numeração</strong><div className="choices">{[...new Set(currentProduct.variants.filter((v) => !selectedColor || v.color === selectedColor).map((v) => v.size))].sort().map((size) => { const available = currentProduct.variants.some((v) => v.color === selectedColor && v.size === size && v.stock > 0); return <button className={selectedSize === size ? "selected" : ""} onClick={() => setSelectedSize(size)} disabled={!selectedColor || !available} key={size}>{size}</button>; })}</div><small className="muted">Escolha uma cor para ver as numerações disponíveis.</small></div>{currentVariant && <p className="stock-hint">{currentVariant.stock > 0 ? `${currentVariant.stock} par(es) disponível(is)` : "Esgotado"}</p>}<div className="purchase-row"><div className="quantity"><button aria-label="Diminuir" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>{quantity}<button aria-label="Aumentar" onClick={() => setQuantity(Math.min(currentVariant?.stock || 1, quantity + 1))}><Plus size={16} /></button></div><button className="button-dark" onClick={addToCart} disabled={!currentVariant || currentVariant.stock < 1}>Adicionar ao carrinho <ShoppingBag size={17} /></button></div><a className="text-link" href={`${whatsapp}?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre ${currentProduct.name}.`)}`} target="_blank" rel="noreferrer">Tirar dúvidas pelo WhatsApp <ArrowRight size={16} /></a></div></div></section> : <div className="container empty-state"><h1>Produto não encontrado</h1><a href="/calcados">Voltar ao catálogo</a></div>)}
      {data && (path === "/carrinho" || path === "/checkout") && <section className="container cart-page"><span className="eyebrow">SEU PEDIDO</span><h1>{path === "/checkout" ? "Finalizar pedido" : "Meu carrinho"}</h1>{cartDetails.length ? <div className="cart-grid"><div>{cartDetails.map((item) => <div className="cart-item" key={item.variantId}><div className="cart-thumb">{item.product.images[0] ? <img src={imageUrl(item.product.images[0].key)} alt={item.product.name} /> : <ShoppingBag />}</div><div><strong>{item.product.name}</strong><p>{item.variant.color} · Tamanho {item.variant.size}</p><span>{money(item.product.sale_price_cents ?? item.product.price_cents)}</span><div className="quantity"><button aria-label="Diminuir" onClick={() => updateCart(item.variantId, item.quantity - 1, item.variant.stock)}><Minus size={14} /></button>{item.quantity}<button aria-label="Aumentar" onClick={() => updateCart(item.variantId, item.quantity + 1, item.variant.stock)}><Plus size={14} /></button></div></div><strong>{money((item.product.sale_price_cents ?? item.product.price_cents) * item.quantity)}</strong></div>)}</div><aside className="summary-card"><h2>Resumo</h2><div><span>Subtotal</span><strong>{money(total)}</strong></div><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div><p>Disponibilidade e pagamento serão confirmados pela loja.</p>{path === "/carrinho" ? <a className="button-dark" href="/checkout">Finalizar pedido <ArrowRight size={17} /></a> : <form onSubmit={checkout} className="checkout-form"><label>Seu nome<input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></label><label>Telefone<input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label><label>Como deseja receber?<select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}><option value="pickup">Retirada na loja</option><option value="delivery_inquiry">Consultar entrega</option></select></label><label>Observações<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label><button className="button-dark" disabled={submitting}>{submitting ? "Registrando…" : "Registrar e abrir WhatsApp"}</button></form>}</aside></div> : <div className="empty-state"><ShoppingBag size={32} /><h3>Seu carrinho está vazio</h3><p>Explore o catálogo e escolha seu próximo par.</p><a className="button-dark" href="/calcados">Ver calçados <ArrowRight size={16} /></a></div>}</section>}
      {data && path === "/favoritos" && <section className="container catalog-page"><span className="eyebrow">SUA SELEÇÃO</span><h1>Favoritos</h1>{favorites.length ? <div className="product-grid">{data.products.filter((p) => favorites.includes(p.id)).map(productCard)}</div> : <div className="empty-state"><Heart size={32} /><h3>Nenhum favorito ainda</h3><a href="/calcados">Explorar calçados</a></div>}</section>}
      {data && path === "/sobre" && <section className="container content-page"><span className="eyebrow">NOSSA HISTÓRIA</span><h1>Sobre a loja</h1><p>A Loja dos Calçados atua em Rio do Sul, Santa Catarina. Nossa equipe recebe você no Polo Shopping para ajudar a encontrar o calçado certo para cada ocasião.</p><p>Quer conhecer a seleção disponível ou confirmar uma numeração? Entre em contato e converse diretamente conosco.</p><a className="button-dark" href={whatsapp} target="_blank" rel="noreferrer">Falar com a loja <ArrowRight size={16} /></a></section>}
      {data && path === "/contato" && <section className="container content-page"><span className="eyebrow">ESTAMOS PERTO DE VOCÊ</span><h1>Contato e localização</h1><div className="contact-grid"><div><h2>Visite a loja</h2><p>{s?.address}</p><p>{s?.reference}</p><a className="button-outline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s?.address || "Rio do Sul SC")}`} target="_blank" rel="noreferrer">Abrir no mapa <MapPin size={16} /></a></div><div><h2>Fale com a equipe</h2><p>{s?.phone}</p><p>{s?.instagram}</p><a className="button-dark" href={whatsapp} target="_blank" rel="noreferrer">Abrir WhatsApp <ArrowRight size={16} /></a></div></div></section>}
      {data && path === "/privacidade" && <section className="container content-page"><span className="eyebrow">INFORMAÇÕES</span><h1>Privacidade</h1><p>Para solicitar um pedido, coletamos seu nome, telefone, itens escolhidos e observações enviadas por você. Esses dados são usados para atender à sua solicitação e ficam disponíveis à administração da loja.</p><p>Para solicitar acesso, correção ou exclusão de seus dados, entre em contato pelo WhatsApp {s?.phone}.</p></section>}
      {data && path === "/trocas" && <section className="container content-page"><span className="eyebrow">ATENDIMENTO</span><h1>Trocas e devoluções</h1><p>Para orientações sobre troca ou devolução de um produto, entre em contato com a loja. Nossa equipe informará os procedimentos aplicáveis ao seu pedido.</p><a className="button-dark" href={whatsapp} target="_blank" rel="noreferrer">Falar sobre meu pedido <ArrowRight size={16} /></a></section>}
      {data && !["/", "/calcados", "/promocoes", "/lancamentos", "/carrinho", "/checkout", "/favoritos", "/sobre", "/contato", "/privacidade", "/trocas"].includes(path) && !path.startsWith("/produto/") && !path.startsWith("/categoria/") && <section className="container empty-state"><h1>Página não encontrada</h1><a href="/">Voltar ao início</a></section>}
    </main>
    <footer className="footer"><div className="container footer-grid"><div><img src="/logo-loja-dos-calcados.png" alt="Loja dos Calçados" /><p>Calçados para acompanhar seus caminhos.</p></div><div><h3>Explore</h3><a href="/calcados">Todos os calçados</a><a href="/promocoes">Promoções</a><a href="/sobre">Sobre a loja</a><a href="/contato">Contato</a></div><div><h3>Atendimento</h3><a href={whatsapp} target="_blank" rel="noreferrer">{s?.phone || "(47) 98410-9119"}</a><span>{s?.address}</span>{s?.hours && <span>{s.hours}</span>}</div><div><h3>Informações</h3><a href="/privacidade">Privacidade</a><a href="/trocas">Trocas e devoluções</a><a href="/admin">Área administrativa</a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Loja dos Calçados</span><a href="/contato">Rio do Sul · Santa Catarina</a></div></footer>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Fechar"><X size={16} /></button></div>}
  </div>;
}
