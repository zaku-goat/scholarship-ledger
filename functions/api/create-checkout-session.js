// Requires environment variables (set in Pages → Settings → Environment variables):
//   STRIPE_SECRET_KEY  — your Stripe secret key
//   STRIPE_PRICE_ID    — the recurring $7.99 CAD/month Price ID from Stripe

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    "subscription_data[trial_period_days]": "3",
    success_url: `${origin}/api/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/paywall.html`,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(env.STRIPE_SECRET_KEY + ":"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    return new Response(JSON.stringify({ error: errText }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await res.json();
  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
}
