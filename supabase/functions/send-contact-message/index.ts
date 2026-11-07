const churchEmail = "restchurh37@gmail.com";
const allowedHeaders = "authorization, x-client-info, apikey, content-type";
const allowedMethods = "POST, OPTIONS";
const submissionLimit = 5;

function permittedOrigin(origin: string | null): string | null {
  if (!origin) return "*";

  const configuredOrigin = Deno.env.get("SITE_URL");
  if (configuredOrigin) {
    try {
      if (new URL(configuredOrigin).origin === origin) return origin;
    } catch (error) {
      console.error("The configured contact-form site URL is invalid.", error);
    }
  }

  try {
    const url = new URL(origin);
    if (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    ) return origin;
  } catch {
    return null;
  }

  return null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": allowedHeaders,
      "Access-Control-Allow-Methods": allowedMethods,
      "Vary": "Origin",
    },
  });
}

async function hashClientAddress(
  address: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(address),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get("Origin");
  const allowedOrigin = permittedOrigin(origin);
  if (!allowedOrigin) {
    return Response.json({ error: "This website is not allowed to send contact messages." }, { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Headers": allowedHeaders,
        "Access-Control-Allow-Methods": allowedMethods,
        "Vary": "Origin",
      },
    });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST to send a contact message." }, 405, allowedOrigin);
  }

  const expectedPublicKey = Deno.env.get("REST_CHURCH_PUBLIC_API_KEY");
  if (!expectedPublicKey || request.headers.get("apikey") !== expectedPublicKey) {
    return jsonResponse({ error: "The message service is not configured for this website." }, 401, allowedOrigin);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "The message request must contain valid JSON." }, 400, allowedOrigin);
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return jsonResponse({ error: "The message details are invalid." }, 400, allowedOrigin);
  }

  const fields = payload as Record<string, unknown>;
  const senderName = typeof fields.sender_name === "string" ? fields.sender_name.trim() : "";
  const email = typeof fields.email === "string" ? fields.email.trim() : "";
  const subject = typeof fields.subject === "string" ? fields.subject.trim() : "";
  const message = typeof fields.message === "string" ? fields.message.trim() : "";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    senderName.length < 1 ||
    senderName.length > 100 ||
    email.length > 254 ||
    !emailPattern.test(email) ||
    subject.length > 160 ||
    [...message].length < 1 ||
    [...message].length > 4000
  ) {
    return jsonResponse({ error: "Please provide a valid name, email, and message." }, 400, allowedOrigin);
  }

  const databaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!databaseUrl || !serviceKey) {
    console.error("The contact-message database service is not configured.");
    return jsonResponse({ error: "The message service is temporarily unavailable." }, 503, allowedOrigin);
  }

  const clientAddress = request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim();
  if (!clientAddress) {
    console.error("The contact-message request did not include a client IP address.");
    return jsonResponse({ error: "The message service could not verify this request." }, 503, allowedOrigin);
  }

  try {
    const ipHash = await hashClientAddress(
      clientAddress,
      Deno.env.get("CONTACT_RATE_LIMIT_SALT") || serviceKey,
    );
    const restHeaders = {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const rateLimitResponse = await fetch(
      `${databaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/consume_contact_delivery_limit`,
      {
        method: "POST",
        headers: restHeaders,
        body: JSON.stringify({ p_ip_hash: ipHash, p_limit: submissionLimit }),
      },
    );
    if (!rateLimitResponse.ok) {
      console.error("The contact-message IP rate limit could not be checked.", rateLimitResponse.status);
      return jsonResponse({ error: "The message service is temporarily unavailable." }, 503, allowedOrigin);
    }
    if (await rateLimitResponse.json() !== true) {
      return jsonResponse({ error: "The message limit has been reached. Please call or email the church instead." }, 429, allowedOrigin);
    }

    const saveResponse = await fetch(
      `${databaseUrl.replace(/\/+$/, "")}/rest/v1/contact_messages`,
      {
        method: "POST",
        headers: { ...restHeaders, "Prefer": "return=minimal" },
        body: JSON.stringify({
          sender_name: senderName,
          email,
          subject: subject || null,
          message,
          status: "new",
        }),
      },
    );
    if (!saveResponse.ok) {
      const databaseError = await saveResponse.json().catch(() => null);
      if (databaseError?.code === "P0001") {
        return jsonResponse({ error: "The message limit for this email address has been reached. Please call or email the church instead." }, 429, allowedOrigin);
      }
      console.error("The contact message could not be saved.", saveResponse.status);
      return jsonResponse({ error: "Your message could not be saved. Please try again or contact the church directly." }, 503, allowedOrigin);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const senderAddress = Deno.env.get("REST_CHURCH_FROM_EMAIL");
    if (!resendKey || !senderAddress) {
      console.error("Contact message saved, but email delivery is not configured.");
      return jsonResponse({
        saved: true,
        email_sent: false,
        message: "Your message was saved, but email delivery is not configured yet.",
      }, 202, allowedOrigin);
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderAddress,
        to: [churchEmail],
        reply_to: email,
        subject: `Website message${subject ? `: ${subject.replace(/[\r\n]/g, " ")}` : ""}`,
        text: `A new message was sent through the Rest Church Ministries website.\n\nName: ${senderName}\nEmail: ${email}\nSubject: ${subject || "(not provided)"}\n\nMessage:\n${message}`,
      }),
    });
    if (!emailResponse.ok) {
      console.error("The contact message was saved, but the email provider returned an error.", emailResponse.status);
      return jsonResponse({
        saved: true,
        email_sent: false,
        message: "Your message was saved, but the email notification could not be sent. Please email or call the church directly.",
      }, 202, allowedOrigin);
    }

    return jsonResponse({ saved: true, email_sent: true }, 200, allowedOrigin);
  } catch (error) {
    console.error("Contact-message processing failed.", error);
    return jsonResponse({ error: "The message service is temporarily unavailable. Please contact the church directly." }, 503, allowedOrigin);
  }
});
