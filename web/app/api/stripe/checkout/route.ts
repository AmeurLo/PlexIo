import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    yearly:  process.env.STRIPE_PRICE_PRO_YEARLY!,
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY!,
    yearly:  process.env.STRIPE_PRICE_TEAM_YEARLY!,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, billing = "monthly", email } = await req.json();

    const priceId = PRICE_IDS[plan]?.[billing];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan or billing period" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://domely.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      ...(email ? { customer_email: email } : {}),
      metadata: { plan, email: email || "" },
      subscription_data: {
        trial_period_days: plan === "pro" ? 14 : undefined,
        metadata: { plan, email: email || "" },
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/cancel`,
      locale: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[Stripe Checkout]", err.message);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
