import twilio from "twilio";

export type TwilioForm = Record<string, string>;

export function twimlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function readVerifiedTwilioForm(
  request: Request,
  configuredUrl?: string,
): Promise<TwilioForm> {
  const form = await request.formData();
  const params = Object.fromEntries(
    Array.from(form.entries(), ([key, value]) => [key, String(value)]),
  );

  if (process.env.TWILIO_VALIDATE_SIGNATURES === "false") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Twilio signature validation cannot be disabled in production.");
    }
    return params;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  const publicUrl = configuredUrl || request.url;

  if (!authToken || !signature) {
    throw new Error("Twilio webhook authentication is not configured.");
  }

  if (!twilio.validateRequest(authToken, signature, publicUrl, params)) {
    throw new Error("Invalid Twilio webhook signature.");
  }

  return params;
}
