import { ConnectTwilioCallRequest_TwilioCallDirection, RoomAgentDispatch } from "@livekit/protocol";
import { LiveKitAPI } from "livekit-server-sdk";
import twilio from "twilio";
import { getModelConfig, publicModelConfig } from "@/lib/model-config";
import { readVerifiedTwilioForm, twimlResponse } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await readVerifiedTwilioForm(request, process.env.TWILIO_VOICE_WEBHOOK_URL);
    const callSid = form.CallSid;
    const from = form.From || "unknown";
    const to = form.To || process.env.TWILIO_PHONE_NUMBER || "unknown";

    if (!callSid || !/^CA[0-9a-f]{32}$/i.test(callSid)) {
      return twimlResponse("<Response><Reject reason=\"rejected\" /></Response>", 400);
    }

    const host = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const secret = process.env.LIVEKIT_API_SECRET;
    if (!host || !apiKey || !secret) {
      throw new Error("LiveKit is not configured.");
    }

    const callId = crypto.randomUUID();
    const roomName = `mana-mart-phone-${callSid}`;
    const modelConfig = publicModelConfig(await getModelConfig());
    const metadata = JSON.stringify({
      language: "te-IN",
      callId,
      modelOrder: modelConfig.order,
      provider: "twilio",
      twilioCallSid: callSid,
      from,
      to,
    });

    const livekit = new LiveKitAPI({ host, apiKey, secret });
    const connector = await livekit.connector.connectTwilioCall({
      twilioCallDirection: ConnectTwilioCallRequest_TwilioCallDirection.INBOUND,
      roomName,
      participantIdentity: `twilio-${callSid}`,
      participantName: from,
      participantMetadata: metadata,
      participantAttributes: {
        "phone.number": from,
        "phone.provider": "twilio",
        "twilio.callSid": callSid,
      },
      agents: [
        new RoomAgentDispatch({
          agentName: "mana-mart-assistant",
          metadata,
        }),
      ],
    });

    const response = new twilio.twiml.VoiceResponse();
    response.connect().stream({ url: connector.connectUrl });
    console.info("[twilio] inbound_call_connected", { callSid, callId, roomName, from, to });
    return twimlResponse(response.toString());
  } catch (cause) {
    console.error("[twilio] inbound_call_failed", cause);
    const response = new twilio.twiml.VoiceResponse();
    response.say("Sorry, Mana Mart is temporarily unavailable. Please call again shortly.");
    return twimlResponse(response.toString(), 503);
  }
}
