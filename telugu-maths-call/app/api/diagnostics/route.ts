import { z } from "zod";

const diagnostic = z.object({ event: z.string().min(1).max(80), data: z.record(z.string(), z.unknown()).default({}), at: z.string().max(40), page: z.string().max(80) });

export async function POST(request: Request) {
  try {
    const entry = diagnostic.parse(await request.json());
    console.info("[client-diagnostic]", JSON.stringify(entry));
    return Response.json({ ok: true });
  } catch (cause) {
    console.warn("[client-diagnostic] invalid payload", cause);
    return Response.json({ error: "Invalid diagnostic" }, { status: 400 });
  }
}
