// Cloudflare Pages Function — calls Claude with web search enabled to find
// REAL scholarships matching a student's profile.
//
// Requires environment variable: ANTHROPIC_API_KEY (from console.anthropic.com,
// separate from any claude.ai subscription — this is billed per-use).
//
// NOTE: this endpoint has no rate limiting yet. Anyone who can reach it can
// trigger a real, billed API call. Before this goes live to real users, add
// a check here (e.g. verifying the `session` cookie against D1, same as
// _middleware.js does) so only trialing/paying users can trigger a search.

export async function onRequestPost(context) {
  const { request, env } = context;

  let profile;
  try {
    profile = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { average, program, city, activities } = profile;

  if (!average || typeof average !== "number") {
    return new Response(JSON.stringify({ error: "Missing average" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const activitiesText = Array.isArray(activities) && activities.length
    ? activities.map((a) => `${a.name} (${a.type})`).join(", ")
    : "none listed";

  const prompt = `You are helping a Canadian high school student find REAL scholarships they can currently apply to. Use web search to find actual, currently-open scholarships — do not invent any.

Student profile:
- Final average: ${average}%
- Intended program: ${program || "Any"}
- Region preference: ${city || "Any (Ontario)"}
- Activities/extracurriculars: ${activitiesText}

Search for real scholarships from Ontario universities, colleges, and Canadian
national/provincial scholarship programs that this student would likely be
eligible for, based on the minimum average and program requirements you find.

For each scholarship you find and confirm is real, provide:
- name
- institution or provider
- amount (in CAD)
- minimum average required (if stated)
- deadline (if stated)
- a one-sentence description in your own words (do not copy text from the source)
- the official source URL

Respond with ONLY a JSON array of up to 8 scholarships, no markdown fences, no
preamble, in this exact shape:
[{"name": "...", "institution": "...", "amount": "...", "minAverage": "...", "deadline": "...", "description": "...", "sourceUrl": "..."}]

If you cannot verify a scholarship is real and currently open, do not include it.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const cleaned = (textBlock?.text || "[]").replace(/```json|```/g, "").trim();

    let scholarships;
    try {
      scholarships = JSON.parse(cleaned);
    } catch (e) {
      scholarships = [];
    }

    return new Response(JSON.stringify({ scholarships }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
