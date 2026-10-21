import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const minutes = Number(process.argv[2]) || 30;
const port = Number(process.env.SHARE_PORT) || 4400;
const children = [];

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

function stop(message, code = 0) {
  for (const child of children) child.kill('SIGTERM');
  if (message) console.log(`\n${message}`);
  process.exit(code);
}

process.on('SIGINT', () => stop('Sharing stopped. The link no longer works.'));
process.on('SIGTERM', () => stop());

function hasCloudflared() {
  return spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).status === 0;
}

async function waitForApi(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://localhost:${port}/api/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`The app did not start on port ${port}. Check server/.env and that MySQL is running.`);
}

function openTunnel() {
  return new Promise((resolve, reject) => {
    const tunnel = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`]);
    children.push(tunnel);
    const timer = setTimeout(() => reject(new Error('Timed out waiting for the tunnel URL.')), 30000);
    const onData = (chunk) => {
      const match = chunk.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    };
    tunnel.stdout.on('data', onData);
    tunnel.stderr.on('data', onData);
    tunnel.on('exit', (code) => reject(new Error(`cloudflared exited with code ${code}.`)));
  });
}

function startCountdown(url) {
  const expiresAt = Date.now() + minutes * 60000;
  const expiryLabel = new Date(expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  console.log(`
  ${green('●')} ${bold('LeadFlow is live')}

  ${bold(url)}

  Admin      admin@crm.test / admin123
  Sales rep  priya@crm.test / sales123
  ${dim('(the sign-in page also has one-click demo buttons)')}

  Link expires at ${bold(expiryLabel)} (${minutes} min). Press Ctrl+C to stop sharing early.
`);

  const tick = setInterval(() => {
    const left = Math.max(0, expiresAt - Date.now());
    const mm = String(Math.floor(left / 60000)).padStart(2, '0');
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
    process.stdout.write(`\r  ${dim(`Time left ${mm}:${ss}`)}  `);
    if (left === 0) {
      clearInterval(tick);
      stop('Time is up. The link has expired and the app is no longer reachable.');
    }
  }, 1000);
}

if (!hasCloudflared()) {
  console.error('cloudflared is not installed. Run: brew install cloudflared');
  process.exit(1);
}

console.log(dim('Building the app…'));
const build = spawnSync('npm', ['run', 'build', '--prefix', 'client'], { cwd: root, stdio: ['ignore', 'ignore', 'inherit'] });
if (build.status !== 0) stop('Build failed.', 1);

console.log(dim('Starting the server…'));
const server = spawn(process.execPath, ['--env-file=.env', 'src/index.js'], {
  cwd: `${root}/server`,
  env: { ...process.env, PORT: String(port), SERVE_CLIENT: 'true', NODE_ENV: 'production' },
  stdio: ['ignore', 'ignore', 'inherit'],
});
children.push(server);
server.on('exit', (code) => code && stop(`The server stopped unexpectedly (exit code ${code}).`, 1));

if (process.platform === 'darwin') children.push(spawn('caffeinate', ['-i', '-w', String(process.pid)]));

try {
  await waitForApi();
  console.log(dim('Opening a secure tunnel…'));
  startCountdown(await openTunnel());
} catch (err) {
  stop(err.message, 1);
}
