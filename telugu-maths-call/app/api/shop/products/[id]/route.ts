import { z } from "zod";
import { archiveProduct, updateProduct } from "@/lib/supabase-shop";
import { isAdmin } from "@/lib/store";

export const runtime = "nodejs";
const patchSchema = z.object({ name: z.string().min(2).max(100).optional(), brand: z.string().max(60).optional(), category: z.string().min(2).max(60).optional(), variant: z.string().min(1).max(60).optional(), unit: z.string().min(1).max(30).optional(), pricePaise: z.number().int().nonnegative().optional(), stock: z.number().int().nonnegative().optional(), lowStockAt: z.number().int().nonnegative().optional(), aliases: z.string().max(300).optional(), imageUrl: z.string().max(500).optional(), active: z.boolean().optional() });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { const { id } = await context.params; const product = await updateProduct(Number(id), patchSchema.parse(await request.json())); return product ? Response.json({ product }) : Response.json({ error: "Not found" }, { status: 404 }); }
  catch { return Response.json({ error: "Invalid update" }, { status: 400 }); }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params; const product = await archiveProduct(Number(id)); return product ? Response.json({ product }) : Response.json({ error: "Not found" }, { status: 404 });
}
