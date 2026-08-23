// Set this URL as a webhook endpoint in your Stripe dashboard:
//   https://YOUR-APP.pages.dev/api/stripe-webhook
// Subscribe it to: customer.subscription.updated, customer.subscription.deleted
// Requires env var STRIPE_WEBHOOK_SECRET (shown when you create the webhook in Stripe).

export async function onRequestPost(context) {
  const { request, env } = context;
  const event = await request.json();

  const sub = event.data && event.data.object;
  if (!sub || !sub.id) {
    return new Response("ignored", { status: 200 });
  }

  if (event.type === "customer.subscription.updated") {
    await env.DB.prepare(
      `UPDATE sessions SET status = ?, trial_end = ?, current_period_end = ? WHERE stripe_subscription_id = ?`
    )
      .bind(sub.status, sub.trial_end || null, sub.current_period_end || null, sub.id)
      .run();
  }

  if (event.type === "customer.subscription.deleted") {
    await env.DB.prepare(`UPDATE sessions SET status = 'canceled' WHERE stripe_subscription_id = ?`)
      .bind(sub.id)
      .run();
  }

  return new Response("ok", { status: 200 });
}
