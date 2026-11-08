// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { parseHttpProbeTarget, rttToSignalLevel } from './hostLinkQuality';

describe('rttToSignalLevel', () => {
  it('maps latency buckets to 0–4 bars', () => {
    expect(rttToSignalLevel(null)).toBe(0);
    expect(rttToSignalLevel(undefined)).toBe(0);
    expect(rttToSignalLevel(Number.NaN)).toBe(0);
    expect(rttToSignalLevel(-1)).toBe(0);
    expect(rttToSignalLevel(0)).toBe(4);
    expect(rttToSignalLevel(50)).toBe(4);
    expect(rttToSignalLevel(51)).toBe(3);
    expect(rttToSignalLevel(100)).toBe(3);
    expect(rttToSignalLevel(101)).toBe(2);
    expect(rttToSignalLevel(250)).toBe(2);
    expect(rttToSignalLevel(251)).toBe(1);
    expect(rttToSignalLevel(500)).toBe(1);
    expect(rttToSignalLevel(501)).toBe(0);
  });
});

describe('parseHttpProbeTarget', () => {
  it('parses bare host and https', () => {
    expect(parseHttpProbeTarget('meshtastic.local')).toEqual({
      urlHost: 'meshtastic.local:80',
      tls: false,
    });
    expect(parseHttpProbeTarget('https://radio.local/')).toEqual({
      urlHost: 'radio.local:443',
      tls: true,
    });
  });

  it('returns null for empty input', () => {
    expect(parseHttpProbeTarget('')).toBeNull();
    expect(parseHttpProbeTarget('   ')).toBeNull();
  });
});
