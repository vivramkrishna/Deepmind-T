"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, Check, Clock3, Gauge, Headphones, LockKeyhole, MessageSquareText, Package, PhoneCall, Plus, Save, Search, ShoppingBag, Trash2, UsersRound, X } from "lucide-react";
import type { Conversation } from "@/lib/store";

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [modelConfig, setModelConfig] = useState<{ order: string[]; models: { id: string; name: string; note: string; available: boolean }[]; updatedAt: string } | null>(null);
  const [savingModels, setSavingModels] = useState(false);
  const [modelNotice, setModelNotice] = useState("");
  const [calling, setCalling] = useState(false);
  const [callNotice, setCallNotice] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const emptyProduct = { name: "", brand: "", category: "Groceries", variant: "", unit: "piece", priceRupees: "", stock: "", lowStockAt: "5", aliases: "", imageUrl: "", active: true };
  const [productForm, setProductForm] = useState<any>(emptyProduct);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    const headers = { Authorization: `Bearer ${password}` };
    const [response, modelResponse, productResponse, orderResponse] = await Promise.all([fetch("/api/conversations", { headers }), fetch("/api/admin/model-config", { headers }), fetch("/api/shop/products?all=true", { headers }), fetch("/api/shop/orders", { headers })]);
    if (!response.ok) { setError("Incorrect admin password"); return; }
    const data = await response.json();
    setItems(data.conversations); setSelected(data.conversations[0] || null); setAuthed(true); setError("");
    if (modelResponse.ok) setModelConfig(await modelResponse.json());
    if (productResponse.ok) setProducts((await productResponse.json()).products);
    if (orderResponse.ok) setOrders((await orderResponse.json()).orders);
  }

  function moveModel(index: number, direction: -1 | 1) {
    if (!modelConfig) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= modelConfig.order.length) return;
    const order = [...modelConfig.order]; [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    setModelConfig({ ...modelConfig, order }); setModelNotice("");
  }

  async function saveModels() {
    if (!modelConfig) return; setSavingModels(true); setModelNotice("");
    const response = await fetch("/api/admin/model-config", { method: "PUT", headers: { Authorization: `Bearer ${password}`, "content-type": "application/json" }, body: JSON.stringify({ order: modelConfig.order }) });
    if (!response.ok) setModelNotice("Could not save model order");
    else { setModelConfig(await response.json()); setModelNotice("Saved — new calls use this order immediately"); }
    setSavingModels(false);
  }

  async function callMe() {
    setCalling(true); setCallNotice("");
    const response = await fetch("/api/twilio/call-me", {
      method: "POST",
      headers: { Authorization: `Bearer ${password}` },
    });
    const result = await response.json();
    setCallNotice(response.ok ? `Calling ${result.destination} now…` : result.error || "Unable to start call");
    setCalling(false);
  }

  async function saveProduct(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const payload = { ...productForm, pricePaise: Math.round(Number(productForm.priceRupees) * 100), stock: Number(productForm.stock), lowStockAt: Number(productForm.lowStockAt), active: Boolean(productForm.active) };
    delete payload.priceRupees;
    const url = editingProduct ? `/api/shop/products/${editingProduct}` : "/api/shop/products";
    const response = await fetch(url, { method: editingProduct ? "PATCH" : "POST", headers: { Authorization: `Bearer ${password}`, "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { setError("Could not save product. Check all fields."); return; }
    const saved = (await response.json()).product;
    setProducts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]); setProductForm(emptyProduct); setEditingProduct(null);
  }

  function editProduct(product: any) { setEditingProduct(product.id); setProductForm({ ...product, priceRupees: (product.pricePaise / 100).toFixed(2), stock: String(product.stock), lowStockAt: String(product.lowStockAt) }); }
  async function archive(product: any) { const response = await fetch(`/api/shop/products/${product.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${password}` } }); if (response.ok) { const saved = (await response.json()).product; setProducts((current) => current.map((item) => item.id === saved.id ? saved : item)); } }
  async function changeOrder(id: string, field: "orderStatus" | "paymentStatus", value: string) { const response = await fetch(`/api/shop/orders/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${password}`, "content-type": "application/json" }, body: JSON.stringify({ [field]: value }) }); if (response.ok) { const saved = (await response.json()).order; setOrders((current) => current.map((order) => order.id === id ? saved : order)); } }

  const filtered = useMemo(() => items.filter((item) => item.transcript.some((turn) => turn.text.toLowerCase().includes(query.toLowerCase()))), [items, query]);
  const minutes = Math.round(items.reduce((sum, item) => sum + item.durationSeconds, 0) / 60);

  useEffect(() => {
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
  }, [selected?.id]);

  async function loadRecording() {
    if (!selected?.recordingUrl) return;
    const response = await fetch(selected.recordingUrl, { headers: { Authorization: `Bearer ${password}` } });
    if (!response.ok) { setError("Unable to load this recording"); return; }
    setAudioUrl(URL.createObjectURL(await response.blob()));
  }

  if (!authed) return (
    <main className="admin-login"><form onSubmit={login} className="login-card"><div className="login-icon"><LockKeyhole /></div><p className="eyebrow">ADMIN ACCESS</p><h1>Shop owner console</h1><p>Enter the admin password configured for this app.</p><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus /></label>{error && <div className="error-box">{error}</div>}<button className="admin-button">Open dashboard</button><a href="/" className="text-link">Return to customer app</a></form></main>
  );

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar"><div className="admin-brand"><span>మ</span><div><strong>Mana Mart</strong><small>Shop console</small></div></div><nav><a className="active"><Package /> Inventory</a><a><ShoppingBag /> Orders</a><a><MessageSquareText /> Conversations</a><a><BarChart3 /> Usage</a></nav><div className="sidebar-footer">Telugu · Hindi · English<br/><span>Local database mode</span></div></aside>
      <section className="admin-main">
        <header><div><p className="eyebrow">SHOP OPERATIONS</p><h1>Mana Mart</h1></div><div className="header-actions"><button className="call-me-button" onClick={callMe} disabled={calling}><PhoneCall />{calling ? "Calling…" : "Call me"}</button><div className="live-pill"><i /> Live inventory</div></div></header>
        {callNotice && <div className="call-notice">{callNotice}</div>}
        <div className="metric-grid"><article><Package /><span>Active products</span><strong>{products.filter(p => p.active).length}</strong></article><article><ShoppingBag /><span>Orders</span><strong>{orders.length}</strong></article><article><Clock3 /><span>Voice time</span><strong>{minutes}m</strong></article></div>
        {modelConfig && <section className="model-console"><div className="model-console-head"><div><p className="eyebrow">LOW-LATENCY ROUTING</p><h2><Gauge /> AI model priority</h2><span>The first available model answers. If it fails or hits quota, the next model takes over.</span></div><button onClick={saveModels} disabled={savingModels}><Save />{savingModels ? "Saving…" : "Save order"}</button></div><div className="model-order">{modelConfig.order.map((id, index) => { const model = modelConfig.models.find((item) => item.id === id); if (!model) return null; return <article className={index === 0 ? "primary-model" : ""} key={id}><b>{index + 1}</b><div><strong>{model.name}</strong><span>{model.note}</span></div><em className={model.available ? "ready" : "missing"}>{model.available ? <><Check /> Key ready</> : "Key missing"}</em><div className="order-buttons"><button aria-label={`Move ${model.name} up`} disabled={index === 0} onClick={() => moveModel(index, -1)}><ArrowUp /></button><button aria-label={`Move ${model.name} down`} disabled={index === modelConfig.order.length - 1} onClick={() => moveModel(index, 1)}><ArrowDown /></button></div></article>; })}</div>{modelNotice && <p className="model-notice">{modelNotice}</p>}</section>}
        <section className="inventory-console"><div className="inventory-head"><div><p className="eyebrow">LIVE CATALOG</p><h2>Products & stock</h2><span>Price and stock changes are available to voice search immediately.</span></div><button onClick={() => { setInventoryOpen(!inventoryOpen); setEditingProduct(null); setProductForm(emptyProduct); }}><Plus /> {inventoryOpen ? "Hide form" : "Add product"}</button></div>{inventoryOpen && <form className="product-form" onSubmit={saveProduct}><label>Product name<input required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })}/></label><label>Brand<input value={productForm.brand} onChange={e => setProductForm({ ...productForm, brand: e.target.value })}/></label><label>Category<input required value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}/></label><label>Variant / size<input required placeholder="100 g" value={productForm.variant} onChange={e => setProductForm({ ...productForm, variant: e.target.value })}/></label><label>Price ₹<input required type="number" min="0" step="0.01" value={productForm.priceRupees} onChange={e => setProductForm({ ...productForm, priceRupees: e.target.value })}/></label><label>Stock<input required type="number" min="0" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })}/></label><label>Low-stock alert<input type="number" min="0" value={productForm.lowStockAt} onChange={e => setProductForm({ ...productForm, lowStockAt: e.target.value })}/></label><label className="wide-field">Search aliases<input placeholder="coldgate, కోల్గేట్, कोलगेट" value={productForm.aliases} onChange={e => setProductForm({ ...productForm, aliases: e.target.value })}/></label><label className="wide-field">Image URL<input value={productForm.imageUrl} onChange={e => setProductForm({ ...productForm, imageUrl: e.target.value })}/></label><div className="form-actions"><button className="save-product"><Save />{editingProduct ? "Update product" : "Create product"}</button>{editingProduct && <button type="button" className="cancel-edit" onClick={() => { setEditingProduct(null); setProductForm(emptyProduct); }}><X /> Cancel</button>}</div></form>}{error && <div className="error-box">{error}</div>}<div className="product-table"><div className="product-row product-columns"><span>Product</span><span>Variant</span><span>Price</span><span>Stock</span><span>Status</span><span>Actions</span></div>{products.map(product => <div className={`product-row ${!product.active ? "archived" : product.stock <= product.lowStockAt ? "low-stock" : ""}`} key={product.id}><span><strong>{product.name}</strong><small>{product.brand} · {product.category}</small></span><span>{product.variant}</span><span>₹{(product.pricePaise / 100).toFixed(2)}</span><span>{product.stock}</span><span><i>{!product.active ? "Archived" : product.stock === 0 ? "Out of stock" : product.stock <= product.lowStockAt ? "Low stock" : "In stock"}</i></span><span><button onClick={() => editProduct(product)}>Edit</button>{product.active && <button className="archive-button" onClick={() => archive(product)}><Trash2 /> Archive</button>}</span></div>)}</div></section>
        <section className="orders-console"><div className="inventory-head"><div><p className="eyebrow">ORDERS</p><h2>Recent orders</h2></div></div>{orders.length ? <div className="order-cards">{orders.map(order => <article key={order.id}><strong>{order.id}</strong><span>{order.items.length} items · ₹{(order.total_paise / 100).toFixed(2)}</span><em>{order.fulfillment}</em><label>Order<select value={order.order_status} onChange={e => changeOrder(order.id, "orderStatus", e.target.value)}><option value="confirmed">Confirmed</option><option value="packing">Packing</option><option value="ready">Ready</option><option value="out_for_delivery">Out for delivery</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label><label>Payment<select value={order.payment_status} onChange={e => changeOrder(order.id, "paymentStatus", e.target.value)}><option value="cod_pending">COD pending</option><option value="payment_link_pending">Link pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></label></article>)}</div> : <div className="empty-orders">Orders created by voice checkout will appear here.</div>}</section>
        <div className="admin-workspace">
          <section className="conversation-list"><div className="search-box"><Search size={18}/><input placeholder="Search conversations" value={query} onChange={(e) => setQuery(e.target.value)} /></div>{filtered.map((item) => <button key={item.id} className={selected?.id === item.id ? "selected" : ""} onClick={() => setSelected(item)}><div><strong>{item.transcript[0]?.text || "Untitled call"}</strong><time>{new Date(item.createdAt).toLocaleString()}</time></div><span>{Math.floor(item.durationSeconds / 60)}:{String(item.durationSeconds % 60).padStart(2, "0")}</span></button>)}</section>
          <section className="conversation-detail">{selected ? <><div className="detail-header"><div><span className="status-badge">Completed</span><h2>{selected.transcript[0]?.text || "Conversation"}</h2><p>{new Date(selected.createdAt).toLocaleString()} · {selected.language}</p></div></div>{selected.recordingUrl && <div className="audio-placeholder"><Headphones/><div><strong>Call recording</strong>{audioUrl ? <audio src={audioUrl} controls /> : <button className="recording-button" onClick={loadRecording}>Load protected audio</button>}</div></div>}<div className="transcript"><h3>Transcript</h3>{selected.transcript.map((turn, index) => <div className={`turn ${turn.speaker}`} key={index}><span>{turn.speaker === "user" ? "Customer" : "Mana"}</span><p>{turn.text}</p></div>)}</div></> : <div className="empty-detail">Select a conversation</div>}</section>
        </div>
      </section>
    </main>
  );
}
