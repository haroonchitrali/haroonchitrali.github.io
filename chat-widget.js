/**
 * Haroon Chitrali AI Legal Assistant — embeddable website widget
 *
 * 1. Upload this file to the root of the GitHub Pages website.
 * 2. Set API_ENDPOINT below to your deployed Cloudflare Worker URL + /chat.
 * 3. Add <script src="/chat-widget.js" defer></script> before </body>
 *    on every page where the chatbot should appear.
 *
 * No API key belongs in this file.
 */
(() => {
  "use strict";

  const API_ENDPOINT = "https://REPLACE-WITH-YOUR-WORKER.workers.dev/chat";
  const BRAND = {
    name: "Haroon Chitrali",
    subtitle: "AI Legal Information Assistant",
    navy: "#0a1828",
    gold: "#d4af6a",
    paper: "#ffffff",
    muted: "#667085"
  };

  if (window.__haroonLegalChatLoaded) return;
  window.__haroonLegalChatLoaded = true;

  const style = document.createElement("style");
  style.textContent = `
    #hc-chat-root, #hc-chat-root * { box-sizing: border-box; }
    #hc-chat-root { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
    #hc-chat-launcher {
      position: fixed; right: 22px; bottom: 94px; z-index: 2147483000;
      display: flex; align-items: center; gap: 11px; border: 1px solid rgba(212,175,106,.7);
      border-radius: 999px; padding: 10px 17px 10px 11px; background: ${BRAND.navy};
      color: #fff; cursor: pointer; box-shadow: 0 12px 35px rgba(5,18,32,.25);
      font: 600 13px/1.2 Arial, Helvetica, sans-serif; transition: transform .2s, box-shadow .2s;
    }
    #hc-chat-launcher:hover { transform: translateY(-2px); box-shadow: 0 16px 38px rgba(5,18,32,.3); }
    #hc-chat-launcher:focus-visible, #hc-chat-send:focus-visible, #hc-chat-close:focus-visible,
    #hc-chat-input:focus-visible, .hc-chat-quick:focus-visible { outline: 3px solid ${BRAND.gold}; outline-offset: 3px; }
    .hc-chat-mark {
      width: 37px; height: 37px; flex: 0 0 37px; border-radius: 50%;
      display: grid; place-items: center; background: ${BRAND.gold}; color: ${BRAND.navy};
      font: 700 15px Georgia, serif;
    }
    #hc-chat-panel {
      position: fixed; right: 22px; bottom: 158px; z-index: 2147483001;
      width: min(390px, calc(100vw - 28px)); height: min(590px, calc(100dvh - 185px));
      min-height: 390px; display: none; flex-direction: column; overflow: hidden;
      background: ${BRAND.paper}; border: 1px solid rgba(10,24,40,.12); border-radius: 17px;
      box-shadow: 0 24px 75px rgba(5,18,32,.28);
    }
    #hc-chat-panel.hc-open { display: flex; animation: hc-in .2s ease-out; }
    @keyframes hc-in { from { opacity: 0; transform: translateY(9px) scale(.985); } to { opacity: 1; transform: none; } }
    .hc-chat-header {
      flex: 0 0 auto; display: flex; align-items: center; gap: 11px; padding: 16px;
      background: ${BRAND.navy}; color: #fff; border-bottom: 2px solid ${BRAND.gold};
    }
    .hc-chat-header .hc-chat-mark { width: 40px; height: 40px; flex-basis: 40px; }
    .hc-chat-heading { min-width: 0; flex: 1; }
    .hc-chat-heading strong { display: block; font: 600 14px/1.35 Arial, Helvetica, sans-serif; letter-spacing: .1px; }
    .hc-chat-heading span { display: block; margin-top: 3px; color: #d4dce5; font-size: 11px; }
    #hc-chat-close {
      border: 0; background: transparent; color: #fff; width: 34px; height: 34px;
      border-radius: 8px; cursor: pointer; font-size: 24px; line-height: 1;
    }
    #hc-chat-close:hover { background: rgba(255,255,255,.12); }
    #hc-chat-messages {
      flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 17px 14px 12px;
      background: #f7f8fa; scroll-behavior: smooth;
    }
    .hc-chat-disclaimer {
      margin: 0 0 14px; padding: 9px 11px; border: 1px solid #e9dfca;
      border-radius: 9px; background: #fffaf0; color: #665638; font-size: 10px; line-height: 1.5;
    }
    .hc-chat-row { display: flex; margin: 10px 0; }
    .hc-chat-row.hc-user { justify-content: flex-end; }
    .hc-chat-bubble {
      max-width: 87%; padding: 10px 12px; border-radius: 13px; font-size: 13px;
      line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere;
    }
    .hc-chat-row.hc-bot .hc-chat-bubble {
      background: #fff; color: #263445; border: 1px solid #e5e8ed;
      border-top-left-radius: 4px; box-shadow: 0 2px 7px rgba(10,24,40,.035);
    }
    .hc-chat-row.hc-user .hc-chat-bubble {
      background: ${BRAND.navy}; color: #fff; border-top-right-radius: 4px;
    }
    .hc-chat-typing { color: ${BRAND.muted}; font-size: 12px; padding: 5px 2px 10px; }
    .hc-chat-quick-wrap { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0 3px; }
    .hc-chat-quick {
      border: 1px solid #d8dee7; border-radius: 999px; padding: 7px 10px;
      color: ${BRAND.navy}; background: #fff; font-size: 11px; cursor: pointer;
    }
    .hc-chat-quick:hover { border-color: ${BRAND.gold}; background: #fffaf0; }
    .hc-chat-compose {
      flex: 0 0 auto; display: flex; gap: 8px; padding: 12px;
      border-top: 1px solid #e8ebef; background: #fff; align-items: flex-end;
    }
    #hc-chat-input {
      flex: 1; min-width: 0; max-height: 100px; min-height: 43px; resize: none;
      border: 1px solid #d9dee6; border-radius: 10px; padding: 11px 12px;
      color: #1e293b; background: #fff; font: 13px/1.4 Arial, Helvetica, sans-serif; outline: none;
    }
    #hc-chat-input:focus { border-color: ${BRAND.gold}; box-shadow: 0 0 0 3px rgba(212,175,106,.16); }
    #hc-chat-send {
      flex: 0 0 43px; width: 43px; height: 43px; border: 0; border-radius: 10px;
      background: ${BRAND.navy}; color: ${BRAND.gold}; cursor: pointer; font-size: 18px;
    }
    #hc-chat-send:disabled { opacity: .45; cursor: not-allowed; }
    .hc-chat-footer {
      flex: 0 0 auto; text-align: center; padding: 0 10px 9px; background: #fff;
      color: #87909d; font-size: 9px;
    }
    .hc-chat-footer a { color: #8a6a32; text-decoration: none; }
    @media (max-width: 520px) {
      #hc-chat-launcher { right: 14px; bottom: 88px; padding: 9px 13px 9px 9px; }
      #hc-chat-panel {
        right: 10px; bottom: 151px; width: calc(100vw - 20px);
        height: min(620px, calc(100dvh - 170px)); min-height: 350px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      #hc-chat-panel.hc-open { animation: none; }
      #hc-chat-launcher { transition: none; }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "hc-chat-root";
  root.innerHTML = `
    <button id="hc-chat-launcher" type="button" aria-label="Open Haroon Chitrali AI legal assistant" aria-expanded="false">
      <span class="hc-chat-mark" aria-hidden="true">HC</span>
      <span>Ask our AI assistant</span>
    </button>
    <section id="hc-chat-panel" role="dialog" aria-label="Haroon Chitrali AI Legal Information Assistant" aria-modal="false">
      <header class="hc-chat-header">
        <span class="hc-chat-mark" aria-hidden="true">HC</span>
        <div class="hc-chat-heading">
          <strong>${BRAND.name}</strong>
          <span>${BRAND.subtitle}</span>
        </div>
        <button id="hc-chat-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div id="hc-chat-messages" aria-live="polite">
        <div class="hc-chat-disclaimer">General information only — not legal advice. Please do not share confidential case details, CNIC numbers, documents or passwords.</div>
      </div>
      <form class="hc-chat-compose" id="hc-chat-form">
        <textarea id="hc-chat-input" rows="1" maxlength="1500" placeholder="Ask a general legal question..." aria-label="Your message"></textarea>
        <button id="hc-chat-send" type="submit" aria-label="Send message">➤</button>
      </form>
      <div class="hc-chat-footer">For personal legal advice, contact the office · <a href="https://wa.me/923008499920" target="_blank" rel="noopener noreferrer">WhatsApp</a></div>
    </section>
  `;
  document.body.appendChild(root);

  const launcher = root.querySelector("#hc-chat-launcher");
  const panel = root.querySelector("#hc-chat-panel");
  const closeButton = root.querySelector("#hc-chat-close");
  const messages = root.querySelector("#hc-chat-messages");
  const form = root.querySelector("#hc-chat-form");
  const input = root.querySelector("#hc-chat-input");
  const sendButton = root.querySelector("#hc-chat-send");

  const history = [];
  let busy = false;

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function addMessage(text, who) {
    const row = document.createElement("div");
    row.className = `hc-chat-row ${who === "user" ? "hc-user" : "hc-bot"}`;
    const bubble = document.createElement("div");
    bubble.className = "hc-chat-bubble";
    bubble.textContent = text;
    if (/[؀-ۿ]/.test(text)) bubble.dir = "auto";
    row.appendChild(bubble);
    messages.appendChild(row);
    scrollToBottom();
    return row;
  }

  function showQuickPrompts() {
    const wrap = document.createElement("div");
    wrap.className = "hc-chat-quick-wrap";
    [
      "What legal services are offered?",
      "How can I contact the office?",
      "What is criminal defence?"
    ].forEach(label => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hc-chat-quick";
      button.textContent = label;
      button.addEventListener("click", () => {
        input.value = label;
        form.requestSubmit();
      });
      wrap.appendChild(button);
    });
    messages.appendChild(wrap);
  }

  addMessage(
    "Assalam-o-Alaikum. Welcome to Haroon Chitrali's website. I can help with general information about the practice and legal topics. How may I assist you?",
    "bot"
  );
  showQuickPrompts();

  function openChat() {
    panel.classList.add("hc-open");
    launcher.setAttribute("aria-expanded", "true");
    launcher.style.display = "none";
    input.focus();
    scrollToBottom();
  }

  function closeChat() {
    panel.classList.remove("hc-open");
    launcher.style.display = "flex";
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", openChat);
  closeButton.addEventListener("click", closeChat);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && panel.classList.contains("hc-open")) closeChat();
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || busy) return;

    if (API_ENDPOINT.includes("REPLACE-WITH-YOUR-WORKER") || !/^https:\/\/[a-z0-9-]+\.workers\.dev\/chat$/i.test(API_ENDPOINT)) {
      addMessage("The assistant has not been connected yet. Please contact the office directly by WhatsApp or email.", "bot");
      return;
    }

    busy = true;
    sendButton.disabled = true;
    input.disabled = true;
    const quickWrap = messages.querySelector(".hc-chat-quick-wrap");
    if (quickWrap) quickWrap.remove();

    addMessage(message, "user");
    history.push({ role: "user", parts: [{ text: message }] });
    input.value = "";
    input.style.height = "auto";

    const typing = document.createElement("div");
    typing.className = "hc-chat-typing";
    typing.textContent = "Preparing a response…";
    messages.appendChild(typing);
    scrollToBottom();

    try {
      // Keep the most recent 10 turns/messages; the backend validates the same limit.
      const payload = history.slice(-10);
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: payload })
      });

      const data = await response.json().catch(() => ({}));
      typing.remove();

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "The assistant is temporarily unavailable.");
      }

      history.push({ role: "model", parts: [{ text: data.reply }] });
      addMessage(data.reply, "bot");
    } catch (error) {
      // Remove the failed user turn from API history so the next request stays valid.
      history.pop();
      addMessage(error.message || "The assistant is temporarily unavailable. Please try again.", "bot");
    } finally {
      typing.remove();
      busy = false;
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
      scrollToBottom();
    }
  });
})();
