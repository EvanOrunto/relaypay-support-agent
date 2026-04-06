# RelayPay Voice-Based Customer Support Agent
## Master Build Document for Claude Code

---

## 1. PROJECT OVERVIEW & GOALS

### What We Are Building
A production-ready, voice-based customer support agent for **RelayPay** — a B2B SaaS company providing cross-border payments and invoicing tools for African startups and SMEs.

### How It Works (End to End)
1. A customer visits the RelayPay support webpage
2. They press a button and speak their question
3. VAPI captures the voice input and transcribes it
4. The question is sent via webhook to an n8n automation workflow
5. n8n queries the Notion knowledge base for relevant context
6. If confidence is high → Claude generates a grounded response → VAPI speaks it back
7. If confidence is low or question is sensitive → n8n escalates to a human agent
8. Every interaction is logged to Supabase regardless of outcome

### Goals
- Handle the top 6 support topics without human intervention
- Escalate gracefully when the agent cannot confidently answer
- Log every conversation for quality review and memory
- Reflect RelayPay's professional brand in voice and design
- Be deployable, maintainable, and easy to extend

---

## 2. TOOLS, MCPs & HOW EACH IS USED

| Tool | MCP | Role in the System |
|------|-----|--------------------|
| **VAPI** | `vapi` | Voice input/output, knowledge base, call handling, webhook trigger |
| **n8n** | `n8n-mcp` | Workflow orchestration, confidence evaluation, escalation routing |
| **Supabase** | `supabase` | Conversation logs, agent memory, returning customer context |
| **Notion** | `notion` | Source of truth for all approved RelayPay support documentation |
| **GitHub** | `github` | Frontend repository, GitHub Pages hosting, deployment pipeline |
| **Filesystem** | `filesystem` | Create, edit and manage all local project files |
| **Claude** | (AI brain) | Response generation, confidence evaluation, answer grounding |

### MCP Details

#### VAPI MCP (`vapi`)
- Creates and configures the voice assistant
- Sets Claude as the underlying AI model
- Configures voice tone, speed, and style
- Manages knowledge base files attached to the assistant
- Connects the outbound webhook to the n8n workflow URL

#### n8n MCP (`n8n-mcp`)
- Builds the full automation workflow from scratch
- Triggers on incoming VAPI webhook calls
- Routes to Notion query, Claude generation, or human escalation
- Logs every interaction to Supabase
- Sends escalation notifications via Slack or email

#### Supabase MCP (`supabase`)
- Creates and manages the `conversation_logs` table
- Creates and manages the `agent_memory` table
- Executes insert queries for logging
- Enables pgvector extension for future semantic search upgrade

#### Notion MCP (`notion`)
- Reads approved RelayPay knowledge base pages
- Searches for relevant content based on the customer's question
- Returns structured context blocks to n8n for response generation

#### GitHub MCP (`github`)
- Creates the `relaypay-support-agent` repository
- Pushes the frontend webpage files
- Configures GitHub Pages for public deployment
- Manages branches and deployment pipeline

#### Filesystem MCP (`filesystem`)
- Scaffolds the full local project directory structure
- Creates and edits all HTML, CSS, JavaScript, and config files
- Writes n8n workflow JSON export files
- Manages environment variable and documentation files

---

## 3. STEP-BY-STEP BUILD ORDER

Follow this exact order. Each step depends on the previous one being complete.

### PHASE 1 — Project Foundation

**Step 1.1 — Scaffold Local Directory Structure**
Use Filesystem MCP to create the following folder structure:
```
/VAPI Agent/
├── SYSTEM_PROMPT.md          ← this file
├── .env.example              ← environment variable template
├── README.md                 ← project overview
├── frontend/
│   ├── index.html            ← main webpage
│   ├── style.css             ← RelayPay branded styles
│   └── app.js                ← VAPI web SDK integration
├── n8n/
│   └── workflow.json         ← exported n8n workflow
├── supabase/
│   └── schema.sql            ← table definitions
├── docs/
│   └── architecture.md       ← system architecture notes
└── vapi/
    └── assistant-config.json ← VAPI assistant configuration record
```

**Step 1.2 — Create GitHub Repository**
Use GitHub MCP to:
- Create a new public repository named `relaypay-support-agent`
- Add a `.gitignore` for Node.js/web projects
- Add the initial README
- Enable GitHub Pages from the `main` branch `/frontend` folder

