const fs = require('fs');

// Load from environment — run: source .env && node build-workflow.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;

const SYSTEM_PROMPT = [
  'You are a professional customer support agent for RelayPay — a cross-border payments and invoicing platform for African startups and SMEs.',
  '',
  'Your job is to answer customer questions clearly and accurately.',
  '',
  'Rules you must follow:',
  '1. Only answer questions about: onboarding, pricing and fees, payout timelines, failed or delayed transactions, invoicing, and compliance requirements.',
  '2. For onboarding: RelayPay requires business registration documents, proof of identity for directors, and proof of address. Verification timelines vary by jurisdiction.',
  '3. For pricing: Fees vary by corridor and payment method. All fees are shown before confirming a transaction. Exchange rates fluctuate and are locked at confirmation.',
  '4. For payout timelines: Local payouts take 1-2 business days. International payouts take 2-5 business days. RelayPay does not support instant international payments.',
  '5. For failed transactions: Common causes include incorrect beneficiary details, compliance holds, or banking partner issues. Funds are returned if a transaction fails.',
  '6. For invoicing: RelayPay supports multi-currency invoicing in any currency. Invoices track draft, sent, and paid status. Payment collection depends on the payer.',
  '7. For compliance: RelayPay follows AML, KYC, and KYB requirements. Account restrictions are precautionary and lifted after review.',
  '8. Never make up information. If you are not sure, say: "I want to make sure I give you accurate information. Let me connect you with a member of our team."',
  '9. If a question is unclear, ask one specific clarifying question.',
  '10. Always sound professional, calm, and trustworthy.',
  '11. Keep responses concise — no longer than 3-4 sentences for voice.',
  '12. Always end sensitive topics with: "Would you like me to connect you with our support team for further assistance?"',
  '',
  'You represent RelayPay. Every response reflects on the brand.'
].join('\n');

const validateSecretCode = [
  'const headers = $input.first().json.headers || {};',
  'const secret = headers["x-vapi-secret"] || "";',
  'const expectedSecret = "' + WEBHOOK_SECRET + '";',
  'return [{ json: { authorized: secret === expectedSecret, body: $input.first().json.body || {} } }];'
].join('\n');

const validateInputCode = [
  'const body = $input.first().json.body || {};',
  'const message = body.message || {};',
  'const call = body.call || {};',
  'const sessionId = call.id || ("fallback_" + Date.now());',
  'const customerId = (call.customer && call.customer.number) ? call.customer.number : "anonymous";',
  'if (message.type !== "transcript") {',
  '  return [{ json: { is_valid: false, skip_reason: "not_transcript", response: null, session_id: sessionId, customer_id: customerId, question: "" } }];',
  '}',
  'if (message.role !== "user") {',
  '  return [{ json: { is_valid: false, skip_reason: "assistant_echo", response: null, session_id: sessionId, customer_id: customerId, question: "" } }];',
  '}',
  'const transcript = (message.transcript || "").trim();',
  'if (!transcript || transcript.length < 3) {',
  '  return [{ json: { is_valid: false, skip_reason: "empty_or_short", response: "I\'m sorry, I didn\'t quite catch that. Could you please repeat your question?", session_id: sessionId, customer_id: customerId, question: transcript } }];',
  '}',
  'return [{ json: { is_valid: true, skip_reason: null, question: transcript, session_id: sessionId, customer_id: customerId, response: null } }];'
].join('\n');

const confidenceEvalCode = [
  'const item = $input.first().json;',
  'const question = item.question.toLowerCase();',
  'const SENSITIVE = ["dispute","fraud","legal","suspend","compliance violation","stolen","chargeback","unauthorized","account blocked","refund"];',
  'let keyword_matched = null;',
  'for (const kw of SENSITIVE) { if (question.includes(kw)) { keyword_matched = kw; break; } }',
  'if (keyword_matched) {',
  '  return [{ json: { confidence: "escalated", keyword_matched, question: item.question, session_id: item.session_id, customer_id: item.customer_id, vague: false } }];',
  '}',
  'const wordCount = item.question.trim().split(/\\s+/).filter(w => w.length > 0).length;',
  'if (wordCount < 4) {',
  '  return [{ json: { confidence: "low", keyword_matched: null, vague: true, question: item.question, session_id: item.session_id, customer_id: item.customer_id } }];',
  '}',
  'return [{ json: { confidence: "high", keyword_matched: null, vague: false, question: item.question, session_id: item.session_id, customer_id: item.customer_id } }];'
].join('\n');

