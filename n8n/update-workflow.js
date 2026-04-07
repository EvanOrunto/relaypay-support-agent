const https = require('https');
const fs = require('fs');

// Load from environment — run: source .env && node update-workflow.js
const API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'TQE28cO6rropB0fW';
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

async function main() {
  const newWf = JSON.parse(fs.readFileSync('C:/Users/evany/Desktop/VAPI Agent/n8n/workflow.json', 'utf8'));

  console.log('1. Fetching current workflow...');
  const current = await apiCall('GET', `/workflows/${WORKFLOW_ID}`);
  console.log('   Current active:', current.active);

  console.log('2. Deactivating...');
  await apiCall('POST', `/workflows/${WORKFLOW_ID}/deactivate`);
  await sleep(1500);

  console.log('3. Updating nodes/connections in place (preserving workflow ID)...');
  const putBody = {
    name: newWf.name,
    nodes: newWf.nodes,
    connections: newWf.connections,
    settings: newWf.settings || { executionOrder: 'v1' },
    staticData: null
  };

  const updated = await apiCall('PUT', `/workflows/${WORKFLOW_ID}`, putBody);
  if (!updated.id) {
    console.error('PUT failed:', JSON.stringify(updated).slice(0, 300));
    process.exit(1);
  }
  console.log('   Updated. Nodes:', updated.nodes.length);

  console.log('4. Reactivating...');
  await sleep(2000);
  const activated = await apiCall('POST', `/workflows/${WORKFLOW_ID}/activate`);
  console.log('   Active:', activated.active);

  // Verify OpenAI + Gmail nodes have correct credentials
  const openaiNode = updated.nodes.find(n => n.name === 'OpenAI Generate');
  const gmailNode = updated.nodes.find(n => n.name === 'Escalation Email');
  console.log('   OpenAI cred:', openaiNode && openaiNode.credentials ? JSON.stringify(openaiNode.credentials) : 'MISSING');
  console.log('   Gmail cred:', gmailNode && gmailNode.credentials ? JSON.stringify(gmailNode.credentials) : 'MISSING');

  console.log('');
  console.log('=== UPDATE COMPLETE ===');
  console.log('Workflow ID:', WORKFLOW_ID, '(unchanged)');
  console.log('Webhook URL: https://cohort2pod3.app.n8n.cloud/webhook/relaypay-support');
}

main().catch(console.error);
