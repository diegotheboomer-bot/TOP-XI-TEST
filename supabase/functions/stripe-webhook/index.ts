// Stripe calls this when a payment finishes. Marks the order paid and emails the shop.
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

async function emailShop(order: any, session: any) {
  const key = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("NOTIFY_EMAIL");
  if (!key || !to) {
    console.warn("RESEND_API_KEY or NOTIFY_EMAIL missing, order email skipped");
    return;
  }
  const ship = (session.collected_information?.shipping_details ?? session.shipping_details)?.address;
  const rows = (order.items as any[])
    .map((i) => `<li>${esc(i.qty)} x ${esc(i.name)} (${eur(i.price_cents)})</li>`)
    .join("");
  const html = `
    <h2>New paid order</h2>
    <ul>${rows}</ul>
    <p><b>Total:</b> ${eur(order.amount_cents)}</p>
    ${order.note ? `<p><b>Gift note:</b> ${esc(order.note)}</p>` : ""}
    <p><b>Customer:</b> ${esc(session.customer_details?.name)}<br>
    ${esc(session.customer_details?.email)}<br>
    ${esc(session.customer_details?.phone)}</p>
    <p><b>Ship to:</b><br>
    ${ship ? [ship.line1, ship.line2, `${ship.postal_code ?? ""} ${ship.city ?? ""}`, ship.country].filter(Boolean).map(esc).join("<br>") : "(no address)"}</p>
    <p>Order ${esc(order.id)}</p>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_FROM") ?? "The Salty Corner <onboarding@resend.dev>",
      to: [to],
      subject: `New order ${eur(order.amount_cents)}`,
      html,
    }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
}

async function markPaid(session: any) {
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return console.error("Session has no order id", session.id);
  const ship = (session.collected_information?.shipping_details ?? session.shipping_details)?.address ?? null;

  // Only the first call changes the row, so retries from Stripe never email twice.
  const { data: order, error } = await db
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      customer_name: session.customer_details?.name ?? null,
      customer_email: session.customer_details?.email ?? null,
      customer_phone: session.customer_details?.phone ?? null,
      shipping_address: ship,
    })
    .eq("id", orderId)
    .neq("status", "paid")
    .select()
    .maybeSingle();
  if (error) throw error;
  if (order) await emailShop(order, session);
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return new Response("Bad request", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      secret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("Signature check failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const session = event.data.object as any;
    if (event.type === "checkout.session.completed" && session.payment_status === "paid") {
      await markPaid(session);
    } else if (event.type === "checkout.session.async_payment_succeeded") {
      await markPaid(session);
    } else if (event.type === "checkout.session.async_payment_failed") {
      await db.from("orders").update({ status: "failed" }).eq("stripe_session_id", session.id);
    }
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 }); // Stripe will retry
  }
  return new Response("ok");
});
