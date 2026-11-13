// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_POWER_SAVE_MODE,
  normalizePowerSaveLinkType,
  type PowerSaveConnectionSnapshot,
  powerSaveModeFromStored,
  shouldHoldPowerSaveBlocker,
} from './powerSavePolicy';

function snap(partial: Partial<PowerSaveConnectionSnapshot> = {}): PowerSaveConnectionSnapshot {
  return {
    meshtastic: { connected: false, link: null },
    meshcore: { connected: false, link: null },
    mqtt: false,
    ...partial,
  };
}

describe('powerSaveModeFromStored', () => {
  it.each([undefined, null, '', '1', '0', 'true', 'RF', 'garbage'] as const)(
    'falls back to default for %j',
    (value) => {
      expect(powerSaveModeFromStored(value)).toBe(DEFAULT_POWER_SAVE_MODE);
      expect(powerSaveModeFromStored(value)).toBe('rf');
    },
  );

  it.each(['off', 'rf', 'always'] as const)('round-trips %j', (mode) => {
    expect(powerSaveModeFromStored(mode)).toBe(mode);
  });
});

describe('normalizePowerSaveLinkType', () => {
  it.each(['ble', 'serial', 'tcp', 'http'] as const)('accepts %j', (link) => {
    expect(normalizePowerSaveLinkType(link)).toBe(link);
  });

  it.each(['BLE', '', null, 42, {}, 'wifi'] as const)('rejects %j', (value) => {
    expect(normalizePowerSaveLinkType(value)).toBeNull();
  });
});

describe('shouldHoldPowerSaveBlocker', () => {
  it('rf holds for Meshtastic ble and MeshCore serial', () => {
    expect(
      shouldHoldPowerSaveBlocker('rf', snap({ meshtastic: { connected: true, link: 'ble' } })),
    ).toBe(true);
    expect(
      shouldHoldPowerSaveBlocker('rf', snap({ meshcore: { connected: true, link: 'serial' } })),
    ).toBe(true);
  });

  it('rf holds when connected with unknown link (conservative)', () => {
    expect(
      shouldHoldPowerSaveBlocker('rf', snap({ meshtastic: { connected: true, link: null } })),
    ).toBe(true);
  });

  it('rf ignores stale link when disconnected', () => {
    expect(
      shouldHoldPowerSaveBlocker('rf', snap({ meshtastic: { connected: false, link: 'ble' } })),
    ).toBe(false);
  });
});
