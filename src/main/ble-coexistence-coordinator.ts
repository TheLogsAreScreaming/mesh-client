import type { GattSidecarProxy } from './gatt-sidecar-proxy';

export type BlePeripheralOwner = 'gatt:meshtastic' | 'gatt:meshcore';

export type BleScanOwner = 'gatt';

export interface BleRegisteredConnection {
  mac: string;
  owner: BlePeripheralOwner;
}

export interface BleCoexistenceState {
  connections: BleRegisteredConnection[];
  scanOwner: BleScanOwner | null;
}

export class BlePeripheralConflictError extends Error {
  readonly mac: string;
  readonly existingOwner: BlePeripheralOwner;

  constructor(mac: string, existingOwner: BlePeripheralOwner) {
    super(`Bluetooth device ${mac} is already in use by ${existingOwner}`);
    this.name = 'BlePeripheralConflictError';
    this.mac = mac;
    this.existingOwner = existingOwner;
  }
}

export class BleScanBusyError extends Error {
  readonly scanOwner: BleScanOwner;

  constructor(scanOwner: BleScanOwner) {
    super(`Bluetooth scan in progress (${scanOwner})`);
    this.name = 'BleScanBusyError';
    this.scanOwner = scanOwner;
  }
}

import { normalizeBleMac } from '../shared/normalizeBleMac';

export { normalizeBleMac };

/**
 * Cooperative BLE coexistence: peripheral ownership registry + scan-only mutex.
 * Multiple stacks may hold GATT links to different devices simultaneously.
 */
export class BleCoexistenceCoordinator {
  private connections = new Map<string, BlePeripheralOwner>();
  private scanOwner: BleScanOwner | null = null;
  /** Nested same-owner acquires — release only at 0. */
  private scanOwnerDepth = 0;
  /** Serializes first-time acquire across concurrent callers. */
  private scanAcquireInFlight: Promise<void> | null = null;
  private gattProxy: Pick<GattSidecarProxy, 'getConnections' | 'setConnectionGuard'> | null = null;

  setGattProxy(proxy: Pick<GattSidecarProxy, 'getConnections' | 'setConnectionGuard'>): void {
    this.gattProxy = proxy;
    proxy.setConnectionGuard((sessionId, address) => {
      this.assertCanConnect(`gatt:${sessionId}`, address);
    });
  }

  getState(): BleCoexistenceState {
    const connections = new Map(this.connections);
    for (const connection of this.gattProxy?.getConnections() ?? []) {
      const key = normalizeBleMac(connection.mac);
      if (key) connections.set(key, connection.owner);
    }
    return {
      connections: [...connections.entries()].map(([mac, owner]) => ({ mac, owner })),
      scanOwner: this.scanOwner,
    };
  }

  register(mac: string, owner: BlePeripheralOwner): void {
    const key = normalizeBleMac(mac);
    if (!key) return;
    const existing = this.getState().connections.find(
      (connection) => connection.mac === key,
    )?.owner;
    if (existing && existing !== owner) {
      throw new BlePeripheralConflictError(key, existing);
    }
    this.connections.set(key, owner);
  }

  unregister(mac: string, owner: BlePeripheralOwner): void {
    const key = normalizeBleMac(mac);
    if (!key) return;
    if (this.connections.get(key) === owner) {
      this.connections.delete(key);
    }
  }

  assertCanConnect(owner: BlePeripheralOwner, mac: string): void {
    const key = normalizeBleMac(mac);
    if (!key) return;
    const existing = this.getState().connections.find(
      (connection) => connection.mac === key,
    )?.owner;
    if (existing && existing !== owner) {
      throw new BlePeripheralConflictError(key, existing);
    }
  }

  async acquireScan(owner: BleScanOwner): Promise<void> {
    if (this.scanAcquireInFlight) {
      await this.scanAcquireInFlight;
      return this.acquireScan(owner);
    }

    if (this.scanOwner === owner) {
      this.scanOwnerDepth += 1;
      return;
    }
    if (this.scanOwner !== null) {
      throw new BleScanBusyError(this.scanOwner);
    }

    let releaseInFlight!: () => void;
    this.scanAcquireInFlight = new Promise<void>((resolve) => {
      releaseInFlight = resolve;
    });
    try {
      this.scanOwner = owner;
      this.scanOwnerDepth = 1;
    } finally {
      this.scanAcquireInFlight = null;
      releaseInFlight();
    }
  }

  async withScan<T>(owner: BleScanOwner, operation: () => Promise<T>): Promise<T> {
    await this.acquireScan(owner);
    try {
      return await operation();
    } finally {
      this.releaseScan(owner);
    }
  }

  releaseScan(owner: BleScanOwner): void {
    if (this.scanOwner !== owner) return;
    if (this.scanOwnerDepth > 1) {
      this.scanOwnerDepth -= 1;
      return;
    }
    this.scanOwnerDepth = 0;
    this.scanOwner = null;
  }
}

export const bleCoexistenceCoordinator = new BleCoexistenceCoordinator();
