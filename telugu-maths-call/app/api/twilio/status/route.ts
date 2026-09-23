import { readVerifiedTwilioForm } from "@/lib/twilio";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await readVerifiedTwilioForm(request, process.env.TWILIO_STATUS_WEBHOOK_URL);
    console.info("[twilio] call_status", {
      callSid: form.CallSid,
      status: form.CallStatus,
      duration: form.CallDuration,
      from: form.From,
      to: form.To,
    });
    return Response.json({ ok: true });
  } catch (cause) {
    console.warn("[twilio] invalid_status_callback", cause);
    return Response.json({ error: "Invalid Twilio request." }, { status: 403 });
  }
}
