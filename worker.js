/**
 * Haroon Chitrali Legal Information Assistant
 * Deploy as a Cloudflare Worker. Add GEMINI_API_KEY as a Worker secret.
 * Do not put the Gemini API key in index.html or a public GitHub repository.
 */
const ALLOWED_ORIGINS = new Set([
  "https://haroonchitrali.site",
  "https://www.haroonchitrali.site",
  "https://haroonchitrali.github.io"
]);

const SYSTEM_INSTRUCTION = `
You are the general legal information assistant on the website of Muhammad Haroon Khan Chitrali, Advocate High Court, in Lahore, Pakistan.

Your role:
- Be helpful, calm, clear, respectful, and concise. Use plain English; if asked, explain in Urdu or Roman Urdu.
- Give general legal information, explain terminology and legal processes, and suggest sensible questions the visitor can ask a qualified lawyer.
- Where the question concerns Pakistan, say when information is general and may depend on the province, facts, date, and current law. Do not invent statutes, sections, case citations, deadlines, court rules, or legal authorities. If uncertain, say so and recommend checking current law with a qualified Pakistani lawyer.
- Do not claim to be a lawyer, do not say you represent the visitor, and do not imply that chatting creates a lawyer-client relationship.
- Do not guarantee outcomes or tell the user that they definitely will win, be released, or avoid liability.
- For urgent arrests, threats, violence, court deadlines, or imminent limitation periods, tell the visitor to contact a qualified lawyer or relevant emergency service immediately; do not delay with a long answer.
- Never request CNIC numbers, passwords, full addresses, confidential documents, or identifying details of other parties. If the visitor shares sensitive information, do not repeat it; advise them not to share it here.
- Do not make a definitive legal opinion from a short description. Ask only for non-sensitive clarifying facts if needed.
- You may explain the practice areas listed on the website, but do not claim availability, fees, results, or that Advocate Haroon has accepted the matter unless the visitor confirms directly with the office.
- Never claim that a submission has been sent to the office. Direct enquiries to haroonchitraliadv@gmail.com or WhatsApp +92 300 8499920.
- This is an AI information tool, not a substitute for advice from a qualified lawyer. Keep that limitation clear when relevant.
`;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
}
function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    if (url.pathname !== "/chat") return json({ error: "Not found." }, 404, origin);
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "Origin not allowed." }, 403, origin);
    if (request.method !== "POST") return json({ error: "Use POST." }, 405, origin);
    if (!env.GEMINI_API_KEY) return json({ error: "AI service is not configured yet." }, 503, origin);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Please send a valid JSON request." }, 400, origin);
    }

    if (!Array.isArray(body.contents) || body.contents.length < 1 || body.contents.length > 10) {
      return json({ error: "Please send a chat with 1–10 messages." }, 400, origin);
    }

    const contents = [];
    for (const item of body.contents) {
      if (!item || !["user", "model"].includes(item.role) || !Array.isArray(item.parts)) {
        return json({ error: "Invalid chat message format." }, 400, origin);
      }
      const textParts = item.parts
        .filter(part => part && typeof part.text === "string")
        .map(part => part.text.trim())
        .filter(Boolean);
      if (!textParts.length) return json({ error: "Message cannot be empty." }, 400, origin);
      const combined = textParts.join("\n");
      if (combined.length > 1500) return json({ error: "Each message must be 1,500 characters or fewer." }, 400, origin);
      contents.push({ role: item.role, parts: [{ text: combined }] });
    }
    if (contents[contents.length - 1].role !== "user") {
      return json({ error: "The latest message must be from the user." }, 400, origin);
    }

    try {
      const model = env.GEMINI_MODEL || "gemini-2.5-flash-lite";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;
      const apiResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 700
          }
        })
      });
      const data = await apiResponse.json().catch(() => ({}));
      if (!apiResponse.ok) {
        // Do not expose provider responses, API keys, or internal details to visitors.
        return json({
          error: apiResponse.status === 429
            ? "The free AI usage limit may have been reached. Please try again later."
            : "The AI provider is temporarily unavailable. Please try again later."
        }, apiResponse.status === 429 ? 429 : 502, origin);
      }
      const reply = (data.candidates || [])
        .flatMap(candidate => candidate.content && candidate.content.parts ? candidate.content.parts : [])
        .map(part => part.text || "")
        .join("\n")
        .trim();
      if (!reply) return json({ error: "The assistant could not produce an answer. Please try again." }, 502, origin);
      return json({ reply }, 200, origin);
    } catch {
      return json({ error: "The AI assistant is temporarily unavailable. Please try again later." }, 502, origin);
    }
  }
};
