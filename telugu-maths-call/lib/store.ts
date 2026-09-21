import { promises as fs } from "node:fs";
import path from "node:path";

export type Turn = { speaker: "user" | "assistant"; text: string; at?: string };
export type Conversation = {
  id: string;
  callId?: string;
  createdAt: string;
  durationSeconds: number;
  language: string;
  status: "completed" | "failed";
  transcript: Turn[];
  recordingUrl?: string;
};

const DATA_FILE = path.join(process.cwd(), "data", "conversations.json");
const RECORDINGS_DIR = path.join(process.cwd(), "data", "recordings");

const demoData: Conversation[] = [
  {
    id: "demo-1024",
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    durationSeconds: 164,
    language: "te-IN",
    status: "completed",
    transcript: [
      { speaker: "user", text: "x ప్లస్ 5 సమానం 12 అయితే x విలువ ఎంత?" },
      { speaker: "assistant", text: "రెండు వైపుల నుంచి 5 తీసేద్దాం. x సమానం 12 మైనస్ 5. కాబట్టి x విలువ 7." },
    ],
  },
  {
    id: "demo-1023",
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    durationSeconds: 92,
    language: "te-IN",
    status: "completed",
    transcript: [
      { speaker: "user", text: "త్రిభుజం వైశాల్యం ఎలా కనుక్కోవాలి?" },
      { speaker: "assistant", text: "ఆధారం గుణించాలి ఎత్తుతో. వచ్చిన దానిని రెండుతో భాగించాలి." },
    ],
  },
];

async function ensureStore() {
  await fs.mkdir(RECORDINGS_DIR, { recursive: true });
  try { await fs.access(DATA_FILE); }
  catch { await fs.writeFile(DATA_FILE, JSON.stringify(demoData, null, 2)); }
}

export async function listConversations(): Promise<Conversation[]> {
  await ensureStore();
  return JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Conversation[];
}

export async function addConversation(input: Omit<Conversation, "id" | "createdAt">, audio?: Buffer) {
  const conversations = await listConversations();
  const existingIndex = input.callId ? conversations.findIndex((item) => item.callId === input.callId) : -1;
  const existing = existingIndex >= 0 ? conversations[existingIndex] : undefined;
  const id = existing?.id || crypto.randomUUID();
  let recordingUrl: string | undefined;
  if (audio?.length) {
    await fs.writeFile(path.join(RECORDINGS_DIR, `${id}.webm`), audio);
    recordingUrl = `/api/conversations/${id}/audio`;
  }
  const item: Conversation = { ...existing, ...input, id, createdAt: existing?.createdAt || new Date().toISOString(), durationSeconds: Math.max(existing?.durationSeconds || 0, input.durationSeconds), transcript: input.transcript.length >= (existing?.transcript.length || 0) ? input.transcript : existing!.transcript, recordingUrl: recordingUrl || existing?.recordingUrl };
  if (existingIndex >= 0) conversations.splice(existingIndex, 1);
  conversations.unshift(item);
  await fs.writeFile(DATA_FILE, JSON.stringify(conversations, null, 2));
  return item;
}

export async function getRecording(id: string) {
  const safeId = id.replace(/[^a-zA-Z0-9-]/g, "");
  return fs.readFile(path.join(RECORDINGS_DIR, `${safeId}.webm`));
}

export function isAdmin(request: Request) {
  const expected = process.env.ADMIN_PASSWORD || "change-this-before-sharing";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return supplied === expected;
}
