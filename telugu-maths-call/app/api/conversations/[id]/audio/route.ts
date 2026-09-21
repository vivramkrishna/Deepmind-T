import { getRecording, isAdmin } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const recording = await getRecording(id);
    return new Response(recording, { headers: { "content-type": "audio/webm", "cache-control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Recording not found" }, { status: 404 });
  }
}
