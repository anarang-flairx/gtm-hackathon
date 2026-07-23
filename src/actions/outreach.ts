"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { appendOutreachEvent } from "@/lib/local-db";
import { getCustomer } from "@/lib/data";

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "outbound@example.com";
  if (!key) return { ok: false as const, provider: "demo" as const };

  const { Resend } = await import("resend");
  const resend = new Resend(key);
  const result = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return {
    ok: true as const,
    provider: "resend" as const,
    id: result.data?.id,
  };
}

async function sendViaTwilio(opts: { to: string; body: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false as const, provider: "demo" as const };
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(sid, token);
  const msg = await client.messages.create({
    from,
    to: opts.to,
    body: opts.body,
  });
  return { ok: true as const, provider: "twilio" as const, id: msg.sid };
}

export async function sendEmailAction(formData: FormData) {
  const customerId = String(formData.get("customerId") || "");
  const to = String(formData.get("to") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!customerId || !to || !subject || !body) {
    return { ok: false, error: "Missing required email fields" };
  }

  const customer = await getCustomer(customerId);
  if (!customer) return { ok: false, error: "Customer not found" };

  const token = randomUUID().replace(/-/g, "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const trackUrl = `${appUrl}/api/track/click?token=${token}`;
  const openPixel = `${appUrl}/api/track/open?token=${token}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5">
      <p>${body.replace(/\n/g, "<br/>")}</p>
      <p><a href="${trackUrl}">View more details</a></p>
      <img src="${openPixel}" width="1" height="1" alt="" />
    </div>
  `;

  let provider: "resend" | "demo" = "demo";
  let providerId: string | undefined;
  try {
    const sent = await sendViaResend({ to, subject, html });
    provider = sent.provider;
    if (sent.ok) providerId = sent.id;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }

  await appendOutreachEvent(
    {
      customer_id: customerId,
      channel: "email",
      direction: "outbound",
      status: provider === "resend" ? "sent" : "sent_demo",
      subject,
      body,
      to_address: to,
      provider,
      metadata: { providerId, trackToken: token },
    },
    { token },
  );

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/stats");
  return { ok: true, provider };
}

export async function logCallAction(formData: FormData) {
  const customerId = String(formData.get("customerId") || "");
  const outcome = String(formData.get("outcome") || "connected").trim();
  const notes = String(formData.get("notes") || "").trim();
  const to = String(formData.get("to") || "").trim();

  if (!customerId) return { ok: false, error: "Missing customer" };

  await appendOutreachEvent({
    customer_id: customerId,
    channel: "phone",
    direction: "outbound",
    status: outcome,
    subject: null,
    body: notes || null,
    to_address: to || null,
    provider: "tel",
    metadata: { outcome },
  });

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/stats");
  return { ok: true, provider: "tel" as const };
}

export async function sendSmsAction(formData: FormData) {
  const customerId = String(formData.get("customerId") || "");
  const to = String(formData.get("to") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!customerId || !to || !body) {
    return { ok: false, error: "Missing required SMS fields" };
  }

  let provider: "twilio" | "demo" = "demo";
  let providerId: string | undefined;
  try {
    const sent = await sendViaTwilio({ to, body });
    provider = sent.provider;
    if (sent.ok) providerId = sent.id;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMS send failed",
    };
  }

  await appendOutreachEvent({
    customer_id: customerId,
    channel: "sms",
    direction: "outbound",
    status: provider === "twilio" ? "sent" : "sent_demo",
    subject: null,
    body,
    to_address: to,
    provider,
    metadata: { providerId },
  });

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/stats");
  return { ok: true, provider };
}
