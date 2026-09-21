import { z } from "zod";
import { createOrder, listOrders } from "@/lib/supabase-shop";
import { isAdmin } from "@/lib/store";
const schema = z.object({ cartId: z.string().min(8).max(100), customerName: z.string().max(80).optional(), phone: z.string().max(20).optional(), address: z.string().max(300).optional(), fulfillment: z.enum(["delivery", "pickup"]), paymentMethod: z.enum(["cod", "online"]) });
export async function GET(request: Request) { if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 }); try { return Response.json({ orders: await listOrders() }); } catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "Orders unavailable" }, { status: 503 }); } }
export async function POST(request: Request) { try { return Response.json({ order: await createOrder(schema.parse(await request.json())) }, { status: 201 }); } catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "Order failed" }, { status: 400 }); } }
