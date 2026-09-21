import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

export type Product = { id: number; name: string; brand: string; category: string; variant: string; unit: string; pricePaise: number; stock: number; lowStockAt: number; aliases: string; imageUrl: string; active: boolean; updatedAt: string };
export type CartLine = { productId: number; quantity: number; name: string; variant: string; unit: string; pricePaise: number; stock: number; imageUrl: string; lineTotalPaise: number };

const DB_FILE = path.join(process.cwd(), "data", "shop.db");
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA busy_timeout = 10000;");
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, brand TEXT NOT NULL DEFAULT '', category TEXT NOT NULL,
    variant TEXT NOT NULL, unit TEXT NOT NULL DEFAULT 'piece', price_paise INTEGER NOT NULL CHECK(price_paise >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0), low_stock_at INTEGER NOT NULL DEFAULT 5,
    aliases TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS products_search ON products(name, brand, category, variant);
  CREATE TABLE IF NOT EXISTS carts (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'active', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS cart_items (
    cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK(quantity > 0), PRIMARY KEY(cart_id, product_id)
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, cart_id TEXT NOT NULL, customer_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '', fulfillment TEXT NOT NULL, payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending', order_status TEXT NOT NULL DEFAULT 'confirmed',
    subtotal_paise INTEGER NOT NULL, delivery_paise INTEGER NOT NULL DEFAULT 0, total_paise INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS order_items (
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER NOT NULL,
    name TEXT NOT NULL, variant TEXT NOT NULL, quantity INTEGER NOT NULL, price_paise INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, delta INTEGER NOT NULL, reason TEXT NOT NULL,
    reference_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const seed = [
  ["Colgate Strong Teeth", "Colgate", "Toothpaste", "100 g", "tube", 6800, 24, "coldgate,కోల్గేట్,कोलगेट,tooth paste", "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=400&q=80"],
  ["Colgate Strong Teeth", "Colgate", "Toothpaste", "200 g", "tube", 12200, 12, "coldgate,కోల్గేట్,कोलगेट,big colgate", "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=400&q=80"],
  ["Santoor Sandal Soap", "Santoor", "Bath soap", "100 g", "piece", 4200, 18, "santor,సంతూర్,संतूर,soap", "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=400&q=80"],
  ["Santoor Sandal Soap", "Santoor", "Bath soap", "100 g × 4", "pack", 15600, 8, "santoor pack,సంతూర్ ప్యాక్,संतूर पैक", "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=400&q=80"],
  ["Aashirvaad Atta", "Aashirvaad", "Groceries", "5 kg", "bag", 29500, 10, "atta,flour,గోధుమ పిండి,आटा", "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80"],
  ["Tata Salt", "Tata", "Groceries", "1 kg", "packet", 2800, 30, "salt,ఉప్పు,नमक", "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=400&q=80"],
  ["Parle-G Biscuits", "Parle", "Snacks", "800 g", "pack", 8500, 16, "parleg,biscuit,బిస్కెట్,बिस्कुट", "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80"],
  ["Surf Excel Easy Wash", "Surf Excel", "Laundry", "1 kg", "packet", 15400, 6, "surf,detergent,సర్ఫ్,डिटर्जेंट", "https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=400&q=80"],
];
if ((db.prepare("SELECT COUNT(*) count FROM products").get() as { count: number }).count === 0) {
  const insert = db.prepare("INSERT INTO products(name,brand,category,variant,unit,price_paise,stock,aliases,image_url) VALUES(?,?,?,?,?,?,?,?,?)");
  for (const row of seed) insert.run(...row);
}

function mapProduct(row: Record<string, unknown>): Product {
  return { id: Number(row.id), name: String(row.name), brand: String(row.brand), category: String(row.category), variant: String(row.variant), unit: String(row.unit), pricePaise: Number(row.price_paise), stock: Number(row.stock), lowStockAt: Number(row.low_stock_at), aliases: String(row.aliases), imageUrl: String(row.image_url), active: Boolean(row.active), updatedAt: String(row.updated_at) };
}

export function listProducts(query = "", includeInactive = false) {
  const q = `%${query.trim().toLowerCase()}%`;
  const rows = db.prepare(`SELECT * FROM products WHERE (? = '' OR lower(name||' '||brand||' '||category||' '||variant||' '||aliases) LIKE ?) ${includeInactive ? "" : "AND active=1"} ORDER BY active DESC, name, variant LIMIT 100`).all(query.trim(), q) as Record<string, unknown>[];
  return rows.map(mapProduct);
}

export function createProduct(input: Omit<Product, "id" | "updatedAt">) {
  const result = db.prepare("INSERT INTO products(name,brand,category,variant,unit,price_paise,stock,low_stock_at,aliases,image_url,active) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(input.name, input.brand, input.category, input.variant, input.unit, input.pricePaise, input.stock, input.lowStockAt, input.aliases, input.imageUrl, input.active ? 1 : 0);
  return mapProduct(db.prepare("SELECT * FROM products WHERE id=?").get(result.lastInsertRowid) as Record<string, unknown>);
}

export function updateProduct(id: number, input: Partial<Omit<Product, "id" | "updatedAt">>) {
  const current = db.prepare("SELECT * FROM products WHERE id=?").get(id) as Record<string, unknown> | undefined;
  if (!current) return null;
  const merged = { ...mapProduct(current), ...input };
  const stockDelta = merged.stock - Number(current.stock);
  db.prepare("UPDATE products SET name=?,brand=?,category=?,variant=?,unit=?,price_paise=?,stock=?,low_stock_at=?,aliases=?,image_url=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(merged.name, merged.brand, merged.category, merged.variant, merged.unit, merged.pricePaise, merged.stock, merged.lowStockAt, merged.aliases, merged.imageUrl, merged.active ? 1 : 0, id);
  if (stockDelta) db.prepare("INSERT INTO inventory_movements(product_id,delta,reason) VALUES(?,?,'admin adjustment')").run(id, stockDelta);
  return mapProduct(db.prepare("SELECT * FROM products WHERE id=?").get(id) as Record<string, unknown>);
}

export function archiveProduct(id: number) { return updateProduct(id, { active: false }); }

export function getCart(cartId: string) {
  db.prepare("INSERT OR IGNORE INTO carts(id) VALUES(?)").run(cartId);
  const items = db.prepare("SELECT ci.product_id,ci.quantity,p.name,p.variant,p.unit,p.price_paise,p.stock,p.image_url FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=? ORDER BY p.name").all(cartId) as Record<string, unknown>[];
  const lines: CartLine[] = items.map((row) => ({ productId: Number(row.product_id), quantity: Number(row.quantity), name: String(row.name), variant: String(row.variant), unit: String(row.unit), pricePaise: Number(row.price_paise), stock: Number(row.stock), imageUrl: String(row.image_url), lineTotalPaise: Number(row.price_paise) * Number(row.quantity) }));
  return { id: cartId, items: lines, itemCount: lines.reduce((sum, line) => sum + line.quantity, 0), subtotalPaise: lines.reduce((sum, line) => sum + line.lineTotalPaise, 0) };
}

export function setCartItem(cartId: string, productId: number, quantity: number) {
  getCart(cartId);
  const product = db.prepare("SELECT * FROM products WHERE id=? AND active=1").get(productId) as Record<string, unknown> | undefined;
  if (!product) throw new Error("PRODUCT_NOT_AVAILABLE");
  if (quantity <= 0) db.prepare("DELETE FROM cart_items WHERE cart_id=? AND product_id=?").run(cartId, productId);
  else {
    if (quantity > Number(product.stock)) throw new Error(`ONLY_${product.stock}_AVAILABLE`);
    db.prepare("INSERT INTO cart_items(cart_id,product_id,quantity) VALUES(?,?,?) ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=excluded.quantity").run(cartId, productId, quantity);
  }
  db.prepare("UPDATE carts SET updated_at=CURRENT_TIMESTAMP WHERE id=?").run(cartId);
  return getCart(cartId);
}

export function createOrder(input: { cartId: string; customerName?: string; phone?: string; address?: string; fulfillment: "delivery" | "pickup"; paymentMethod: "cod" | "online" }) {
  const cart = getCart(input.cartId); if (!cart.items.length) throw new Error("CART_EMPTY");
  const deliveryPaise = input.fulfillment === "delivery" && cart.subtotalPaise < 50000 ? 4000 : 0;
  const orderId = `MM-${Date.now().toString(36).toUpperCase()}`;
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const line of cart.items) {
      const changed = db.prepare("UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock>=?").run(line.quantity, line.productId, line.quantity);
      if (!changed.changes) throw new Error(`OUT_OF_STOCK:${line.name}`);
    }
    db.prepare("INSERT INTO orders(id,cart_id,customer_name,phone,address,fulfillment,payment_method,payment_status,subtotal_paise,delivery_paise,total_paise) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(orderId, input.cartId, input.customerName || "Guest", input.phone || "", input.address || "", input.fulfillment, input.paymentMethod, input.paymentMethod === "cod" ? "cod_pending" : "payment_link_pending", cart.subtotalPaise, deliveryPaise, cart.subtotalPaise + deliveryPaise);
    const addLine = db.prepare("INSERT INTO order_items(order_id,product_id,name,variant,quantity,price_paise) VALUES(?,?,?,?,?,?)");
    const movement = db.prepare("INSERT INTO inventory_movements(product_id,delta,reason,reference_id) VALUES(?,?,'order',?)");
    for (const line of cart.items) { addLine.run(orderId, line.productId, line.name, line.variant, line.quantity, line.pricePaise); movement.run(line.productId, -line.quantity, orderId); }
    db.prepare("UPDATE carts SET status='ordered',updated_at=CURRENT_TIMESTAMP WHERE id=?").run(input.cartId); db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return getOrder(orderId);
}

export function getOrder(id: string) {
  const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id) as Record<string, unknown> | undefined; if (!order) return null;
  const items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(id);
  return { ...order, items, paymentLink: order.payment_method === "online" ? `https://payments.example.test/pay/${id}` : null };
}

export function listOrders() { return (db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100").all() as Record<string, unknown>[]).map((order) => ({ ...order, items: db.prepare("SELECT * FROM order_items WHERE order_id=?").all(order.id as string) })); }
export function updateOrder(id: string, input: { orderStatus?: string; paymentStatus?: string }) { db.prepare("UPDATE orders SET order_status=COALESCE(?,order_status),payment_status=COALESCE(?,payment_status),updated_at=CURRENT_TIMESTAMP WHERE id=?").run(input.orderStatus || null, input.paymentStatus || null, id); return getOrder(id); }
