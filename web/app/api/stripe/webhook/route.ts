import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

const API_URL      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY    || "";
const RESEND_KEY   = process.env.RESEND_API_KEY      || "";
const CONNECT_WEBHOOK_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || "";

/** Update user plan in the FastAPI backend. */
async function updateSubscription(payload: {
  email: string;
  plan: string;
  plan_status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}) {
  if (!payload.email) { console.warn("[Webhook] updateSubscription called without email"); return; }
  try {
    const res = await fetch(`${API_URL}/internal/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": INTERNAL_KEY },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("[Webhook] updateSubscription failed:", await res.text());
  } catch (err: any) {
    console.error("[Webhook] updateSubscription error:", err.message);
  }
}

/** Send a payment-failed email via Resend. */
async function sendPaymentFailedEmail(email: string, name?: string) {
  if (!RESEND_KEY || !email) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: "Domely <facturation@domely.ca>",
        to: email,
        subject: "Problème de paiement — votre abonnement Domely",
        text: `Bonjour${name ? " " + name : ""},\n\nNous n'avons pas pu traiter votre paiement pour votre abonnement Domely.\n\nVeuillez mettre à jour votre moyen de paiement en vous connectant à votre compte.\n\nSi vous avez des questions, contactez-nous à support@domely.app.\n\nL'équipe Domely`,
      }),
    });
  } catch (err: any) {
    console.error("[Webhook] sendPaymentFailedEmail error:", err.message);
  }
}

/** Record a confirmed rent payment via the internal API. */
async function recordRentPayment(payload: {
  tenant_id: string;
  lease_id: string;
  landlord_id: string;
  amount: number;
  month_year: string;
  stripe_payment_intent_id: string;
}) {
  if (!payload.tenant_id || !payload.lease_id) return;
  try {
    const res = await fetch(`${API_URL}/internal/rent-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": INTERNAL_KEY },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("[Webhook] recordRentPayment failed:", await res.text());
  } catch (err: any) {
    console.error("[Webhook] recordRentPayment error:", err.message);
  }
}

/** Update landlord's Stripe Connect account status. */
async function updateConnectStatus(payload: { account_id: string; charges_enabled: boolean; payouts_enabled: boolean }) {
  try {
    const res = await fetch(`${API_URL}/internal/stripe-connect-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": INTERNAL_KEY },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("[Webhook] updateConnectStatus failed:", await res.text());
  } catch (err: any) {
    console.error("[Webhook] updateConnectStatus error:", err.message);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  const stripe = getStripe();
  let event: Stripe.Event;

  // Try platform webhook secret first, then Connect webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const connectSecret = CONNECT_WEBHOOK_SECRET || webhookSecret;

  try {
    // Attempt with platform secret; fall back to connect secret for account.* events
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch {
      event = stripe.webhooks.constructEvent(body, sig, connectSecret);
    }
  } catch (err: any) {
    console.error("[Stripe Webhook] Invalid signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email   = (session.customer_email || session.metadata?.email || "").toLowerCase();
      const plan    = session.metadata?.plan || "pro";
      console.log("[Stripe] New subscription:", session.id, "→", email, plan);
      await updateSubscription({
        email,
        plan,
        plan_status: "active",
        stripe_customer_id:     String(session.customer    || ""),
        stripe_subscription_id: String(session.subscription || ""),
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub   = event.data.object as Stripe.Subscription;
      const email = (sub.metadata?.email || "").toLowerCase();
      console.log("[Stripe] Subscription cancelled:", sub.id, "→", email);
      await updateSubscription({
        email,
        plan: "free",
        plan_status: "cancelled",
        stripe_customer_id:     String(sub.customer || ""),
        stripe_subscription_id: sub.id,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const email   = (invoice.customer_email || "").toLowerCase();
      console.log("[Stripe] Payment failed:", invoice.id, "→", email);
      await updateSubscription({
        email,
        plan: "free",
        plan_status: "past_due",
        stripe_customer_id: String(invoice.customer || ""),
      });
      await sendPaymentFailedEmail(email);
      break;
    }

    // ── Connect events ──────────────────────────────────────────────────────

    case "charge.succeeded": {
      const charge = event.data.object as Stripe.Charge;
      const meta   = charge.metadata ?? {};
      const tenantId  = meta.tenant_id   || "";
      const leaseId   = meta.lease_id    || "";
      const landlordId = meta.landlord_id || "";
      const monthYear = meta.month_year  || new Date().toISOString().slice(0, 7);
      const amountDollars = (charge.amount ?? 0) / 100;
      const intentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : (charge.payment_intent as any)?.id ?? "";
      if (tenantId && leaseId) {
        console.log("[Stripe] Rent charge succeeded:", charge.id, "→ tenant:", tenantId, "amount:", amountDollars);
        await recordRentPayment({
          tenant_id:   tenantId,
          lease_id:    leaseId,
          landlord_id: landlordId,
          amount:      amountDollars,
          month_year:  monthYear,
          stripe_payment_intent_id: intentId,
        });
      }
      break;
    }

    case "account.updated": {
      const acct = event.data.object as Stripe.Account;
      console.log("[Stripe] Connect account updated:", acct.id, "charges_enabled:", acct.charges_enabled);
      await updateConnectStatus({
        account_id:      acct.id,
        charges_enabled: acct.charges_enabled ?? false,
        payouts_enabled: acct.payouts_enabled ?? false,
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
