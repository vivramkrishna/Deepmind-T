import { z } from "zod";
import { updateOrder } from "@/lib/supabase-shop";
import { isAdmin } from "@/lib/store";
const schema = z.object({ orderStatus: z.enum(["confirmed", "packing", "ready", "out_for_delivery", "delivered", "cancelled"]).optional(), paymentStatus: z.enum(["pending", "cod_pending", "payment_link_pending", "paid", "failed", "refunded"]).optional() });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 }); try { const { id } = await context.params; const order = await updateOrder(id, schema.parse(await request.json())); return order ? Response.json({ order }) : Response.json({ error: "Not found" }, { status: 404 }); } catch { return Response.json({ error: "Invalid update" }, { status: 400 }); } }
