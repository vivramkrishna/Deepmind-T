import { z } from "zod";
import { getCart, setCartItem } from "@/lib/supabase-shop";
const schema = z.object({ cartId: z.string().min(8).max(100), productId: z.number().int().positive(), quantity: z.number().int().min(0).max(99) });
export async function GET(request: Request) { const id = new URL(request.url).searchParams.get("cartId"); if (!id) return Response.json({ error: "cartId required" }, { status: 400 }); try { return Response.json({ cart: await getCart(id) }); } catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "Cart unavailable" }, { status: 503 }); } }
export async function POST(request: Request) { try { const body = schema.parse(await request.json()); return Response.json({ cart: await setCartItem(body.cartId, body.productId, body.quantity) }); } catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "Cart update failed" }, { status: 400 }); } }
