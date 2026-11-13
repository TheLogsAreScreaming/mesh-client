// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DURABLE_RENDERER_STORAGE_KEYS } from '@/shared/rendererOrigin';

import joeyPreferences from '../../../e2e/fixtures/renderer-preferences.json';
import { DEFAULT_APP_SETTINGS_SHARED } from './defaultAppSettings';
import { mockConsoleWarn } from './vitestConsoleMock';

const DATABASE_KEY = DURABLE_RENDERER_STORAGE_KEYS.preferences;
class TestStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  clear() {
    this.values.clear();
  }
}
const hub = '0123456789abcdef0123456789abcdef';
const fixtures: Record<string, string> = {
  'mesh-client:appSettings': JSON.stringify({
    ...DEFAULT_APP_SETTINGS_SHARED,
    unknownFuturePreference: { enabled: false, count: 0 },
  }),
  'mesh-client:lastConnection:meshtastic': JSON.stringify({
    type: 'http',
    httpAddress: 'radio.invalid:4403',
    bleDeviceId: 'ble-1',
    bleDeviceName: 'Radio',
    bleMac: 'aa:bb:cc:dd:ee:ff',
    serialPortId: '/dev/test-radio',
  }),
  'mesh-client:lastConnection:meshcore': JSON.stringify({
    type: 'serial',
    serialPortId: '/dev/test-meshcore',
  }),
  'mesh-client:lastBleDevice:meshcore': 'ble-2',
  'mesh-client:lastSerialPort': '/dev/test-radio',
  'mesh-client:lastSerialPortSignature': JSON.stringify({
    usbVendorId: 123,
    usbProductId: 456,
    bluetoothServiceClassId: null,
  }),
  'mesh-client:bleDeviceMacs': JSON.stringify({ 'ble-1': 'aa:bb:cc:dd:ee:ff' }),
  'mesh-client:bleDeviceNames': JSON.stringify({ 'ble-1': 'Radio' }),
  'mesh-client:mqttSettings': JSON.stringify({
    server: 'mqtt.invalid',
    port: 8883,
    username: 'test',
    topicPrefix: 'msh/test',
    autoLaunch: false,
    maxRetries: 0,
    tokenExpiresAt: 12345,
    useWebSocket: false,
    tlsEnabled: true,
    wsPath: '/mqtt',
  }),
  'mesh-client:mqttSettings:meshcore': JSON.stringify({
    server: 'custom.invalid',
    port: 443,
    username: 'operator',
    topicPrefix: 'meshcore/DEN',
    autoLaunch: true,
    maxRetries: 7,
    tokenExpiresAt: null,
    useWebSocket: true,
    tlsEnabled: true,
    wsPath: '/custom',
  }),
  'mesh-client:mqttPreset:meshcore': 'custom',
  'mesh-client:mqttProfiles:meshtastic': JSON.stringify([
    {
      id: 'profile-1',
      name: 'Saved broker',
      server: 'profile.invalid',
      port: 1883,
      username: 'test',
      topicPrefix: 'custom',
      tlsEnabled: false,
    },
  ]),
  'mesh-client:coloradoMqttRegionAck-v1': '1',
  'mesh-client:migrated:meshcore-letsmesh-default-v1': '1',
  'mesh-client:reticulumInterfaceProfiles': JSON.stringify({
    version: 1,
    profiles: [{ id: 'profile', name: 'Home', members: ['interface-a'] }],
    defaultMembers: ['interface-a'],
  }),
  'mesh-client:reticulumRemoteSettings': JSON.stringify({
    autoReconnectShell: false,
    maxReconnectAttempts: 0,
    autoRetryTransfer: false,
    maxRetryAttempts: 0,
    inboundMode: 'off',
    lastSaveDir: '/tmp/test',
    lastFetchJail: '/tmp/test-jail',
    allowFetch: false,
    overwriteOnReceive: false,
  }),
  'mesh-client:reticulumPropagationMode': 'auto',
  'mesh-client:reticulumSetupGuide': JSON.stringify({ dismissed: true }),
  'mesh-client:rrcNickname': 'SavedNick',
  'mesh-client:rrc:hubAutoJoin': JSON.stringify([hub]),
  [`mesh-client:rrc:autoJoin:${hub}`]: JSON.stringify(['#test']),
  [`mesh-client:rrc:roomFavourites:${hub}`]: JSON.stringify(['#test']),
  [`mesh-client:rrc:recentRooms:${hub}`]: JSON.stringify(['#recent', '#test']),
  [`mesh-client:rrc:activeRoom:${hub}`]: '#test',
  [`mesh-client:rrc:openDms:${hub}`]: JSON.stringify([{ nick: 'Peer', hash: hub }]),
  'mesh-client:rrcHubListCollapsed': '1',
  'mesh-client:rrc:roomListCollapsed': '1',
  'mesh-client:rrc:nickListCollapsed': '0',
  'mesh-client:rrc:listView': 'rooms',
  'mesh-client:gpsSettings': JSON.stringify({
    staticLat: 39.7,
    staticLon: -104.9,
    refreshInterval: 0,
  }),
  'mesh-client:savedLocations': JSON.stringify([{ name: 'Home', lat: 39.7, lon: -104.9 }]),
  'mesh-client:fontScale': '1.1',
  'mesh-client:themeSurface': 'dark',
  'mesh-client:themeColors': JSON.stringify({ appBg: '#101010' }),
  'mesh-client:protocol': 'reticulum',
  'mesh-client:launcherPins': JSON.stringify(['app', 'rrc']),
  'mesh-client:notifMuted': 'true',
  'mesh-client:mqttIgnoredNodes': JSON.stringify(['node-1']),
  'mesh-client:meshcoreIdentity': JSON.stringify({ public_key: 'test-public-identity' }),
};

