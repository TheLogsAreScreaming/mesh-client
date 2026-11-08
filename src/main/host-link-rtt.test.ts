// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { probeHttpRttMs } from './host-link-rtt';

describe('probeHttpRttMs', () => {
  it('returns null when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))),
    );
    await expect(probeHttpRttMs('127.0.0.1', false)).resolves.toBeNull();
    vi.unstubAllGlobals();
  });

  it('returns RTT when the host answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, status: 200 } as Response)),
    );
    const rtt = await probeHttpRttMs('example.test', false);
    expect(rtt).not.toBeNull();
    expect(rtt!).toBeGreaterThanOrEqual(0);
    vi.unstubAllGlobals();
  });
});
