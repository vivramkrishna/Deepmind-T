import { z } from "zod";
import { createProduct, listProducts } from "@/lib/supabase-shop";
import { isAdmin } from "@/lib/store";

export const runtime = "nodejs";
const productSchema = z.object({ name: z.string().min(2).max(100), brand: z.string().max(60).default(""), category: z.string().min(2).max(60), variant: z.string().min(1).max(60), unit: z.string().min(1).max(30).default("piece"), pricePaise: z.number().int().nonnegative(), stock: z.number().int().nonnegative(), lowStockAt: z.number().int().nonnegative().default(5), aliases: z.string().max(300).default(""), imageUrl: z.string().max(500).default(""), active: z.boolean().default(true) });

export async function GET(request: Request) {
  const url = new URL(request.url); const admin = isAdmin(request);
  try { return Response.json({ products: await listProducts(url.searchParams.get("q") || "", admin && url.searchParams.get("all") === "true") }); }
  catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "Database unavailable" }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ product: await createProduct(productSchema.parse(await request.json())) }, { status: 201 }); }
  catch { return Response.json({ error: "Invalid product" }, { status: 400 }); }
}
