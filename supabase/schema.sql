-- ============================================================
-- RelayPay Voice Support Agent — Supabase Schema
-- Project: lgcokylcrzprpdnndhlk
-- Run this file in the Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension (for future semantic search upgrade)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Table: conversation_logs
-- Stores every interaction between customer and agent
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_logs (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id        TEXT          NOT NULL,
  customer_id       TEXT,
  question          TEXT          NOT NULL,
  response          TEXT          NOT NULL,
  context_used      TEXT,
  confidence        TEXT          CHECK (confidence IN ('high', 'low', 'escalated')),
  escalated         BOOLEAN       DEFAULT FALSE,
  escalation_reason TEXT,
  topic             TEXT,
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversation_logs_session   ON conversation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_customer  ON conversation_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created   ON conversation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_escalated ON conversation_logs(escalated);

-- ============================================================
-- Table: agent_memory
-- Stores returning customer context for personalisation
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_memory (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id           TEXT        UNIQUE NOT NULL,
  last_issue            TEXT,
  last_topic            TEXT,
  last_interaction_date TIMESTAMPTZ,
  interaction_count     INTEGER     DEFAULT 1,
  escalation_count      INTEGER     DEFAULT 0,
  notes                 TEXT,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast customer lookup
CREATE INDEX IF NOT EXISTS idx_agent_memory_customer ON agent_memory(customer_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory      ENABLE ROW LEVEL SECURITY;

-- Service role gets full access (used by n8n)
CREATE POLICY "Service role full access - logs"
  ON conversation_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - memory"
  ON agent_memory FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Helper function: upsert agent memory on each interaction
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_agent_memory(
  p_customer_id   TEXT,
  p_last_issue    TEXT,
  p_last_topic    TEXT
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO agent_memory (customer_id, last_issue, last_topic, last_interaction_date, interaction_count)
  VALUES (p_customer_id, p_last_issue, p_last_topic, NOW(), 1)
  ON CONFLICT (customer_id) DO UPDATE
    SET last_issue            = EXCLUDED.last_issue,
        last_topic            = EXCLUDED.last_topic,
        last_interaction_date = NOW(),
        interaction_count     = agent_memory.interaction_count + 1,
        updated_at            = NOW();
END;
$$;
