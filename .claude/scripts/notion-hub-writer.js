#!/usr/bin/env node
/**
 * NUS-88: Notion Hub Writer
 * Reads ENGINE_NAME and DOPPLER_PROJECT dynamically from CLAUDE.md REPO IDENTITY block.
 * Pulls NOTION_INTEGRATION_TOKEN from Doppler.
 * Overwrites Global Brain Hub page with fresh session summary (hard cap: 600 tokens).
 *
 * Usage: node notion-hub-writer.js <repo-root>
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { Buffer } = require('node:buffer');

const GLOBAL_HUB_PAGE_ID = '338663704e40814aaa92fd7293923e4f';
const TOKEN_ESTIMATE = text => Math.ceil(text.split(/\s+/).length * 1.3);

// --- Read CLAUDE.md for REPO IDENTITY block ---
function readRepoIdentity(repoRoot) {
  const claudeMdPath = path.join(repoRoot, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) {
    throw new Error(`CLAUDE.md not found at ${claudeMdPath}`);
  }
  const content = fs.readFileSync(claudeMdPath, 'utf8');
  const engineMatch = content.match(/ENGINE_NAME[=:\s]+([^\n\r]+)/);
  const dopplerMatch = content.match(/DOPPLER_PROJECT[=:\s]+([^\n\r]+)/);
  return {
    engineName: engineMatch ? engineMatch[1].trim() : 'unknown-engine',
    dopplerProject: dopplerMatch ? dopplerMatch[1].trim() : 'nustack-agency-engine',
  };
}

// --- Get NOTION_INTEGRATION_TOKEN from Doppler ---
function getNotionToken(dopplerProject) {
  try {
    const result = execSync(
      `doppler secrets get NOTION_INTEGRATION_TOKEN --project ${dopplerProject} --config prd --plain`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
    return result;
  } catch {
    // Fallback: try env var
    if (process.env.NOTION_INTEGRATION_TOKEN) {
      return process.env.NOTION_INTEGRATION_TOKEN;
    }
    throw new Error(`NOTION_INTEGRATION_TOKEN not found in Doppler project ${dopplerProject}`);
  }
}

// --- Get recent git commits ---
function getRecentCommits(repoRoot, count = 4) {
  try {
    return execSync(`git -C "${repoRoot}" log --oneline -${count}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '(no commits found)';
  }
}

// --- Notion API: overwrite page content ---
function notionApiCall(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.notion.com',
      port: 443,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

async function main() {
  const repoRoot = process.argv[2] || process.cwd();

  let engineName, dopplerProject;
  try {
    ({ engineName, dopplerProject } = readRepoIdentity(repoRoot));
  } catch (e) {
    console.error(`[hub-writer] ${e.message}`);
    process.exit(0); // non-fatal
  }

  let token;
  try {
    token = getNotionToken(dopplerProject);
  } catch (e) {
    console.error(`[hub-writer] ${e.message}`);
    process.exit(0); // non-fatal
  }

  const commits = getRecentCommits(repoRoot);
  const now = new Date().toISOString();

  // Spoke page IDs (static — CA-owned, CC reads only)
  const spokeTable = [
    ['Decisions Registry', '338663704e408144a51fd8d9df2a5ec8'],
    ['Agent Inbox', '32f663704e4081f3ac93e81a3782412a'],
    ['Agency Engine Bible v5.1', '331663704e4081d9a29ecd1185f86f59'],
    ['Marketing Engine Blueprint', '338663704e408140acc4e0cafb4f1906'],
    ['Changelog Spoke', '339663704e408168be48dd9d420d7881'],
    ['CC Build Results DB', '71a68629-8b6f-4e70-97f5-3dc6134628e9'],
    ['Global Sheet Spec', '339663704e4081028cb2f491b0982595'],
    ['Global Hub Page', GLOBAL_HUB_PAGE_ID],
  ].map(([name, id]) => `  ${name}: ${id}`).join('\n');

  let content = `LAST WRITTEN: ${now} | engine: ${engineName}

LAST SESSION:
  engine: ${engineName}
  date: ${now.split('T')[0]}

RECENT COMMITS (last 4):
${commits.split('\n').slice(0, 4).map(l => `  ${l}`).join('\n')}

KEY PAGE IDs — SPOKES:
${spokeTable}`;

  // Enforce 600 token cap
  let tokens = TOKEN_ESTIMATE(content);
  if (tokens > 600) {
    // Trim commits to last 2
    const shortCommits = commits.split('\n').slice(0, 2).map(l => `  ${l}`).join('\n');
    content = content.replace(
      /RECENT COMMITS \(last 4\):[\s\S]*?KEY PAGE IDs/,
      `RECENT COMMITS (last 2):\n${shortCommits}\n\nKEY PAGE IDs`,
    );
    tokens = TOKEN_ESTIMATE(content);
  }
  if (tokens > 600) {
    // Shorten session summary to 1 line
    content = content.replace(
      /LAST SESSION:[\s\S]*?RECENT COMMITS/,
      `LAST SESSION: ${engineName} ${now.split('T')[0]}\n\nRECENT COMMITS`,
    );
  }

  // Build Notion blocks
  const lines = content.split('\n');
  const blocks = lines.map(line => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: line } }],
    },
  }));

  // Step 1: Clear existing page content by appending (Notion doesn't support full replace via API)
  // We retrieve existing block children and delete them, then append fresh blocks
  try {
    // Get existing children
    const childrenRes = await notionApiCall(
      'GET',
      `/v1/blocks/${GLOBAL_HUB_PAGE_ID}/children?page_size=100`,
      token,
      null,
    );

    if (childrenRes.status === 200 && childrenRes.body.results) {
      // Delete each existing block
      for (const block of childrenRes.body.results) {
        await notionApiCall('DELETE', `/v1/blocks/${block.id}`, token, {});
      }
    }

    // Append fresh content
    const appendRes = await notionApiCall(
      'PATCH',
      `/v1/blocks/${GLOBAL_HUB_PAGE_ID}/children`,
      token,
      { children: blocks },
    );

    if (appendRes.status === 200) {
      process.stdout.write(`[hub-writer] Hub updated. Engine: ${engineName}. Tokens: ~${tokens}.\n`);
    } else {
      process.stderr.write(`[hub-writer] Notion API error ${appendRes.status}: ${JSON.stringify(appendRes.body).slice(0, 200)}\n`);
    }
  } catch (e) {
    process.stderr.write(`[hub-writer] Failed to write hub: ${e.message}\n`);
    process.exit(0); // non-fatal
  }
}

main().catch((e) => {
  process.stderr.write(`[hub-writer] Unhandled error: ${e.message}\n`);
  process.exit(0); // always non-fatal
});
