import type { Product } from "@/lib/shop-db";

type DbProduct = { id: number; name: string; brand: string; category: string; variant: string; unit: string; price_paise: number; stock: number; low_stock_at: number; aliases: string; image_url: string; active: boolean; updated_at: string };

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing");
  return { url: url.replace(/\/$/, ""), key };
}

async function request(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1${path}`, { ...init, cache: "no-store", headers: { apikey: key, "content-type": "application/json", ...(init.headers || {}) } });
  if (!response.ok) { const body = await response.text(); throw new Error(body || `Supabase error ${response.status}`); }
  if (response.status === 204) return null;
  const text = await response.text(); return text ? JSON.parse(text) : null;
}

function mapProduct(row: DbProduct): Product { return { id: row.id, name: row.name, brand: row.brand, category: row.category, variant: row.variant, unit: row.unit, pricePaise: row.price_paise, stock: row.stock, lowStockAt: row.low_stock_at, aliases: row.aliases, imageUrl: row.image_url, active: row.active, updatedAt: row.updated_at }; }
function toDbProduct(input: Partial<Omit<Product, "id" | "updatedAt">>) { return { ...(input.name === undefined ? {} : { name: input.name }), ...(input.brand === undefined ? {} : { brand: input.brand }), ...(input.category === undefined ? {} : { category: input.category }), ...(input.variant === undefined ? {} : { variant: input.variant }), ...(input.unit === undefined ? {} : { unit: input.unit }), ...(input.pricePaise === undefined ? {} : { price_paise: input.pricePaise }), ...(input.stock === undefined ? {} : { stock: input.stock }), ...(input.lowStockAt === undefined ? {} : { low_stock_at: input.lowStockAt }), ...(input.aliases === undefined ? {} : { aliases: input.aliases }), ...(input.imageUrl === undefined ? {} : { image_url: input.imageUrl }), ...(input.active === undefined ? {} : { active: input.active }), updated_at: new Date().toISOString() }; }

export async function listProducts(query = "", includeInactive = false) {
  if (query.trim() && !includeInactive) return ((await request("/rpc/search_shop_products", { method: "POST", body: JSON.stringify({ search_text: query }) })) as DbProduct[]).map(mapProduct);
  const active = includeInactive ? "" : "&active=eq.true";
  return ((await request(`/products?select=*&order=active.desc,name.asc,variant.asc${active}&limit=100`)) as DbProduct[]).map(mapProduct);
}
export async function createProduct(input: Omit<Product, "id" | "updatedAt">) { const rows = await request("/products", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(toDbProduct(input)) }) as DbProduct[]; return mapProduct(rows[0]); }
export async function updateProduct(id: number, input: Partial<Omit<Product, "id" | "updatedAt">>) { const rows = await request(`/products?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(toDbProduct(input)) }) as DbProduct[]; return rows[0] ? mapProduct(rows[0]) : null; }
export async function archiveProduct(id: number) { return updateProduct(id, { active: false }); }

export async function getCart(cartId: string) {
  await request("/carts?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({ id: cartId }) });
  const rows = await request(`/cart_items?cart_id=eq.${encodeURIComponent(cartId)}&select=quantity,products(id,name,variant,unit,price_paise,stock,image_url)&order=product_id.asc`) as { quantity: number; products: DbProduct }[];
  const items = rows.map((row) => ({ productId: row.products.id, quantity: row.quantity, name: row.products.name, variant: row.products.variant, unit: row.products.unit, pricePaise: row.products.price_paise, stock: row.products.stock, imageUrl: row.products.image_url, lineTotalPaise: row.products.price_paise * row.quantity }));
  return { id: cartId, items, itemCount: items.reduce((sum, line) => sum + line.quantity, 0), subtotalPaise: items.reduce((sum, line) => sum + line.lineTotalPaise, 0) };
}
export async function setCartItem(cartId: string, productId: number, quantity: number) { await request("/rpc/set_shop_cart_item", { method: "POST", body: JSON.stringify({ p_cart_id: cartId, p_product_id: productId, p_quantity: quantity }) }); return getCart(cartId); }

export async function createOrder(input: { cartId: string; fulfillment: "delivery" | "pickup"; paymentMethod: "cod" | "online" }) { const id = await request("/rpc/place_shop_order", { method: "POST", body: JSON.stringify({ p_cart_id: input.cartId, p_fulfillment: input.fulfillment, p_payment_method: input.paymentMethod }) }) as string; return getOrder(id); }
export async function getOrder(id: string) { const rows = await request(`/orders?id=eq.${encodeURIComponent(id)}&select=*,order_items(*)`) as Record<string, unknown>[]; if (!rows[0]) return null; return { ...rows[0], paymentLink: rows[0].payment_method === "online" ? `https://payments.example.test/pay/${id}` : null }; }
export async function listOrders() { return await request("/orders?select=*,order_items(*)&order=created_at.desc&limit=100") as Record<string, unknown>[]; }
export async function updateOrder(id: string, input: { orderStatus?: string; paymentStatus?: string }) { const body = { ...(input.orderStatus ? { order_status: input.orderStatus } : {}), ...(input.paymentStatus ? { payment_status: input.paymentStatus } : {}), updated_at: new Date().toISOString() }; const rows = await request(`/orders?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(body) }) as Record<string, unknown>[]; return rows[0] ? getOrder(id) : null; }
