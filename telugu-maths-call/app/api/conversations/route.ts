import { addConversation, isAdmin, listConversations, type Turn } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ conversations: await listConversations() });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("audio");
    if (file instanceof File && file.size > 25 * 1024 * 1024) return Response.json({ error: "Recording is too large" }, { status: 413 });
    const transcriptRaw = String(form.get("transcript") || "[]");
    let transcript: Turn[] = [];
    try { transcript = JSON.parse(transcriptRaw) as Turn[]; } catch { /* keep empty */ }
    const audio = file instanceof File ? Buffer.from(await file.arrayBuffer()) : undefined;
    const item = await addConversation({
      callId: String(form.get("callId") || "") || undefined,
      durationSeconds: Number(form.get("durationSeconds") || 0),
      language: String(form.get("language") || "te-IN"),
      status: "completed",
      transcript,
    }, audio);
    return Response.json({ conversation: item }, { status: 201 });
  }

  if (request.headers.get("x-webhook-secret") !== process.env.APP_WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const item = await addConversation({
    callId: typeof body.callId === "string" ? body.callId : undefined,
    durationSeconds: Number(body.durationSeconds || 0),
    language: body.language || "te-IN",
    status: body.status === "failed" ? "failed" : "completed",
    transcript: Array.isArray(body.transcript) ? body.transcript : [],
  });
  return Response.json({ conversation: item }, { status: 201 });
}