const buildResponseHighCode = [
  'const openaiOutput = $input.first().json;',
  'const ctx = $("Confidence Evaluator").item.json;',
  '// Native OpenAI node returns output[0].content[0].text',
  'const text = openaiOutput.output && openaiOutput.output[0] && openaiOutput.output[0].content && openaiOutput.output[0].content[0] && openaiOutput.output[0].content[0].text;',
  'if (!text) {',
  '  return [{ json: { session_id: ctx.session_id, customer_id: ctx.customer_id, question: ctx.question, confidence: "escalated", keyword_matched: null, response: "I\'m having trouble retrieving that information right now. Let me connect you with our support team.", escalated: true, escalation_reason: "openai_api_error", escalation_notified: false, } }];',
  '}',
  'return [{ json: { session_id: ctx.session_id, customer_id: ctx.customer_id, question: ctx.question, confidence: "high", keyword_matched: null, response: text, escalated: false, escalation_reason: null, escalation_notified: false, } }];'
].join('\n');

const buildResponseLowCode = [
  'const ctx = $("Confidence Evaluator").item.json;',
  'const response = ctx.vague',
  '  ? "Could you give me a bit more detail about your question? For example, are you asking about payments, invoicing, or account setup?"',
  '  : "I don\'t have specific information on that in our documentation. Let me connect you with a member of our support team who can help.";',
  'return [{ json: { session_id: ctx.session_id, customer_id: ctx.customer_id, question: ctx.question, confidence: "low", keyword_matched: null, response, escalated: true, escalation_reason: "no_knowledge_match", escalation_notified: false, } }];'
].join('\n');

const buildResponseEscalatedCode = [
  'const gmailOutput = $input.first().json;',
  'const ctx = $("Confidence Evaluator").item.json;',
  'const escalationNotified = !(gmailOutput.error);',
  'return [{ json: { session_id: ctx.session_id, customer_id: ctx.customer_id, question: ctx.question, confidence: "escalated", keyword_matched: ctx.keyword_matched, response: "I\'m connecting you with our support team now. Someone will follow up with you shortly.", escalated: true, escalation_reason: ctx.keyword_matched ? ("sensitive_keyword: " + ctx.keyword_matched) : "sensitive_topic", escalation_notified: escalationNotified, } }];'
].join('\n');

const supabaseHeaders = [
  { name: 'apikey', value: SUPABASE_KEY },
  { name: 'Authorization', value: 'Bearer ' + SUPABASE_KEY },
  { name: 'Content-Type', value: 'application/json' },
  { name: 'Prefer', value: 'return=minimal' }
];

// Use jsonOutput mode - send as proper JSON fields, no stringify double-encoding
const supabaseLogFields = [
  { name: 'session_id', value: '={{ $json.session_id }}' },
  { name: 'customer_id', value: '={{ $json.customer_id }}' },
  { name: 'question', value: '={{ $json.question }}' },
  { name: 'response', value: '={{ $json.response }}' },
  { name: 'confidence', value: '={{ $json.confidence }}' },
  { name: 'escalated', value: '={{ $json.escalated }}' },
  { name: 'escalation_reason', value: '={{ $json.escalation_reason || null }}' },
  { name: 'keyword_matched', value: '={{ $json.keyword_matched || null }}' },
  { name: 'escalation_notified', value: '={{ $json.escalation_notified || false }}' },
  { name: 'created_at', value: '={{ new Date().toISOString() }}' }
];

const supabaseSkippedFields = [
  { name: 'session_id', value: '={{ $json.session_id }}' },
  { name: 'customer_id', value: '={{ $json.customer_id }}' },
  { name: 'question', value: '={{ $json.question || "" }}' },
  { name: 'response', value: '={{ $json.response || "" }}' },
  { name: 'confidence', value: 'skipped' },
  { name: 'escalated', value: '={{ false }}' },
  { name: 'escalation_reason', value: '={{ $json.skip_reason || null }}' },
  { name: 'keyword_matched', value: '={{ null }}' },
  { name: 'escalation_notified', value: '={{ false }}' },
  { name: 'created_at', value: '={{ new Date().toISOString() }}' }
];

