// One-time Google consent. Run: npm run gcal-auth
// Opens a local callback server, prints the consent URL, captures the code,
// and stores a refresh token in data/google-token.json.
import http from 'node:http';
import { URL } from 'node:url';
import { exec } from 'node:child_process';
import {
  hasCredentials, consentUrl, exchangeCode, connectedEmail,
  CREDENTIALS_PATH, TOKEN_PATH, REDIRECT_URI,
} from './google.js';

if (!hasCredentials()) {
  console.error(`\n✖ No Google credentials file at:\n  ${CREDENTIALS_PATH}\n`);
  console.error('Create an OAuth "Desktop app" client in Google Cloud Console, download the JSON,');
  console.error('and save it to that path. Full steps: SETUP_GOOGLE.md\n');
  process.exit(1);
}

const port = Number(new URL(REDIRECT_URI).port || 80);
const url = consentUrl();

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/?') && req.url !== '/' && !req.url.includes('code=')) {
    res.writeHead(404).end();
    return;
  }
  const q = new URL(req.url, REDIRECT_URI).searchParams;
  const code = q.get('code');
  const err = q.get('error');
  if (err) {
    res.writeHead(400, { 'content-type': 'text/plain' }).end(`Consent failed: ${err}`);
    console.error('\n✖ Consent failed:', err);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400).end('Missing code');
    return;
  }
  try {
    await exchangeCode(code);
    const email = await connectedEmail();
    res.writeHead(200, { 'content-type': 'text/html' }).end(
      '<h2>Google connected ✓</h2><p>You can close this tab and return to the terminal.</p>'
    );
    console.log(`\n✔ Connected${email ? ' as ' + email : ''}.`);
    console.log(`  Token saved: ${TOKEN_PATH}\n`);
  } catch (e) {
    res.writeHead(500).end('Token exchange failed: ' + e.message);
    console.error('\n✖ Token exchange failed:', e.message);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('\nOpen this URL in your browser and approve access:\n');
  console.log('  ' + url + '\n');
  console.log(`Waiting for the redirect to ${REDIRECT_URI} …\n`);
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
});
