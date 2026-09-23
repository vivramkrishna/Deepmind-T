import { ConnectTwilioCallRequest_TwilioCallDirection, RoomAgentDispatch } from "@livekit/protocol";
import { LiveKitAPI } from "livekit-server-sdk";
import twilio from "twilio";
import { getModelConfig, publicModelConfig } from "@/lib/model-config";
import { isAdmin } from "@/lib/store";

export const runtime = "nodejs";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accountSid = required("TWILIO_ACCOUNT_SID");
    const authToken = required("TWILIO_AUTH_TOKEN");
    const fromNumber = required("TWILIO_PHONE_NUMBER");
    const destination = required("TWILIO_CALL_ME_NUMBER");
    const livekitHost = process.env.LIVEKIT_URL || required("NEXT_PUBLIC_LIVEKIT_URL");
    const livekitApiKey = required("LIVEKIT_API_KEY");
    const livekitApiSecret = required("LIVEKIT_API_SECRET");
    const statusCallback = process.env.TWILIO_STATUS_WEBHOOK_URL;

    if (!/^\+91\d{10}$/.test(destination)) {
      throw new Error("TWILIO_CALL_ME_NUMBER must be one Indian number in E.164 format.");
    }

    const callId = crypto.randomUUID();
    const roomName = `mana-mart-callback-${callId}`;
    const modelConfig = publicModelConfig(await getModelConfig());
    const metadata = JSON.stringify({
      language: "te-IN",
      callId,
      modelOrder: modelConfig.order,
      provider: "twilio",
      direction: "outbound",
      to: destination,
    });

    const livekit = new LiveKitAPI({
      host: livekitHost,
      apiKey: livekitApiKey,
      secret: livekitApiSecret,
    });
    const connector = await livekit.connector.connectTwilioCall({
      twilioCallDirection: ConnectTwilioCallRequest_TwilioCallDirection.OUTBOUND,
      destinationCountry: "IN",
      roomName,
      participantIdentity: `twilio-callback-${callId}`,
      participantName: "Mana Mart callback",
      participantMetadata: metadata,
      participantAttributes: {
        "phone.number": destination,
        "phone.provider": "twilio",
        "phone.direction": "outbound",
      },
      agents: [
        new RoomAgentDispatch({
          agentName: "mana-mart-assistant",
          metadata,
        }),
      ],
    });

    const client = twilio(accountSid, authToken);
    const call = await client.calls.create({
      to: destination,
      from: fromNumber,
      url: connector.connectUrl.replace(/^wss:/, "https:"),
      method: "POST",
      ...(statusCallback
        ? {
            statusCallback,
            statusCallbackMethod: "POST",
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          }
        : {}),
    });

    console.info("[twilio] callback_started", {
      callSid: call.sid,
      callId,
      roomName,
      status: call.status,
    });
    return Response.json({
      ok: true,
      callSid: call.sid,
      status: call.status,
      destination: `+91 ******${destination.slice(-4)}`,
    });
  } catch (cause) {
    console.error("[twilio] callback_failed", cause);
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Unable to start the call." },
      { status: 502 },
    );
  }
}