**Step 1.3 — Set Up Supabase Database**
Use Supabase MCP to:
- Enable the `pgvector` extension on the project
- Create the `conversation_logs` table (see schema in Section 5)
- Create the `agent_memory` table (see schema in Section 5)
- Generate and save the project API URL and anon key to `.env.example`

---

### PHASE 2 — Knowledge Base Setup

**Step 2.1 — Audit Notion Knowledge Base**
Use Notion MCP to:
- List all pages in the RelayPay workspace
- Identify pages covering the 6 required support topics
- Note each page ID for use in the n8n workflow query step

**Step 2.2 — Structure Knowledge Base Topics**
Ensure the following 6 topics are documented and accessible in Notion:
1. Onboarding questions
2. Pricing and fees
3. Payout timelines
4. Failed or delayed transactions
5. Invoicing
6. Compliance requirements

**Step 2.3 — Upload Knowledge Base to VAPI**
Use VAPI MCP to:
- Export Notion page content as plain text files
- Upload each document as a knowledge base file to the VAPI assistant
- Confirm all 6 topic files are attached and indexed

---

### PHASE 3 — VAPI Voice Agent Configuration

**Step 3.1 — Create the VAPI Assistant**
Use VAPI MCP to create an assistant with:
- Name: `RelayPay Support Agent`
- Model: Claude (claude-sonnet-4-6)
- Voice: Professional, clear, neutral accent (ElevenLabs or VAPI native)
- System prompt: (see Section 7 for full system prompt text)
- First message: `"Hello, you've reached RelayPay support. How can I help you today?"`
- End call phrase: `"Thank you for contacting RelayPay. Have a great day."`

**Step 3.2 — Configure Webhook**
- Set the server URL in the VAPI assistant to point to the n8n webhook trigger URL
- Enable `message` event forwarding so every user message is sent to n8n
- Save the webhook URL to `.env.example`

**Step 3.3 — Configure Call Handling**
- Set maximum call duration: 10 minutes
- Enable silence detection: end call after 30 seconds of silence
- Enable voicemail detection: false (live calls only)

---

### PHASE 4 — n8n Workflow Build

**Step 4.1 — Create the Workflow**
Use n8n MCP to create a workflow named `RelayPay Support Agent - Main Flow`

**Step 4.2 — Build the Node Chain**
Build the following nodes in order (see Section 6 for full structure):

1. **Webhook Trigger** — receives incoming message from VAPI
2. **Extract Question** — parse the user message from the VAPI payload
3. **Query Notion** — search the knowledge base for relevant content
4. **Confidence Check** — evaluate if retrieved content answers the question
5. **IF Node** — branch on confidence score
   - High confidence → Generate Response branch
   - Low confidence → Escalation branch
6. **Generate Response** — HTTP request to Claude API with context + question
7. **Return to VAPI** — send the generated response back to the voice call
8. **Escalation Node** — send Slack or email notification to human agent team
9. **Log to Supabase** — insert full interaction record regardless of branch

**Step 4.3 — Activate and Test**
- Activate the workflow
- Send a test webhook payload simulating a VAPI question
- Confirm the full flow runs without errors

---

### PHASE 5 — Frontend Webpage Build

**Step 5.1 — Build the HTML Structure**
Use Filesystem MCP to create `frontend/index.html` with:
- RelayPay branding (logo, colors, typography)
- Single-page layout with centered voice interface
- Large circular microphone button
- Status text indicator (idle / listening / thinking / speaking)
- Transcript display area showing the conversation

**Step 5.2 — Style with RelayPay Brand CSS**
Use Filesystem MCP to create `frontend/style.css` with:
- Primary color: to be confirmed from RelayPay brand guide (default: deep navy `#0A1628`)
- Accent color: bright green or gold (to be confirmed)
- Font: Inter or similar clean sans-serif
- Fully responsive — works on mobile and desktop
- Smooth animations for the microphone button state changes

**Step 5.3 — Integrate VAPI Web SDK**
Use Filesystem MCP to create `frontend/app.js` with:
- Import VAPI Web SDK via CDN
- Initialize VAPI client with the assistant ID and public key
- Wire up the microphone button to start/stop calls
- Handle call events: `call-start`, `speech-start`, `speech-end`, `message`, `call-end`
- Display live transcript in the UI
- Handle errors gracefully with user-friendly messages

**Step 5.4 — Deploy to GitHub Pages**
Use GitHub MCP to:
- Push all frontend files to the repository
- Confirm GitHub Pages is serving from the correct branch/folder
- Test the live URL and confirm the voice interface loads

