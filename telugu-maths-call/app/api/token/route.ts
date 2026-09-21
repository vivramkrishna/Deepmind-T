import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import { getModelConfig, publicModelConfig } from "@/lib/model-config";

export async function POST() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "false") {
      return Response.json({ error: "LiveKit is not configured." }, { status: 503 });
    }
    return Response.json({ demo: true });
  }

  const callId = crypto.randomUUID();
  const identity = `guest-${callId}`;
  const room = `mana-mart-${crypto.randomUUID()}`;
  const modelConfig = publicModelConfig(await getModelConfig());
  const token = new AccessToken(apiKey, apiSecret, { identity, ttl: "45m", metadata: JSON.stringify({ language: "te-IN", callId }) });
  token.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
  token.roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: "mana-mart-assistant",
        metadata: JSON.stringify({ language: "te-IN", identity, callId, modelOrder: modelConfig.order }),
      }),
    ],
  });
  console.info("[call] token_created", { callId, room });
  return Response.json({ token: await token.toJwt(), url, room, identity, callId, model: modelConfig.primary });
}
