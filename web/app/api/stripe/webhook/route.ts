import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const API_URL      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY    || "";
const RESEND_KEY   = process.env.RESEND_API_KEY      || "";

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
        from: "Domely <facturation@domely.app>",
        to: email,
        subject: "Problème de paiement — votre abonnement Domely",
        text: `Bonjour${name ? " " + name : ""},\n\nNous n'avons pas pu traiter votre paiement pour votre abonnement Domely.\n\nVeuillez mettre à jour votre moyen de paiement en vous connectant à votre compte.\n\nSi vous avez des questions, contactez-nous à support@domely.app.\n\nL'équipe Domely`,
      }),
    });
  } catch (err: any) {
    console.error("[Webhook] sendPaymentFailedEmail error:", err.message);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("[Stripe Webhook] Invalid signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.CheckoutSession;
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
  }

  return NextResponse.json({ received: true });
}