---

### PHASE 6 — Integration Testing

**Step 6.1 — End-to-End Voice Test**
- Open the live GitHub Pages URL
- Press the microphone button and ask: *"How long do payouts take?"*
- Confirm: voice is captured → n8n workflow triggered → Notion queried → response generated → VAPI speaks the answer

**Step 6.2 — Escalation Test**
- Ask a question with no matching Notion content
- Confirm: n8n routes to escalation → Slack/email notification sent → interaction logged to Supabase

**Step 6.3 — Logging Test**
- Check Supabase `conversation_logs` table
- Confirm both test interactions were inserted with correct fields

**Step 6.4 — Mobile Test**
- Open the live URL on a mobile browser
- Confirm the interface is responsive and the microphone button works

---

## 4. AGENT BEHAVIOR RULES & DECISION LOGIC

### Core Rules
| Rule | Behavior |
|------|----------|
| **Always ground answers** | Every response must be based on content retrieved from the Notion knowledge base — never generate from training data alone |
| **Never guess** | If the agent is not confident, it must say so clearly and escalate |
| **Clarify ambiguity** | If a question is vague, ask one specific clarifying question before answering |
| **Escalate sensitive topics** | Payment disputes, compliance violations, account suspensions → always escalate |
| **Stay in scope** | Do not answer questions outside the 6 defined topics |
| **Brand tone** | All responses must be professional, clear, and trustworthy — never casual or uncertain |

### Confidence Scoring Logic (in n8n)
The n8n workflow evaluates confidence using these criteria:

```
HIGH CONFIDENCE (answer directly):
  - Notion search returns at least 1 relevant document
  - The document content directly addresses the question
  - The question falls within the 6 defined support topics
  - No sensitive keywords detected

LOW CONFIDENCE (escalate):
  - No relevant Notion document found
  - Question contains sensitive keywords:
    ["dispute", "fraud", "legal", "suspend", "compliance violation", "stolen"]
  - Question is outside the 6 defined topics
  - User has been unsatisfied in a previous turn (detected via memory)
```

### Escalation Message Template (sent to human team)
```
🚨 RelayPay Support Escalation

Customer Question: [question]
Reason for Escalation: [no content found / sensitive topic / low confidence]
Timestamp: [ISO timestamp]
Session ID: [VAPI call ID]

Please follow up with this customer directly.
```

### VAPI System Prompt (use inside VAPI assistant configuration)
```
You are a professional customer support agent for RelayPay — a cross-border
payments and invoicing platform for African startups and SMEs.

Your job is to answer customer questions clearly and accurately using ONLY
the approved knowledge base documents provided to you.

Rules you must follow:
1. Only answer questions about: onboarding, pricing and fees, payout timelines,
   failed or delayed transactions, invoicing, and compliance requirements.
2. Never make up information. If you are not sure, say:
   "I want to make sure I give you accurate information. Let me connect you
   with a member of our team."
3. If a question is unclear, ask one specific clarifying question.
4. Always sound professional, calm, and trustworthy.
5. Keep responses concise — no longer than 3-4 sentences for voice.
6. Always end sensitive topics with: "Would you like me to connect you with
   our support team for further assistance?"

You represent RelayPay. Every response reflects on the brand.
```

---

## 5. SUPABASE SCHEMA DEFINITIONS

### Enable pgvector Extension
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Table: conversation_logs
```sql
CREATE TABLE conversation_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      TEXT NOT NULL,
  customer_id     TEXT,
  question        TEXT NOT NULL,
  response        TEXT NOT NULL,
  context_used    TEXT,
  confidence      TEXT CHECK (confidence IN ('high', 'low', 'escalated')),
  escalated       BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT,
  topic           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast session lookups
CREATE INDEX idx_conversation_logs_session ON conversation_logs(session_id);
CREATE INDEX idx_conversation_logs_customer ON conversation_logs(customer_id);
CREATE INDEX idx_conversation_logs_created ON conversation_logs(created_at DESC);
```

### Table: agent_memory
```sql
CREATE TABLE agent_memory (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id           TEXT UNIQUE NOT NULL,
  last_issue            TEXT,
  last_topic            TEXT,
  last_interaction_date TIMESTAMPTZ,
  interaction_count     INTEGER DEFAULT 1,
  escalation_count      INTEGER DEFAULT 0,
  notes                 TEXT,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast customer lookup
CREATE INDEX idx_agent_memory_customer ON agent_memory(customer_id);
```

