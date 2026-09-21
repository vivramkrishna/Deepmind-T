import { z } from "zod";
import { getModelConfig, MODEL_CATALOG, publicModelConfig, saveModelConfig } from "@/lib/model-config";
import { isAdmin } from "@/lib/store";

export const runtime = "nodejs";
const modelIds = MODEL_CATALOG.map((model) => model.id) as [string, ...string[]];
const bodySchema = z.object({ order: z.array(z.enum(modelIds)).min(1) });

function authorized(request: Request) {
  return isAdmin(request) || request.headers.get("x-webhook-secret") === process.env.APP_WEBHOOK_SECRET;
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(publicModelConfig(await getModelConfig()));
}

export async function PUT(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { order } = bodySchema.parse(await request.json());
    return Response.json(publicModelConfig(await saveModelConfig(order as never)));
  } catch {
    return Response.json({ error: "Invalid model order" }, { status: 400 });
  }
}
