// ============================================================
// RelayPay Voice Support Agent — Frontend App
// Integrates VAPI Web SDK for voice call handling
// ============================================================

import Vapi from "https://cdn.jsdelivr.net/npm/@vapi-ai/web/dist/vapi.mjs";

// --- Config (replace with real values from .env) ---
const VAPI_PUBLIC_KEY  = "YOUR_VAPI_PUBLIC_KEY";
const ASSISTANT_ID     = "YOUR_VAPI_ASSISTANT_ID";

// --- DOM Elements ---
const voiceBtn      = document.getElementById("voice-btn");
const micIcon       = document.getElementById("mic-icon");
const stopIcon      = document.getElementById("stop-icon");
const statusText    = document.getElementById("status");
const transcriptEl  = document.getElementById("transcript");
const pulseRing     = document.getElementById("pulse-ring");
const clearBtn      = document.getElementById("clear-btn");

// --- State ---
let vapi = null;
let isCallActive = false;

// --- Init VAPI ---
function initVapi() {
  vapi = new Vapi(VAPI_PUBLIC_KEY);
  bindVapiEvents();
}

// --- Event Bindings ---
function bindVapiEvents() {

  vapi.on("call-start", () => {
    isCallActive = true;
    setStatus("Listening...", "listening");
    setButtonActive(true);
    removeEmptyState();
  });

  vapi.on("call-end", () => {
    isCallActive = false;
    setStatus("Press to speak", "");
    setButtonActive(false);
  });

  vapi.on("speech-start", () => {
    setStatus("Agent is speaking...", "speaking");
  });

  vapi.on("speech-end", () => {
    setStatus("Listening...", "listening");
  });

  vapi.on("message", (msg) => {
    if (msg.type === "transcript" && msg.transcriptType === "final") {
      if (msg.role === "user") {
        appendMessage(msg.transcript, "user");
      }
      if (msg.role === "assistant") {
        appendMessage(msg.transcript, "agent");
      }
    }
  });

  vapi.on("error", (err) => {
    console.error("VAPI error:", err);
    isCallActive = false;
    setStatus("Something went wrong. Please try again.", "error");
    setButtonActive(false);
  });
}

// --- Button Handler ---
voiceBtn.addEventListener("click", async () => {
  if (!vapi) {
    setStatus("Loading...", "");
    initVapi();
    await new Promise(r => setTimeout(r, 300));
  }

  if (!isCallActive) {
    setStatus("Connecting...", "");
    try {
      await vapi.start(ASSISTANT_ID);
    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus("Could not connect. Please try again.", "error");
    }
  } else {
    vapi.stop();
    setStatus("Ending call...", "");
  }
});

// --- Clear Button ---
clearBtn.addEventListener("click", () => {
  transcriptEl.innerHTML = `
    <div class="empty-state">
      <p>Your conversation will appear here.</p>
    </div>`;
});

// --- Helpers ---
function setStatus(text, state) {
  statusText.textContent = text;
  statusText.className = `status-text ${state}`;
}

function setButtonActive(active) {
  voiceBtn.classList.toggle("active", active);
  pulseRing.classList.toggle("active", active);
  micIcon.classList.toggle("hidden", active);
  stopIcon.classList.toggle("hidden", !active);
}

function appendMessage(text, role) {
  const p = document.createElement("p");
  p.className = role === "user" ? "user-msg" : "agent-msg";
  p.textContent = text;
  transcriptEl.appendChild(p);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function removeEmptyState() {
  const empty = transcriptEl.querySelector(".empty-state");
  if (empty) empty.remove();
}

// --- Init on load ---
initVapi();
