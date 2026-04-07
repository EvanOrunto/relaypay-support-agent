const https = require('https');
const fs = require('fs');

// Load from environment — run: source .env && node deploy-workflow.js
const API_KEY = process.env.N8N_API_KEY;
const OLD_WORKFLOW_ID = 'afbMz9jtBtj2g91z';
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
  const workflow = JSON.parse(fs.readFileSync('C:/Users/evany/Desktop/VAPI Agent/n8n/workflow.json', 'utf8'));

  console.log('1. Deactivating old workflow...');
  await apiCall('POST', `/workflows/${OLD_WORKFLOW_ID}/deactivate`);
  await sleep(1000);

  console.log('2. Deleting old workflow...');
  await apiCall('DELETE', `/workflows/${OLD_WORKFLOW_ID}`);
  await sleep(1000);

  console.log('3. Importing fresh workflow...');
  const created = await apiCall('POST', '/workflows', workflow);
  if (!created.id) {
    console.error('Import failed:', JSON.stringify(created).slice(0, 300));
    process.exit(1);
  }
  const NEW_ID = created.id;
  console.log('   New workflow ID:', NEW_ID);

  console.log('4. Activating...');
  await sleep(2000);
  const activated = await apiCall('POST', `/workflows/${NEW_ID}/activate`);
  console.log('   Active:', activated.active);

  if (!activated.active) {
    console.error('Activation failed:', JSON.stringify(activated).slice(0, 300));
    process.exit(1);
  }

  console.log('');
  console.log('=== DEPLOY COMPLETE ===');
  console.log('Workflow ID:', NEW_ID);
  console.log('Webhook URL: https://cohort2pod3.app.n8n.cloud/webhook/relaypay-support');
  console.log('Nodes:', created.nodes.length);

  // Verify nodes
  const openaiNode = created.nodes.find(n => n.name === 'OpenAI Generate');
  const gmailNode = created.nodes.find(n => n.name === 'Escalation Email');
  console.log('OpenAI node type:', openaiNode && openaiNode.type);
  console.log('Gmail node type:', gmailNode && gmailNode.type);
}

main().catch(console.error);