### Row Level Security (apply after creation)
```sql
-- Enable RLS on both tables
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by n8n)
CREATE POLICY "Service role full access - logs"
  ON conversation_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - memory"
  ON agent_memory FOR ALL
  USING (auth.role() = 'service_role');
```

---

## 6. N8N WORKFLOW STRUCTURE

### Workflow Name
`RelayPay Support Agent - Main Flow`

### Node-by-Node Specification

#### Node 1 — Webhook Trigger
```
Type: Webhook
HTTP Method: POST
Path: /relaypay-support
Response Mode: Last Node
Authentication: Header Auth (shared secret)
```
Expected incoming payload from VAPI:
```json
{
  "call": { "id": "call_abc123" },
  "message": {
    "type": "transcript",
    "role": "user",
    "transcript": "How long do payouts take?"
  }
}
```

#### Node 2 — Extract Question
```
Type: Set
Purpose: Parse and clean the user question from the VAPI payload
Fields to set:
  - question: {{ $json.message.transcript }}
  - session_id: {{ $json.call.id }}
  - customer_id: {{ $json.call.customer?.number ?? "anonymous" }}
```

#### Node 3 — Query Notion Knowledge Base
```
Type: HTTP Request (or Notion node)
Purpose: Search Notion for relevant content
Method: POST
URL: https://api.notion.com/v1/search
Headers:
  Authorization: Bearer [NOTION_TOKEN]
  Notion-Version: 2022-06-28
Body:
  { "query": "{{ $json.question }}", "filter": { "value": "page", "property": "object" } }
```

#### Node 4 — Confidence Evaluator
```
Type: Code (JavaScript)
Purpose: Determine if retrieved content is sufficient to answer
Logic:
  - If Notion returned 0 results → confidence = "low"
  - If question contains sensitive keywords → confidence = "escalated"
  - If results found and no sensitive keywords → confidence = "high"
Output: { confidence: "high" | "low" | "escalated", context: "..." }
```

#### Node 5 — IF Branch
```
Type: IF
Condition: {{ $json.confidence }} == "high"
True branch → Node 6 (Generate Response)
False branch → Node 7 (Escalation)
```

#### Node 6 — Generate Response (Claude)
```
Type: HTTP Request
Method: POST
URL: https://api.anthropic.com/v1/messages
Headers:
  x-api-key: [ANTHROPIC_API_KEY]
  anthropic-version: 2023-06-01
Body:
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 300,
  "system": "[VAPI system prompt from Section 4]",
  "messages": [{
    "role": "user",
    "content": "Context from knowledge base:\n{{ $json.context }}\n\nCustomer question: {{ $json.question }}"
  }]
}
```

#### Node 6b — Return Response to VAPI
```
Type: Respond to Webhook
Body:
{
  "response": "{{ $json.content[0].text }}"
}
```

#### Node 7 — Escalation Handler
```
Type: HTTP Request (Slack webhook) or Send Email
Purpose: Notify human support team
Message template: See escalation template in Section 4
```

#### Node 8 — Log to Supabase
```
Type: HTTP Request
Method: POST
URL: https://[SUPABASE_URL]/rest/v1/conversation_logs
Headers:
  apikey: [SUPABASE_SERVICE_KEY]
  Authorization: Bearer [SUPABASE_SERVICE_KEY]
  Content-Type: application/json
  Prefer: return=minimal
Body:
{
  "session_id": "{{ $('Extract Question').item.json.session_id }}",
  "customer_id": "{{ $('Extract Question').item.json.customer_id }}",
  "question": "{{ $('Extract Question').item.json.question }}",
  "response": "{{ $json.response ?? 'Escalated to human agent' }}",
  "confidence": "{{ $('Confidence Evaluator').item.json.confidence }}",
  "escalated": {{ $('Confidence Evaluator').item.json.confidence !== 'high' }},
  "created_at": "{{ new Date().toISOString() }}"
}
```

---

## 7. VAPI CONFIGURATION INSTRUCTIONS

### Assistant Settings
```json
{
  "name": "RelayPay Support Agent",
  "model": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "temperature": 0.3,
    "systemPrompt": "[Full system prompt from Section 4]"
  },
  "voice": {
    "provider": "11labs",
    "voiceId": "professional-neutral",
    "stability": 0.75,
    "similarityBoost": 0.75
  },
  "firstMessage": "Hello, you've reached RelayPay support. How can I help you today?",
  "endCallMessage": "Thank you for contacting RelayPay. Have a great day.",
  "endCallPhrases": ["goodbye", "that's all", "thanks bye", "no more questions"],
  "silenceTimeoutSeconds": 30,
  "maxDurationSeconds": 600,
  "serverUrl": "[N8N_WEBHOOK_URL]",
  "serverUrlSecret": "[SHARED_SECRET]"
}
```

