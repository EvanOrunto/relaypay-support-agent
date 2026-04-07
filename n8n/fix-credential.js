const https = require('https');

// Load from environment — run: source .env && node fix-credential.js
const API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'bnPUtZc0DQgrLgli';
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
  console.log('1. Fetching workflow...');
  const wf = await apiCall('GET', `/workflows/${WORKFLOW_ID}`);
  console.log('   Name:', wf.name, '| Active:', wf.active, '| Nodes:', wf.nodes.length);

  console.log('2. Fixing credentials...');
  wf.nodes = wf.nodes.map(n => {
    if (n.name === 'OpenAI Generate') {
      n.credentials = { openAiApi: { id: 'K0yFMg6imH2OSMlA', name: 'OpenAi account 6' } };
      console.log('   Fixed OpenAI credential on node:', n.name);
    }
    return n;
  });

  // Clean body for PUT
  const putBody = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
    staticData: wf.staticData
  };

  console.log('3. Deactivating...');
  await apiCall('POST', `/workflows/${WORKFLOW_ID}/deactivate`);
  await sleep(1000);

  console.log('4. Updating workflow with correct credentials...');
  const updated = await apiCall('PUT', `/workflows/${WORKFLOW_ID}`, putBody);
  const openaiNode = updated.nodes && updated.nodes.find(n => n.name === 'OpenAI Generate');
  console.log('   OpenAI cred after update:', openaiNode && openaiNode.credentials ? JSON.stringify(openaiNode.credentials) : 'ERROR - not found');

  console.log('5. Reactivating...');
  await sleep(1500);
  const activated = await apiCall('POST', `/workflows/${WORKFLOW_ID}/activate`);
  console.log('   Active:', activated.active);

  console.log('Done. Workflow ID:', WORKFLOW_ID);
}

main().catch(console.error);
