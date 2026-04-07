// ============================================================
// RelayPay Voice Support Agent — Frontend App
// Integrates VAPI Web SDK for voice call handling
// ============================================================

// --- Config ---
const VAPI_PUBLIC_KEY  = "0428afe9-1b35-4173-bb2f-4c09bf4d326f";
const ASSISTANT_ID     = "745385e1-8a4b-4b07-ba8a-c1859b29f745";

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
  vapi = new window.Vapi(VAPI_PUBLIC_KEY);
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
  const row = document.createElement("div");

  if (role === "user") {
    row.className = "user-row";
    const bubble = document.createElement("p");
    bubble.className = "user-msg";
    bubble.textContent = text;
    row.appendChild(bubble);
  } else {
    row.className = "agent-row";
    const avatar = document.createElement("div");
    avatar.className = "agent-avatar";
    avatar.textContent = "R";
    const bubble = document.createElement("p");
    bubble.className = "agent-msg";
    bubble.textContent = text;
    row.appendChild(avatar);
    row.appendChild(bubble);
  }

  transcriptEl.appendChild(row);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function removeEmptyState() {
  const empty = transcriptEl.querySelector(".empty-state");
  if (empty) empty.remove();
}

// --- Init on load ---
initVapi();
