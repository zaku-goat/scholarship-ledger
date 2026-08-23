// Runs after Stripe redirects the user back post-checkout.
// Looks up the checkout session, records it in D1, and sets a session cookie.

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return Response.redirect(url.origin + "/paywall.html", 302);
  }

  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription`,
    { headers: { Authorization: "Basic " + btoa(env.STRIPE_SECRET_KEY + ":") } }
  );

  if (!res.ok) {
    return Response.redirect(url.origin + "/paywall.html", 302);
  }

  const session = await res.json();
  const sub = session.subscription;
  if (!sub) {
    return Response.redirect(url.origin + "/paywall.html", 302);
  }

  const token = randomToken();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO sessions (token, stripe_customer_id, stripe_subscription_id, status, trial_end, current_period_end, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(stripe_subscription_id) DO UPDATE SET token=excluded.token, status=excluded.status,
       trial_end=excluded.trial_end, current_period_end=excluded.current_period_end`
  )
    .bind(
      token,
      session.customer,
      sub.id,
      sub.status,
      sub.trial_end || null,
      sub.current_period_end || null,
      now
    )
    .run();

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.origin + "/",
      "Set-Cookie": `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=34560000`,
    },
  });
}
