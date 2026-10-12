import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * `pnpm run ble:sidecar:dev`: run the Bluetooth helper standalone on 127.0.0.1:19437 with a fresh
 * bearer token on stdin (the helper refuses to start without one). The token is never printed;
 * use the app's main-process proxy for authenticated requests.
 */

const forwardedSignals = ['SIGINT', 'SIGTERM'];

export function superviseChild(child, hostProcess = process) {
  const forwarders = new Map();
  const removeForwarders = () => {
    for (const [signal, forward] of forwarders) {
      hostProcess.removeListener(signal, forward);
    }
  };

  for (const signal of forwardedSignals) {
    const forward = () => child.kill(signal);
    forwarders.set(signal, forward);
    hostProcess.on(signal, forward);
  }

  child.once('exit', (code, signal) => {
    removeForwarders();
    if (signal) {
      hostProcess.kill(hostProcess.pid, signal);
      return;
    }
    hostProcess.exitCode = code ?? 1;
  });
}

export function createHelperAuthToken() {
  return randomBytes(32).toString('base64url');
}

export function run() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const authToken = createHelperAuthToken();
  const child = spawn(
    'cargo',
    ['run', '--features', 'gatt-ble', '--', '--headless', '--port', '19437'],
    {
      cwd: join(root, 'ble-sidecar'),
      stdio: ['pipe', 'inherit', 'inherit'],
    },
  );

  child.stdin.on('error', () => {
    // The child reports its own startup failure; never log the credential or pipe payload.
  });
  child.stdin.end(`${authToken}\n`);
  superviseChild(child);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
