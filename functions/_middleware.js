// Cloudflare Pages Function — runs on every request.
// Requires a D1 binding named DB (set this up in Pages → Settings → Functions).

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    return next();
  }

  const token = getCookie(request, "session");
  let hasAccess = false;

  if (token && env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT status, trial_end, current_period_end FROM sessions WHERE token = ?"
      )
        .bind(token)
        .first();

      if (row) {
        const now = Math.floor(Date.now() / 1000);
        if (row.status === "trialing" && row.trial_end && row.trial_end > now) {
          hasAccess = true;
        } else if (row.status === "active" && row.current_period_end && row.current_period_end > now) {
          hasAccess = true;
        }
      }
    } catch (e) {
      hasAccess = false;
    }
  }

  const assetPath = hasAccess ? "/app.html" : "/paywall.html";
  return env.ASSETS.fetch(new URL(assetPath, request.url));
}
