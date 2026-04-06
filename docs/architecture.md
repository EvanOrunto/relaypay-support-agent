# RelayPay Voice Support Agent — System Architecture

## High-Level Overview

```
Customer (Browser)
      │
      │  Voice Input
      ▼
VAPI Web SDK (frontend/app.js)
      │
      │  WebRTC Audio Stream
      ▼
VAPI Platform
      │  Transcription + Assistant Logic
      │  POST webhook on each user message
      ▼
n8n Webhook Trigger
(https://cohort2pod3.app.n8n.cloud/webhook/relaypay-support)
      │
      ├──► Query Notion Knowledge Base
      │         │
      │         ▼
      │    Confidence Evaluator
      │         │
      │    HIGH ├──► Claude API (generate response)
      │         │         │
      │         │         └──► Return to VAPI webhook
      │         │                   │
      │         │                   ▼
      │         │            VAPI speaks response
      │         │            to customer
      │         │
      │    LOW  └──► Escalation Handler
      │                   │
      │                   └──► Slack / Email to human team
      │
      └──► Log to Supabase (always runs, both branches)
                │
                ▼
         conversation_logs table
         agent_memory table (upsert)
```

## Component Responsibilities

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| Frontend | HTML/CSS/JS + VAPI Web SDK | Voice capture, UI, transcript display |
| Voice Platform | VAPI | Transcription, TTS, call management |
| Orchestration | n8n | Workflow routing, API calls, logging |
| Knowledge Base | Notion | Approved support documentation |
| AI Response | Claude (via Anthropic API) | Response generation from context |
| Database | Supabase PostgreSQL | Conversation logs, agent memory |
| Hosting | GitHub Pages | Static frontend deployment |

## Key Design Decisions

1. **VAPI handles all voice** — no direct WebRTC code in frontend beyond SDK calls
2. **n8n is the orchestration layer** — all business logic lives here, not in VAPI system prompt
3. **Notion is read-only source of truth** — agent never writes to Notion
4. **Supabase logs every interaction** — regardless of outcome (answered or escalated)
5. **Confidence check before Claude** — avoid hallucination by only generating when context exists

## Data Flow Timing (target)

| Step | Target Latency |
|------|---------------|
| Voice capture → transcription | ~1s |
| Webhook → Notion query | ~0.5s |
| Notion result → Claude generation | ~1.5s |
| Claude response → VAPI TTS | ~0.5s |
| **Total end-to-end** | **< 5 seconds** |

## Environment Variables Required

See `.env.example` in project root for full list.

## Deployment URLs

| Service | URL |
|---------|-----|
| Frontend (GitHub Pages) | https://EvanOrunto.github.io/relaypay-support-agent/ |
| n8n Instance | https://cohort2pod3.app.n8n.cloud/ |
| Supabase Project | https://lgcokylcrzprpdnndhlk.supabase.co |