### Knowledge Base Files to Upload to VAPI
Upload one plain text file per topic:
1. `kb-onboarding.txt`
2. `kb-pricing-fees.txt`
3. `kb-payout-timelines.txt`
4. `kb-failed-transactions.txt`
5. `kb-invoicing.txt`
6. `kb-compliance.txt`

Source each file from the corresponding Notion page using the Notion MCP.

### VAPI Web SDK Integration (frontend/app.js)
```javascript
import Vapi from "https://cdn.jsdelivr.net/npm/@vapi-ai/web/dist/vapi.mjs";

const vapi = new Vapi("YOUR_VAPI_PUBLIC_KEY");
const ASSISTANT_ID = "YOUR_ASSISTANT_ID";

const btn = document.getElementById("voice-btn");
const statusText = document.getElementById("status");
const transcript = document.getElementById("transcript");

let isCallActive = false;

btn.addEventListener("click", async () => {
  if (!isCallActive) {
    await vapi.start(ASSISTANT_ID);
  } else {
    vapi.stop();
  }
});

vapi.on("call-start", () => {
  isCallActive = true;
  btn.classList.add("active");
  statusText.textContent = "Listening...";
});

vapi.on("speech-start", () => {
  statusText.textContent = "Agent is speaking...";
});

vapi.on("message", (msg) => {
  if (msg.type === "transcript" && msg.role === "user") {
    transcript.innerHTML += `<p class="user-msg">${msg.transcript}</p>`;
  }
  if (msg.type === "transcript" && msg.role === "assistant") {
    transcript.innerHTML += `<p class="agent-msg">${msg.transcript}</p>`;
  }
});

vapi.on("call-end", () => {
  isCallActive = false;
  btn.classList.remove("active");
  statusText.textContent = "Press to speak";
});

vapi.on("error", (err) => {
  console.error("VAPI error:", err);
  statusText.textContent = "Something went wrong. Please try again.";
  btn.classList.remove("active");
  isCallActive = false;
});
```

---

## 8. WEBPAGE DESIGN & DEPLOYMENT INSTRUCTIONS

### Brand Specifications
```css
/* RelayPay Brand Tokens */
--color-primary: #0A1628;      /* Deep navy - main background */
--color-accent: #00C896;       /* Emerald green - buttons, highlights */
--color-surface: #FFFFFF;      /* White - card backgrounds */
--color-text: #1A1A2E;         /* Near black - body text */
--color-muted: #6B7280;        /* Grey - secondary text */
--font-family: 'Inter', sans-serif;
--border-radius: 12px;
--shadow: 0 4px 24px rgba(0,0,0,0.12);
```

### Page Structure (index.html)
```
Header: RelayPay logo + "Support" label
Hero: "How can we help you today?" heading
Voice Interface:
  - Large circular button (80px diameter minimum)
  - Animated pulse ring when active
  - Status label below button
Transcript Panel:
  - Scrollable conversation display
  - User messages right-aligned
  - Agent messages left-aligned with RelayPay avatar
Footer: "Powered by RelayPay" + small disclaimer
```

### Deployment Steps (GitHub Pages)
1. Use GitHub MCP to push `frontend/` contents to `main` branch
2. Go to repository Settings → Pages
3. Set source: Deploy from branch → `main` → `/frontend`
4. Wait 2-3 minutes for deployment
5. Live URL format: `https://EvanOrunto.github.io/relaypay-support-agent/`

