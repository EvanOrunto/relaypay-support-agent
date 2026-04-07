const https = require('https');
const fs = require('fs');

// Load from environment — run: source .env && node patch-supabase-nodes.js
const API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'k5mJY6hHCqvHl0xl';
const BASE = 'cohort2pod3.app.n8n.cloud';

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: BASE,
      path: `/api/v1${path}`,
      method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(chunks.join(''))); }
        catch(e) { resolve(chunks.join('')); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

async function main() {
  console.log('1. Fetching workflow...');
  const wf = await apiCall('GET', `/workflows/${WORKFLOW_ID}`);
  console.log('   Active:', wf.active, '| Nodes:', wf.nodes && wf.nodes.length);

  console.log('2. Patching Supabase nodes...');
  wf.nodes = wf.nodes.map(n => {
    if (n.name === 'Log to Supabase') {
      n.parameters.specifyBody = 'keypair';
      delete n.parameters.body;
      n.parameters.bodyParameters = { parameters: supabaseLogFields };
      console.log('   Fixed: Log to Supabase');
    }
    if (n.name === 'Log Skipped') {
      n.parameters.specifyBody = 'keypair';
      delete n.parameters.body;
      n.parameters.bodyParameters = { parameters: supabaseSkippedFields };
      console.log('   Fixed: Log Skipped');
    }
    return n;
  });

  console.log('3. Deactivating...');
  await apiCall('POST', `/workflows/${WORKFLOW_ID}/deactivate`);
  await sleep(1000);

  console.log('4. Saving updated workflow...');
  const putBody = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: { executionOrder: 'v1' },
    staticData: null
  };
  const updated = await apiCall('PUT', `/workflows/${WORKFLOW_ID}`, putBody);
  if (!updated.id) {
    console.error('PUT failed:', JSON.stringify(updated).slice(0, 300));
    process.exit(1);
  }

  console.log('5. Reactivating...');
  await sleep(1500);
  const activated = await apiCall('POST', `/workflows/${WORKFLOW_ID}/activate`);
  console.log('   Active:', activated.active);

  console.log('\n=== PATCH COMPLETE ===');
  console.log('Workflow ID:', WORKFLOW_ID, '(unchanged — webhook stays registered)');
}

main().catch(console.error);
