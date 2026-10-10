# Haroon Chitrali Website — AI + Legal Enquiry Setup

This package contains:
- `index.html` — the existing website with a legal enquiry form and AI chat interface added.
- `worker.js` — the secure Cloudflare Worker backend for Gemini AI.
- Your existing images/PDF are not included; keep `logo.png.png`, `lawimage.png.png`, and `ail-membership.pdf` in the same GitHub repository as `index.html`.

## Important: what is free and what needs setup?

- The website can remain on GitHub Pages.
- Cloudflare Workers has a free tier, subject to its usage limits.
- Gemini API has a free tier for eligible models/accounts, subject to quotas and Google's terms. Free-tier prompts may be used to improve Google's products. Do not send confidential client information to the AI.
- The legal enquiry form uses FormSubmit's free email form endpoint. On the first test, the inbox `haroonchitraliadv@gmail.com` may receive an activation email; click its activation link. Check spam/junk too. FormSubmit is a third-party service, not a private case-management system.

## Part A — Set up the real AI

1. Open Google AI Studio: https://aistudio.google.com/app/apikey
2. Sign in and create an API key. Keep it private. Do not paste it into `index.html`, GitHub, a screenshot, or a public chat.
3. Create a Cloudflare account and open Workers & Pages: https://dash.cloudflare.com/
4. Create a Worker (for example, name it `haroon-legal-ai`).
5. Replace the starter code with the complete contents of `worker.js`, then deploy.
6. In that Worker, open **Settings → Variables and Secrets** (wording can vary) and add:
   - Name: `GEMINI_API_KEY`
   - Value: your Google AI Studio API key
   - Mark it as a **Secret**.
7. Optional: add a plain-text variable `GEMINI_MODEL` with value `gemini-2.5-flash-lite` if you need to specify the model. Otherwise the Worker uses that default.
8. Save/deploy the Worker again after adding the secret. Your Worker URL will look like `https://YOUR-WORKER-NAME.YOUR-ACCOUNT.workers.dev`.
9. Open `index.html` and find this line:
   `const LEGAL_AI_ENDPOINT = "https://REPLACE-WITH-YOUR-CLOUDFLARE-WORKER.workers.dev/chat";`
10. Replace the placeholder with your actual Worker URL plus `/chat`, e.g. `https://haroon-legal-ai.YOUR-ACCOUNT.workers.dev/chat`.
11. Upload the updated `index.html` to the root of the GitHub repository and commit the change.

The Worker only accepts browser requests from the configured website origins (`haroonchitrali.site`, `www.haroonchitrali.site`, and the listed GitHub Pages hostname). If your live website uses a different hostname, add that exact HTTPS origin to `ALLOWED_ORIGINS` in `worker.js` and redeploy.

## Part B — Test the email enquiry form

1. Deploy `index.html` to GitHub Pages.
2. On your live site, submit a test enquiry with a name, a phone number you control, and a harmless test message.
3. Check `haroonchitraliadv@gmail.com` inbox and spam/junk for a FormSubmit activation message.
4. If an activation message arrives, click the confirmation link.
5. Submit one more harmless test enquiry and verify the email arrives. If not, use the direct email/WhatsApp links shown on the page.

FormSubmit is a third-party service and may change its activation or anti-spam requirements. Do not assume a form submission succeeded until you have confirmed the email arrived.

## Privacy and legal safety

- Do not ask visitors to send confidential documents or full case details through the form or AI chat.
- The AI request goes to Google Gemini through the Cloudflare Worker. Google states that free-tier data may be used to improve products; review the current Gemini API terms before launch.
- Form details are sent through FormSubmit to the law-office inbox. Review the provider's privacy terms before using it for real client information.
- The form includes a consent checkbox, but the page is not a secure client portal and should only collect a brief, non-sensitive initial enquiry.
- The chatbot provides general legal information, not legal advice or a lawyer-client relationship. Have a qualified lawyer review its wording before public launch.
- Never publish the Gemini API key. If it is exposed, revoke it and create a new one.

## Troubleshooting

- **Chat says it is not connected:** the placeholder Worker URL in `index.html` has not been replaced.
- **Chat returns an unavailable message:** check the Worker deployment, secret name `GEMINI_API_KEY`, model access, and Gemini quota.
- **Chat returns a CORS/origin error:** add the exact live website origin to `ALLOWED_ORIGINS` in `worker.js` and redeploy.
- **Form doesn't email:** check FormSubmit activation and spam/junk, then test again. The form shows a direct-contact fallback if the request fails.
- **Images or certificate disappear:** ensure the original image/PDF files remain at the same relative paths in the GitHub repository.
