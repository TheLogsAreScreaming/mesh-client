import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { probeHttpLinkRttMs, probeSessionMeter } from '../lib/hostLinkQuality';

describe('probeHttpLinkRttMs / probeSessionMeter', () => {
  beforeEach(() => {
    vi.mocked(window.electronAPI.hostLink.probeHttpRtt).mockResolvedValue(33);
    vi.mocked(window.electronAPI.hostLink.getSessionMeter).mockResolvedValue({ rttMs: 55 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('probes HTTP via parsed host/tls', async () => {
    await expect(probeHttpLinkRttMs('https://radio.local')).resolves.toBe(33);
    expect(window.electronAPI.hostLink.probeHttpRtt).toHaveBeenCalledWith('radio.local:443', true);
  });

  it('returns null for empty HTTP address', async () => {
    await expect(probeHttpLinkRttMs('')).resolves.toBeNull();
    expect(window.electronAPI.hostLink.probeHttpRtt).not.toHaveBeenCalled();
  });

  it('returns null when HTTP probe throws', async () => {
    vi.mocked(window.electronAPI.hostLink.probeHttpRtt).mockRejectedValue(new Error('boom'));
    await expect(probeHttpLinkRttMs('meshtastic.local')).resolves.toBeNull();
  });

  it('reads session meter via getSessionMeter', async () => {
    await expect(probeSessionMeter('meshtastic')).resolves.toBe(55);
    expect(window.electronAPI.hostLink.getSessionMeter).toHaveBeenCalledWith('meshtastic');
  });

  it('returns null when session meter is absent', async () => {
    vi.mocked(window.electronAPI.hostLink.getSessionMeter).mockResolvedValue(null);
    await expect(probeSessionMeter('meshcore')).resolves.toBeNull();
  });

  it('returns null when session meter throws', async () => {
    vi.mocked(window.electronAPI.hostLink.getSessionMeter).mockRejectedValue(new Error('boom'));
    await expect(probeSessionMeter('meshtastic')).resolves.toBeNull();
  });

  it('returns null when session meter rttMs is non-finite', async () => {
    vi.mocked(window.electronAPI.hostLink.getSessionMeter).mockResolvedValue({
      rttMs: Number.NaN,
    });
    await expect(probeSessionMeter('meshcore')).resolves.toBeNull();
  });
});
