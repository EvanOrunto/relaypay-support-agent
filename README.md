# RelayPay Voice-Based Customer Support Agent

A production-ready voice AI agent for RelayPay — a B2B SaaS platform providing cross-border payments and invoicing tools for African startups and SMEs.

## How It Works

1. Customer visits the support webpage and presses the microphone button
2. VAPI captures and transcribes their spoken question
3. n8n workflow queries the Notion knowledge base for relevant context
4. Claude generates a grounded response (or escalates to a human agent)
5. VAPI speaks the response back to the customer
6. Every interaction is logged to Supabase

## Tech Stack

| Layer | Tool |
|-------|------|
| Voice I/O | VAPI |
| Workflow | n8n |
| Database | Supabase (PostgreSQL + pgvector) |
| Knowledge Base | Notion |
| Frontend Hosting | GitHub Pages |
| AI Brain | Claude (claude-sonnet-4-6) |

## Project Structure

```
relaypay-support-agent/
├── frontend/         # Webpage (HTML, CSS, JS)
├── n8n/              # Exported workflow JSON
├── supabase/         # SQL schema definitions
├── vapi/             # VAPI assistant config
├── docs/             # Architecture and notes
├── .env.example      # Environment variable template
└── SYSTEM_PROMPT.md  # Master build document
```

## Quick Start

See `SYSTEM_PROMPT.md` for the full build guide and `docs/architecture.md` for system design.

## Live Demo

> URL will be added after GitHub Pages deployment

## Owner

**Evan Olayinka** — [github.com/EvanOrunto](https://github.com/EvanOrunto)