const gmailMessage = '={{ "Relaypay Support Escalation\\n\\nCustomer Question: " + $json.question + "\\nReason: " + ($json.keyword_matched ? "Sensitive keyword: " + $json.keyword_matched : "Sensitive topic") + "\\nSession ID: " + $json.session_id + "\\nTimestamp: " + new Date().toISOString() + "\\n\\nPlease follow up with this customer directly." }}';

const workflow = {
  name: "RelayPay Support Agent - Main Flow",
  nodes: [
    {
      id: "node-01", name: "VAPI Webhook",
      type: "n8n-nodes-base.webhook", typeVersion: 2,
      position: [240, 300],
      parameters: { httpMethod: "POST", path: "relaypay-support", responseMode: "responseNode", options: {} }
    },
    {
      id: "node-02", name: "Validate Secret",
      type: "n8n-nodes-base.code", typeVersion: 2,
      position: [480, 300],
      parameters: { jsCode: validateSecretCode }
    },
    {
      id: "node-03", name: "Auth Check",
      type: "n8n-nodes-base.if", typeVersion: 2,
      position: [720, 300],
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{ id: "c1", leftValue: "={{ $json.authorized }}", rightValue: true, operator: { type: "boolean", operation: "equals" } }],
          combinator: "and"
        },
        options: {}
      }
    },
    {
      id: "node-04", name: "Reject 401",
      type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1,
      position: [960, 100],
      parameters: { respondWith: "json", responseBody: '{"error":"Unauthorized"}', options: { responseCode: 401 } }
    },
    {
      id: "node-05", name: "Validate Input",
      type: "n8n-nodes-base.code", typeVersion: 2,
      position: [960, 420],
      parameters: { jsCode: validateInputCode }
    },
    {
      id: "node-06", name: "Input Valid Check",
      type: "n8n-nodes-base.if", typeVersion: 2,
      position: [1200, 420],
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{ id: "c2", leftValue: "={{ $json.is_valid }}", rightValue: true, operator: { type: "boolean", operation: "equals" } }],
          combinator: "and"
        },
        options: {}
      }
    },
    {
      id: "node-07", name: "Respond Early",
      type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1,
      position: [1440, 220],
      parameters: { respondWith: "json", responseBody: '={{ JSON.stringify({response: $json.response}) }}', options: { responseCode: 200 } }
    },
    {
      id: "node-08", name: "Log Skipped",
      type: "n8n-nodes-base.httpRequest", typeVersion: 4.2,
      position: [1680, 220],
      parameters: {
        method: "POST", url: SUPABASE_URL + "/rest/v1/conversation_logs",
        sendHeaders: true, headerParameters: { parameters: supabaseHeaders },
        sendBody: true, specifyBody: "keypair",
        bodyParameters: { parameters: supabaseSkippedFields },
        options: { response: { response: { neverError: true } } }
      }
    },
    {
      id: "node-09", name: "Confidence Evaluator",
      type: "n8n-nodes-base.code", typeVersion: 2,
      position: [1440, 560],
      parameters: { jsCode: confidenceEvalCode }
    },
    {
      id: "node-10", name: "Route by Confidence",
      type: "n8n-nodes-base.switch", typeVersion: 3,
      position: [1680, 560],
      parameters: {
        mode: "rules",
        rules: {
          values: [
            { conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 }, conditions: [{ id: "s1", leftValue: "={{ $json.confidence }}", rightValue: "high", operator: { type: "string", operation: "equals" } }], combinator: "and" }, renameOutput: true, outputKey: "high" },
            { conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 }, conditions: [{ id: "s2", leftValue: "={{ $json.confidence }}", rightValue: "low", operator: { type: "string", operation: "equals" } }], combinator: "and" }, renameOutput: true, outputKey: "low" },
            { conditions: { options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 }, conditions: [{ id: "s3", leftValue: "={{ $json.confidence }}", rightValue: "escalated", operator: { type: "string", operation: "equals" } }], combinator: "and" }, renameOutput: true, outputKey: "escalated" }
          ]
        },
        fallbackOutput: "extra",
        options: {}
      }
    },
    {
      id: "node-11", name: "OpenAI Generate",
      type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 2.1,
      position: [1920, 340],
      continueOnFail: true,
      parameters: {
        modelId: { __rl: true, value: "gpt-4o", mode: "list", cachedResultName: "GPT-4O" },
        options: { maxTokens: 300, temperature: 0.3 },
        responses: {
          values: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: "={{ 'Customer question: ' + $json.question }}" }
          ]
        }
      },
      credentials: { openAiApi: { id: "K0yFMg6imH2OSMlA", name: "OpenAi account 6" } }
    },
    {
      id: "node-12", name: "Build Response High",
      type: "n8n-nodes-base.code", typeVersion: 2,
      position: [2160, 340],
      parameters: { jsCode: buildResponseHighCode }
    },
    {
      id: "node-13", name: "Build Response Low",
      type: "n8n-nodes-base.code", typeVersion: 2,
      position: [1920, 580],
      parameters: { jsCode: buildResponseLowCode }
    },
    {
      id: "node-14", name: "Escalation Email",
      type: "n8n-nodes-base.gmail", typeVersion: 2.2,
      position: [1920, 780],
      continueOnFail: true,
      parameters: {
        sendTo: "evanolayinka@gmail.com",
        subject: "={{ '🚨 RelayPay Escalation – ' + $json.session_id }}",
        message: gmailMessage,
        options: {}
      },
      credentials: { gmailOAuth2: { id: "W9wtA0NLGSmAV2mw", name: "Gmail OAuth2 API" } }
    },
    {
      id: "node-15", name: "Build Response Escalated",
      type: "n8n-nodes-base.code", typeVersion: 2,
      position: [2160, 780],
      parameters: { jsCode: buildResponseEscalatedCode }
    },
    {
      id: "node-16", name: "Respond to VAPI",
      type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1,
      position: [2400, 560],
      parameters: { respondWith: "json", responseBody: '={{ JSON.stringify({response: $json.response}) }}', options: { responseCode: 200 } }
    },
    {
      id: "node-17", name: "Log to Supabase",
      type: "n8n-nodes-base.httpRequest", typeVersion: 4.2,
      position: [2640, 560],
      parameters: {
        method: "POST", url: SUPABASE_URL + "/rest/v1/conversation_logs",
        sendHeaders: true, headerParameters: { parameters: supabaseHeaders },
        sendBody: true, specifyBody: "keypair",
        bodyParameters: { parameters: supabaseLogFields },
        options: { response: { response: { neverError: true } } }
      }
    }
  ],
  connections: {
    "VAPI Webhook":           { main: [[{ node: "Validate Secret",        type: "main", index: 0 }]] },
    "Validate Secret":        { main: [[{ node: "Auth Check",             type: "main", index: 0 }]] },
    "Auth Check":             { main: [[{ node: "Validate Input",         type: "main", index: 0 }], [{ node: "Reject 401", type: "main", index: 0 }]] },
    "Validate Input":         { main: [[{ node: "Input Valid Check",      type: "main", index: 0 }]] },
    "Input Valid Check":      { main: [[{ node: "Confidence Evaluator",   type: "main", index: 0 }], [{ node: "Respond Early", type: "main", index: 0 }]] },
    "Respond Early":          { main: [[{ node: "Log Skipped",            type: "main", index: 0 }]] },
    "Confidence Evaluator":   { main: [[{ node: "Route by Confidence",   type: "main", index: 0 }]] },
    "Route by Confidence":    { main: [[{ node: "OpenAI Generate",        type: "main", index: 0 }], [{ node: "Build Response Low", type: "main", index: 0 }], [{ node: "Escalation Email", type: "main", index: 0 }]] },
    "OpenAI Generate":        { main: [[{ node: "Build Response High",    type: "main", index: 0 }]] },
    "Build Response High":    { main: [[{ node: "Respond to VAPI",        type: "main", index: 0 }]] },
    "Build Response Low":     { main: [[{ node: "Respond to VAPI",        type: "main", index: 0 }]] },
    "Escalation Email":       { main: [[{ node: "Build Response Escalated", type: "main", index: 0 }]] },
    "Build Response Escalated": { main: [[{ node: "Respond to VAPI",     type: "main", index: 0 }]] },
    "Respond to VAPI":        { main: [[{ node: "Log to Supabase",        type: "main", index: 0 }]] }
  },
  settings: { executionOrder: "v1" },
  staticData: null
};

fs.writeFileSync('C:/Users/evany/Desktop/VAPI Agent/n8n/workflow.json', JSON.stringify(workflow, null, 2));
const stat = fs.statSync('C:/Users/evany/Desktop/VAPI Agent/n8n/workflow.json');
console.log('Nodes:', workflow.nodes.length);
console.log('File size:', stat.size, 'bytes');
console.log('DONE');
