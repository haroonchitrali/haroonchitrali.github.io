/**
 * Haroon Chitrali Legal Information Assistant
 * Cloudflare Worker backend for the website chat widget.
 *
 * Required Worker secret:
 *   GEMINI_API_KEY = Google AI Studio API key (store as a Secret)
 *
 * Optional plain-text variable:
 *   GEMINI_MODEL = gemini-2.5-flash-lite
 *
 * Never place the Gemini API key in chat-widget.js or a public GitHub repo.
 */

const ALLOWED_ORIGINS = new Set([
  "https://haroonchitrali.site",
  "https://www.haroonchitrali.site"
]);

const SYSTEM_INSTRUCTION = `
You are the website's general legal information assistant for Muhammad Haroon Khan Chitrali, Advocate High Court, in Lahore, Pakistan.

IDENTITY AND SCOPE
- You are an AI information assistant, not a lawyer, advocate, law firm employee, or representative.
- You do not represent visitors and chatting does not create a lawyer-client relationship.
- Help visitors understand the firm's publicly described services and provide general legal information in plain language.
- The practice has a primary focus on criminal law, criminal defence, litigation, legal representation, case preparation, and advocacy.
- The office is in Lahore, Pakistan.
- Office email: haroonchitraliadv@gmail.com
- Office phone / WhatsApp: +92 300 8499920
- WhatsApp link: https://wa.me/923008499920
- Do not invent consultation fees, office hours, availability, credentials, case results, or additional practice areas.

ANSWERING
- Be calm, professional, respectful, and concise.
- Respond in the language the visitor uses. Support English, Urdu, and Roman Urdu.
- Explain legal terms and general processes simply.
- For questions about Pakistani law, explain that the answer may depend on current law, province, facts, and procedure.
- Never invent legal sections, statutes, judgments, case citations, court rules, deadlines, or legal authorities.
- If you are uncertain whether a law or procedure is current, say so and recommend checking with a qualified Pakistani lawyer.
- Do not give a definitive legal opinion or predict the result of an individual case from a short description.
- Do not guarantee acquittal, bail, release, success, or any other outcome.
- If a visitor asks how to contact the office, provide the email and WhatsApp number above.

SAFETY AND PRIVACY
- Never ask for CNIC numbers, passwords, full home addresses, confidential documents, or identifying details of other parties.
- If a visitor shares sensitive information, do not repeat it. Politely advise them not to share confidential or identifying information in this chat.
- Do not ask visitors to upload or paste case files, FIRs, evidence, or private correspondence.
- For urgent arrest, violence, threats, immediate danger, an imminent court deadline, or a limitation period, tell the visitor to contact a qualified lawyer or relevant emergency service immediately.
- Never claim that an enquiry has been sent to the office. This chat does not submit enquiries.
- When individual legal assessment is needed, recommend contacting Advocate Haroon directly.

DISCLAIMER
This chatbot provides general information only. It is not legal advice and does not create a lawyer-client relationship. Encourage visitors to obtain advice from a qualified lawyer about their specific circumstances.
`;

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };

  if (ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin)
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (!ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "This website is not authorised to use the assistant." }, 403, origin);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    if (url.pathname !== "/chat") {
      return json({ error: "Not found." }, 404, origin);
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405, origin);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "The AI assistant has not been configured yet." }, 503, origin);
    }

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > 18000) {
      return json({ error: "That message is too large. Please shorten it." }, 413, origin);
    }

    let rawBody;
    try {
      rawBody = await request.text();
      if (rawBody.length > 18000) {
        return json({ error: "That message is too large. Please shorten it." }, 413, origin);
      }
    } catch {
      return json({ error: "Could not read the request." }, 400, origin);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Please send a valid chat request." }, 400, origin);
    }

    if (!Array.isArray(body.contents) || body.contents.length < 1 || body.contents.length > 10) {
      return json({ error: "Please start a new chat and try again." }, 400, origin);
    }

    const contents = [];
    let previousRole = null;

    for (const item of body.contents) {
      if (!item || !["user", "model"].includes(item.role) || !Array.isArray(item.parts)) {
        return json({ error: "The chat message format is invalid." }, 400, origin);
      }

      if (item.role === previousRole) {
        return json({ error: "The chat history is invalid. Please start a new chat." }, 400, origin);
      }

      const combined = item.parts
        .filter(part => part && typeof part.text === "string")
        .map(part => part.text.trim())
        .filter(Boolean)
        .join("\n");

      if (!combined || combined.length > 1500) {
        return json({ error: "Each message must contain 1–1,500 characters." }, 400, origin);
      }

      contents.push({
        role: item.role,
        parts: [{ text: combined }]
      });
      previousRole = item.role;
    }

    if (contents[0].role !== "user" || contents[contents.length - 1].role !== "user") {
      return json({ error: "Please start a new chat and try again." }, 400, origin);
    }

    try {
      const model = env.GEMINI_MODEL || "gemini-2.5-flash-lite";
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      let apiResponse;
      try {
        apiResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 650
            }
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }

      const data = await apiResponse.json().catch(() => ({}));

      if (!apiResponse.ok) {
        return json({
          error: apiResponse.status === 429
            ? "The free AI usage limit may have been reached. Please try again later or contact the office directly."
            : "The AI assistant is temporarily unavailable. Please try again later."
        }, apiResponse.status === 429 ? 429 : 502, origin);
      }

      const reply = (data.candidates || [])
        .flatMap(candidate => candidate.content?.parts || [])
        .map(part => typeof part.text === "string" ? part.text : "")
        .join("\n")
        .trim();

      if (!reply) {
        return json({ error: "The assistant could not prepare an answer. Please try again." }, 502, origin);
      }

      return json({ reply }, 200, origin);
    } catch {
      return json({
        error: "The AI assistant is taking too long to respond. Please try again."
      }, 502, origin);
    }
  }
};
