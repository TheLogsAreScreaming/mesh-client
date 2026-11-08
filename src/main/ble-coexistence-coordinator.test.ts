import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BleCoexistenceCoordinator } from './ble-coexistence-coordinator';
import type { GattSessionProfile, GattSidecarProxy } from './gatt-sidecar-proxy';

function gattReservations(connections: ReturnType<GattSidecarProxy['getConnections']>) {
  return {
    getConnections: () => connections,
    setConnectionGuard:
      vi.fn<(guard: (session: GattSessionProfile, address: string) => void) => void>(),
  };
}

describe('BleCoexistenceCoordinator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects same MAC for two owners', () => {
    const coordinator = new BleCoexistenceCoordinator();
    coordinator.register('AA:BB:CC:DD:EE:01', 'gatt:meshtastic');
    expect(() => {
      coordinator.register('AA:BB:CC:DD:EE:01', 'gatt:meshcore');
    }).toThrow(/already in use/);
  });

  it('allows different MACs for meshtastic and meshcore', () => {
    const coordinator = new BleCoexistenceCoordinator();
    coordinator.register('AA:BB:CC:DD:EE:01', 'gatt:meshtastic');
    coordinator.register('AA:BB:CC:DD:EE:02', 'gatt:meshcore');
    const state = coordinator.getState();
    expect(state.connections).toEqual(
      expect.arrayContaining([
        { mac: 'aa:bb:cc:dd:ee:01', owner: 'gatt:meshtastic' },
        { mac: 'aa:bb:cc:dd:ee:02', owner: 'gatt:meshcore' },
      ]),
    );
  });

  it('rejects a LoRa connect to a MAC registered by the other LoRa stack', () => {
    const coordinator = new BleCoexistenceCoordinator();
    const gatt = gattReservations([]);
    coordinator.setGattProxy(gatt);
    coordinator.register('AA:BB:CC:DD:EE:01', 'gatt:meshtastic');

    const guard = gatt.setConnectionGuard.mock.calls[0]?.[0];
    expect(guard).toBeDefined();
    expect(() => {
      guard('meshcore', 'aabbccddee01');
    }).toThrow(/already in use by gatt:meshtastic/);
    expect(() => {
      guard('meshcore', 'AA:BB:CC:DD:EE:02');
    }).not.toThrow();
  });

  it('rejects registration while another LoRa connection is pending on that MAC', () => {
    const coordinator = new BleCoexistenceCoordinator();
    const connections: ReturnType<GattSidecarProxy['getConnections']> = [
      { mac: 'AA:BB:CC:DD:EE:01', owner: 'gatt:meshcore' },
    ];
    coordinator.setGattProxy(gattReservations(connections));

    expect(() => {
      coordinator.register('aabbccddee01', 'gatt:meshtastic');
    }).toThrow(/already in use by gatt:meshcore/);
    connections.length = 0;
    expect(() => {
      coordinator.register('aabbccddee01', 'gatt:meshtastic');
    }).not.toThrow();
  });

  it('reports live LoRa reservations together with registered owners', () => {
    const coordinator = new BleCoexistenceCoordinator();
    coordinator.setGattProxy(
      gattReservations([{ mac: 'AA:BB:CC:DD:EE:01', owner: 'gatt:meshtastic' }]),
    );
    coordinator.register('AA:BB:CC:DD:EE:02', 'gatt:meshcore');

    expect(coordinator.getState().connections).toEqual(
      expect.arrayContaining([
        { mac: 'aa:bb:cc:dd:ee:01', owner: 'gatt:meshtastic' },
        { mac: 'aa:bb:cc:dd:ee:02', owner: 'gatt:meshcore' },
      ]),
    );
  });

  it('releases nested GATT scan leases only when the outermost one ends', async () => {
    const coordinator = new BleCoexistenceCoordinator();
    await coordinator.acquireScan('gatt');
    await coordinator.acquireScan('gatt');
    coordinator.releaseScan('gatt');
    expect(coordinator.getState().scanOwner).toBe('gatt');
    coordinator.releaseScan('gatt');
    expect(coordinator.getState().scanOwner).toBeNull();
  });

  it.each([false, true])(
    'releases the GATT scan lease after completion (failure=%s)',
    async (fails) => {
      const coordinator = new BleCoexistenceCoordinator();
      const operation = coordinator.withScan('gatt', () => {
        expect(coordinator.getState().scanOwner).toBe('gatt');
        if (fails) return Promise.reject(new Error('adapter unavailable'));
        return Promise.resolve('done');
      });
      if (fails) await expect(operation).rejects.toThrow('adapter unavailable');
      else await expect(operation).resolves.toBe('done');
      expect(coordinator.getState().scanOwner).toBeNull();
    },
  );
});