### Environment Variables (.env.example)
```bash
# VAPI
VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_ASSISTANT_ID=your_assistant_id

# n8n
N8N_WEBHOOK_URL=https://cohort2pod3.app.n8n.cloud/webhook/relaypay-support
N8N_WEBHOOK_SECRET=your_shared_secret

# Supabase
SUPABASE_URL=https://lgcokylcrzprpdnndhlk.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Notion
NOTION_TOKEN=your_notion_token

# Anthropic (used inside n8n)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

---

## 9. HOW ALL PIECES CONNECT END TO END

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOMER JOURNEY                            │
│                                                                 │
│  Browser (GitHub Pages)                                         │
│       │                                                         │
│       │  presses microphone button                              │
│       ▼                                                         │
│  VAPI Web SDK ──── captures voice ────► VAPI Platform           │
│                                              │                  │
│                                    transcribes & sends          │
│                                    message to webhook           │
│                                              │                  │
│                                              ▼                  │
│                                    n8n Webhook Trigger          │
│                                              │                  │
│                            ┌─────────────────┤                  │
│                            │                 │                  │
│                     Query Notion          Extract               │
│                     Knowledge Base        Question              │
│                            │                                    │
│                      Confidence                                 │
│                      Evaluator                                  │
│                      /        \                                 │
│               HIGH /            \ LOW / SENSITIVE               │
│                   /              \                              │
│          Generate Response     Escalate to                      │
│          via Claude API        Human Agent                      │
│                   \            (Slack/Email)                    │
│                    \              /                             │
│                     ▼            ▼                              │
│                    Log to Supabase                              │
│                    conversation_logs                            │
│                          │                                      │
│                    Return Response                              │
│                    to VAPI Webhook                              │
│                          │                                      │
│  VAPI speaks ◄───────────┘                                      │
│  response to                                                    │
│  customer                                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary
| Step | From | To | Data |
|------|------|----|------|
| 1 | Customer | VAPI Web SDK | Voice audio |
| 2 | VAPI | n8n Webhook | Transcribed question + call ID |
| 3 | n8n | Notion API | Search query |
| 4 | Notion | n8n | Relevant page content |
| 5 | n8n | Claude API | Question + context |
| 6 | Claude | n8n | Generated response text |
| 7 | n8n | VAPI Webhook Response | Response text |
| 8 | VAPI | Customer | Spoken response |
| 9 | n8n | Supabase | Full interaction log |

---

## 10. DEFINITION OF DONE

The system is complete and production-ready when ALL of the following are true:

### Infrastructure ✓
- [ ] GitHub repository `relaypay-support-agent` created and public
- [ ] GitHub Pages live and accessible via public URL
- [ ] Supabase project active with `conversation_logs` and `agent_memory` tables created
- [ ] pgvector extension enabled on Supabase
- [ ] All 6 Notion knowledge base pages accessible via Notion MCP integration
- [ ] n8n workflow active and webhook URL is live

### VAPI Agent ✓
- [ ] VAPI assistant created with Claude as the model
- [ ] All 6 knowledge base files uploaded to VAPI
- [ ] Voice settings configured (professional, clear tone)
- [ ] Webhook connected to n8n workflow URL
- [ ] First message and end call message configured

### n8n Workflow ✓
- [ ] Webhook trigger receiving VAPI messages
- [ ] Notion query returning relevant content
- [ ] Confidence evaluator correctly routing high vs low confidence
- [ ] Claude generating grounded responses using Notion context
- [ ] Escalation notifications sending to Slack or email
- [ ] Supabase logging inserting records correctly

### Frontend ✓
- [ ] RelayPay branding applied (colors, fonts, logo)
- [ ] Microphone button starts and stops the call
- [ ] Status text updates correctly through all call states
- [ ] Transcript displays user and agent messages
- [ ] Responsive on desktop and mobile
- [ ] No console errors in browser

### End-to-End Tests ✓
- [ ] Test 1: Ask "How long do payouts take?" → agent answers from Notion → logged to Supabase
- [ ] Test 2: Ask an out-of-scope question → escalated → human team notified → logged to Supabase
- [ ] Test 3: Ask ambiguous question → agent asks clarifying question → answered on follow-up
- [ ] Test 4: Mobile browser test → full flow works on phone
- [ ] Test 5: Check Supabase tables → all 4 test interactions logged with correct fields

### Quality Bar ✓
- [ ] Agent never makes up an answer not grounded in Notion docs
- [ ] Response time from question to spoken answer is under 5 seconds
- [ ] All sensitive topics route to escalation without exception
- [ ] Page loads in under 3 seconds on a standard connection

---

*This document is the single source of truth for building the RelayPay Voice-Based Customer Support Agent. Follow the build order in Section 3 precisely. Update this document as decisions are made during the build.*

**Project:** RelayPay Voice Support Agent
**Owner:** Evan Olayinka (EvanOrunto)
**n8n Instance:** https://cohort2pod3.app.n8n.cloud/
**Supabase Project:** lgcokylcrzprpdnndhlk (Evan's AI Voice Assistant Project)
**GitHub Account:** EvanOrunto