describe('renderer preference recovery', () => {
  let database: Record<string, string>;
  let stop: (() => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', new TestStorage());
    localStorage.clear();
    database = {};
    vi.mocked(window.electronAPI.appSettings.remove).mockImplementation((key) => {
      Reflect.deleteProperty(database, key);
      return Promise.resolve({ changes: 1 });
    });
    vi.mocked(window.electronAPI.appSettings.set).mockImplementation((key, value) => {
      database[key] = value;
      return Promise.resolve({ changes: 1 });
    });
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.restoreAllMocks();
  });

  async function boot() {
    const prefs = await import('./rendererPreferences');
    await prefs.hydrateRendererPreferences(database);
    stop = prefs.installRendererPreferencePersistence();
    return prefs;
  }

  async function restart() {
    stop?.();
    stop = undefined;
    localStorage.clear();
    vi.resetModules();
    return boot();
  }

  it('synchronizes historical string and numeric alias encodings before their late consumers run', async () => {
    const history = JSON.stringify({ ['ab'.repeat(32)]: [222] });
    localStorage.setItem(
      'mesh-client:appSettings',
      JSON.stringify({
        meshtasticLastRfSelfNodeId: '222',
        meshtasticOwnNodeNumsByPublicKey: history,
        meshtasticConfigureTargetNodeNum: '',
        'meshcoreRoomLastPost:7': 1700000000000,
      }),
    );
    Object.assign(database, {
      meshtasticLastRfSelfNodeId: '111',
      meshtasticOwnNodeNumsByPublicKey: '{}',
      meshtasticConfigureTargetNodeNum: '7',
      'meshcoreRoomLastPost:7': '1',
    });
    await boot();
    expect(database.meshtasticLastRfSelfNodeId).toBe('222');
    expect(database.meshtasticOwnNodeNumsByPublicKey).toBe(history);
    expect(database.meshtasticConfigureTargetNodeNum).toBe('');
    expect(database['meshcoreRoomLastPost:7']).toBe('1700000000000');
    vi.mocked(window.electronAPI.appSettings.getAll).mockResolvedValue(database);
    const identity = await import('./meshtasticMqttIdentity');
    expect(await identity.hydrateLastRfSelfNodeIdFromAppSettings()).toBe(222);
  });

  it.each([{}, { use24HourTime: true }])(
    'removes omitted renderer aliases before late consumers can restore them: %j',
    async (app) => {
      const values = Object.keys(app).length ? { 'mesh-client:appSettings': app } : {};
      const native = {
        aiEnabled: '1',
        translationEnabled: '1',
        closeToTray: '0',
        autoUpdateDownloadEnabled: '0',
      };
      Object.assign(database, native, {
        [DATABASE_KEY]: JSON.stringify({ legacyAliasesImported: true, values }),
        meshtasticLastRfSelfNodeId: '111',
        meshtasticOwnNodeNumsByPublicKey: JSON.stringify({ ['ab'.repeat(32)]: [111] }),
        notificationSounds: JSON.stringify({ dm: { sound: 'bell', volume: 33 } }),
        'meshtasticRemoteAdminKey:7': 'old-public-key',
        'meshcoreRoomLastPost:7': '123',
        locale: 'en',
        unrelatedDomain: 'keep',
      });
      await boot();
      for (const key of [
        'meshtasticLastRfSelfNodeId',
        'meshtasticOwnNodeNumsByPublicKey',
        'notificationSounds',
        'meshtasticRemoteAdminKey:7',
        'meshcoreRoomLastPost:7',
      ])
        expect(database[key], key).toBeUndefined();
      // Clear All Local Data preserves locale; empty app must not delete it.
      expect(database).toMatchObject({ ...native, locale: 'en', unrelatedDomain: 'keep' });
      vi.mocked(window.electronAPI.appSettings.getAll).mockResolvedValue(database);
      const identity = await import('./meshtasticMqttIdentity');
      expect(await identity.hydrateLastRfSelfNodeIdFromAppSettings()).toBe(0);
      const sounds = await import('./notificationSoundSettings');
      await sounds.loadNotificationSoundSettings();
      expect(JSON.parse(localStorage.getItem('mesh-client:appSettings') ?? '{}')).toEqual(app);
    },
  );

  it('does not reconcile aliases over a malformed legacy app record awaiting recovery', async () => {
    localStorage.setItem('mesh-client:appSettings', '{broken');
    database[DATABASE_KEY] = JSON.stringify({ legacyAliasesImported: true, values: {} });
    database.meshtasticLastRfSelfNodeId = '111';
    await boot();
    expect(localStorage.getItem('mesh-client:appSettings')).toBe('{broken');
    expect(database.meshtasticLastRfSelfNodeId).toBe('111');
  });

  it.each(Object.keys(fixtures))(
    'restores each saved field of %s after origin cache loss',
    async (key) => {
      localStorage.setItem(key, fixtures[key]);
      await boot();
      await restart();
      expect(localStorage.getItem(key)).toBe(fixtures[key]);
      const expected: unknown = (() => {
        try {
          return JSON.parse(fixtures[key]);
        } catch {
          return fixtures[key];
        }
      })();
      if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
        for (const [field, value] of Object.entries(expected)) {
          expect(JSON.parse(localStorage.getItem(key)!)[field], `${key}.${field}`).toEqual(value);
        }
      }
    },
  );

  it.each([
    'appSettings',
    'adminSettings',
    'mqttSettings',
    'mqttSettings:meshcore',
    'meshcoreIdentity',
    'mqttProfiles:meshtastic',
  ])(
    'defers %s byte-for-byte until retirement, then restores canonical metadata without copying secrets',
    async (suffix) => {
      const key = `mesh-client:${suffix}`;
      const original = suffix.startsWith('mqttProfiles')
        ? [{ id: 'one', server: 'stale.invalid', password: 'PRIVATE-SOURCE' }]
        : { server: 'stale.invalid', password: 'PRIVATE-SOURCE' };
      const desired = suffix.startsWith('mqttProfiles')
        ? [{ id: 'one', server: 'saved.invalid', autoLaunch: false, maxRetries: 0 }]
        : { server: 'saved.invalid', autoLaunch: false, maxRetries: 0 };
      const raw = JSON.stringify(original);
      localStorage.setItem(key, raw);
      database[DATABASE_KEY] = JSON.stringify({
        legacyAliasesImported: true,
        values: { [key]: desired },
      });
      const writes = vi.spyOn(localStorage, 'setItem');
      const prefs = await import('./rendererPreferences');
      await prefs.hydrateRendererPreferences(database);
      expect(localStorage.getItem(key)).toBe(raw);
      expect(database[DATABASE_KEY]).not.toContain('PRIVATE-SOURCE');
      await expect(prefs.finalizeRendererPreferences()).rejects.toThrow('awaiting verified');
      // Simulate the secure migrator's acknowledged retirement of the original source.
      localStorage.setItem(
        key,
        JSON.stringify(
          suffix.startsWith('mqttProfiles')
            ? [{ id: 'one', server: 'stale.invalid' }]
            : { server: 'stale.invalid' },
        ),
      );
      await prefs.finalizeRendererPreferences();
      expect(JSON.parse(localStorage.getItem(key)!)).toEqual(desired);
      expect(writes.mock.calls.every(([, value]) => !value.includes('PRIVATE-SOURCE'))).toBe(true);
    },
  );

  it('preserves a secret source for a canonical deletion and removes it only after retirement', async () => {
    const key = 'mesh-client:mqttSettings';
    const raw = '{"server":"old.invalid","password":"PRIVATE-SOURCE"}';
    localStorage.setItem(key, raw);
    database[DATABASE_KEY] = JSON.stringify({ legacyAliasesImported: true, values: {} });
    const prefs = await import('./rendererPreferences');
    await prefs.hydrateRendererPreferences(database);
    await expect(prefs.finalizeRendererPreferences()).rejects.toThrow('awaiting verified');
    expect(localStorage.getItem(key)).toBe(raw);
    localStorage.setItem(key, '{"server":"old.invalid"}');
    await prefs.finalizeRendererPreferences();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('routes prepared legacy MQTT metadata only after secure retirement and across Retry', async () => {
    const key = 'mesh-client:mqttSettings';
    localStorage.setItem(key, '{"topicPrefix":"msh/old","password":"PRIVATE-SOURCE"}');
    database[DATABASE_KEY] = JSON.stringify({
      legacyAliasesImported: true,
      values: {
        [key]: { server: 'saved.invalid', topicPrefix: 'meshcore/NEW' },
      },
    });
    const prefs = await import('./rendererPreferences');
    await prefs.hydrateRendererPreferences(database);
    expect(prefs.getPreparedRendererPreferences()?.[key]).toContain('meshcore/NEW');
    await expect(prefs.finalizeRendererPreferences()).rejects.toThrow('awaiting verified');
    await prefs.hydrateRendererPreferences(database);
    expect(prefs.getPreparedRendererPreferences()?.[key]).toContain('meshcore/NEW');
    localStorage.setItem(key, '{"topicPrefix":"msh/old"}');
    await prefs.finalizeRendererPreferences();
    expect(localStorage.getItem(key)).toBeNull();
    expect(JSON.parse(localStorage.getItem('mesh-client:mqttSettings:meshcore')!).topicPrefix).toBe(
      'meshcore/NEW',
    );
  });

  it('rejects credential-bearing canonical maps rather than sanitizing and restoring them', async () => {
    const raw = JSON.stringify({
      legacyAliasesImported: true,
      values: {
        'mesh-client:mqttSettings': { server: 'saved.invalid', password: 'PRIVATE-CANONICAL' },
      },
    });
    database[DATABASE_KEY] = raw;
    const prefs = await import('./rendererPreferences');
    await expect(prefs.hydrateRendererPreferences(database)).rejects.toThrow(
      'Credential in renderer',
    );
    expect(database[DATABASE_KEY]).toBe(raw);
    expect(localStorage.getItem('mesh-client:mqttSettings')).toBeNull();
  });

  it('rejects corrupt structured preference content on every retry until corrected', async () => {
    database[DATABASE_KEY] = JSON.stringify({
      legacyAliasesImported: true,
      values: { 'mesh-client:mqttSettings': '[]' },
    });
    const prefs = await import('./rendererPreferences');
    await expect(prefs.hydrateRendererPreferences(database)).rejects.toThrow('Invalid structured');
    await expect(prefs.hydrateRendererPreferences(database)).rejects.toThrow('Invalid structured');
    database[DATABASE_KEY] = JSON.stringify({
      legacyAliasesImported: true,
      values: { 'mesh-client:mqttSettings': { server: 'recovered.invalid' } },
    });
    await prefs.hydrateRendererPreferences(database);
    expect(JSON.parse(localStorage.getItem('mesh-client:mqttSettings')!).server).toBe(
      'recovered.invalid',
    );
  });

  it.each([
    'appSettings',
    'adminSettings',
    'mqttSettings',
    'mqttSettings:meshcore',
    'mqttProfiles:meshtastic',
    'meshcoreIdentity',
  ])('keeps malformed credential-bearing %s out of the new plaintext backup', async (suffix) => {
    const key = `mesh-client:${suffix}`;
    const malformed = '{"password":"MALFORMED-SECRET","server":';
    localStorage.setItem(key, malformed);
    await boot();
    expect(database[DATABASE_KEY]).not.toContain('MALFORMED-SECRET');
    expect(localStorage.getItem(key)).toBe(malformed);
  });

  it.each([
    'appSettings',
    'adminSettings',
    'mqttSettings',
    'mqttSettings:meshcore',
    'mqttProfiles:meshtastic',
    'meshcoreIdentity',
  ])('excludes wrong-shaped credential-bearing %s from the non-secret backup', async (suffix) => {
    const key = `mesh-client:${suffix}`;
    for (const value of ['PRIVATE-INVALID-SHAPE', ['PRIVATE-INVALID-SHAPE'], null]) {
      localStorage.setItem(key, JSON.stringify(value));
      const prefs = await boot();
      await prefs.flushRendererPreferences();
      expect(database[DATABASE_KEY]).not.toContain('PRIVATE-INVALID-SHAPE');
      expect(localStorage.getItem(key)).toBe(JSON.stringify(value));
    }
  });
});
