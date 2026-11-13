import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DURABLE_RENDERER_STORAGE_KEYS as KEYS } from '@/shared/rendererOrigin';

import { mockConsoleWarn } from './vitestConsoleMock';

describe('durable renderer startup hydration', () => {
  let database: Record<string, string>;

  beforeEach(() => {
    vi.mocked(window.electronAPI.appSettings.set).mockReset();
    vi.mocked(window.electronAPI.appSettings.getAll).mockReset();
    vi.resetModules();
    localStorage.clear();
    database = {};
    vi.spyOn(window.electronAPI.appSettings, 'getAll').mockImplementation(() =>
      Promise.resolve({
        ...database,
      }),
    );
    vi.spyOn(window.electronAPI.appSettings, 'set').mockImplementation((key, value) => {
      database[key] = value;
      return Promise.resolve({ changes: 1 });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('seeds legacy Meshtastic reads once and never resurrects a cleared canonical watermark', async () => {
    localStorage.setItem('mesh-client:lastRead', '{"ch:0":123}');
    const { hydrateDurableRendererSettings } = await import('./hydrateDurableRendererSettings');
    const chat = await import('./chatPanelProtocolStorage');
    await hydrateDurableRendererSettings();
    expect(chat.loadPersistedLastReadInitial('meshtastic')).toEqual({ 'ch:0': 123 });
    chat.clearPersistedLastReadForProtocol('meshtastic');
    expect(chat.loadPersistedLastReadInitial('meshtastic')).toEqual({});
    await vi.waitFor(() => {
      expect(database[KEYS.chatLastRead.meshtastic]).toBe('{}');
    });
    expect(localStorage.getItem('mesh-client:lastRead')).toBe('{"ch:0":123}');
  });

  it('migrates TAK slot settings and retired contacts into SQLite and restores them without LS', async () => {
    localStorage.setItem(
      'mesh-client:takRelayPrefs',
      JSON.stringify({
        state: {
          byIdentity: {
            radio: { trackerChannels: [1], chatBridges: { 1: 'Ops' }, chatSendChannels: [1] },
          },
        },
        version: 1,
      }),
    );
    const startup = await import('./hydrateDurableRendererSettings');
    await startup.hydrateDurableRendererSettings();
    const persisted = JSON.parse(database[KEYS.takRelayPrefs]);
    expect(persisted.version).toBe(3);
    expect(persisted.state.byIdentity.radio.pendingSlots).toMatchObject({
      chatChannels: [1],
      sendChannels: [1],
    });
    expect(persisted.state.retiredRooms.rooms).toEqual(['Ops']);
    localStorage.clear();
    vi.resetModules();
    const restored = await import('./hydrateDurableRendererSettings');
    const tak = await import('../stores/takRelayPrefsStore');
    await restored.hydrateDurableRendererSettings();
    expect(tak.getTakRetiredRooms()).toEqual(['Ops']);
    tak.bindTakPendingSlots('radio', [{ index: 1, key: '0123456789abcdef' }]);
    await vi.waitFor(() => {
      expect(JSON.parse(database[KEYS.takRelayPrefs]).state.byIdentity.radio.chatChannels).toEqual([
        '0123456789abcdef',
      ]);
    });
  });

  it('does not treat automatic stale TAK cache migration as a user edit over SQLite', async () => {
    localStorage.setItem(
      'mesh-client:takRelayPrefs',
      JSON.stringify({ state: { byIdentity: { stale: { trackerChannels: [1] } } }, version: 1 }),
    );
    database[KEYS.takRelayPrefs] = JSON.stringify({
      state: { byIdentity: {}, retiredRooms: null },
      version: 3,
    });
    const { hydrateDurableRendererSettings } = await import('./hydrateDurableRendererSettings');
    const tak = await import('../stores/takRelayPrefsStore');
    await hydrateDurableRendererSettings();
    expect(tak.useTakRelayPrefsStore.getState().byIdentity).toEqual({});
  });

  it('keeps recovery state and does not write defaults after an unsuccessful DB read', async () => {
    const warn = mockConsoleWarn();
    vi.mocked(window.electronAPI.appSettings.getAll).mockRejectedValue(
      new Error('database unavailable'),
    );
    localStorage.setItem('mesh-client:lastRead:meshcore', '{"ch:0":123}');
    const { hydrateDurableRendererSettings } = await import('./hydrateDurableRendererSettings');
    const chat = await import('./chatPanelProtocolStorage');
    vi.useFakeTimers();
    const startup = hydrateDurableRendererSettings();
    const failedStartup = expect(startup).rejects.toThrow('Saved settings database unavailable');
    await vi.advanceTimersByTimeAsync(1250);
    await failedStartup;
    chat.savePersistedLastRead('meshcore', { 'ch:0': 456 });
    await vi.runAllTimersAsync();
    expect(window.electronAPI.appSettings.getAll).toHaveBeenCalledTimes(3);
    expect(chat.loadPersistedLastReadInitial('meshcore')).toEqual({ 'ch:0': 456 });
    expect(window.electronAPI.appSettings.set).not.toHaveBeenCalled();
    warn.restore();
  });

  it('allows another hydration attempt after exhausting the bounded read retries', async () => {
    const warn = mockConsoleWarn();
    database[KEYS.chatLastRead.meshcore] = '{"ch:7":789}';
    vi.mocked(window.electronAPI.appSettings.getAll).mockRejectedValue(
      new Error('database unavailable'),
    );
    const { hydrateDurableRendererSettings } = await import('./hydrateDurableRendererSettings');
    const chat = await import('./chatPanelProtocolStorage');
    vi.useFakeTimers();
    const startup = hydrateDurableRendererSettings();
    const failedStartup = expect(startup).rejects.toThrow('Saved settings database unavailable');
    await vi.advanceTimersByTimeAsync(1250);
    await failedStartup;
    chat.savePersistedLastRead('meshcore', { 'ch:0': 456 });
    expect(window.electronAPI.appSettings.set).not.toHaveBeenCalled();
    vi.mocked(window.electronAPI.appSettings.getAll).mockResolvedValue({ ...database });
    await hydrateDurableRendererSettings();
    expect(JSON.parse(database[KEYS.chatLastRead.meshcore])).toEqual({
      'ch:0': 456,
      'ch:7': 789,
    });
    warn.restore();
  });

  it('retains unrelated TAK fields when the first edit races the initial SQLite read', async () => {
    let resolve!: (settings: Record<string, string>) => void;
    vi.mocked(window.electronAPI.appSettings.getAll).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { hydrateDurableRendererSettings } = await import('./hydrateDurableRendererSettings');
    const tak = await import('../stores/takRelayPrefsStore');
    const startup = hydrateDurableRendererSettings();
    await vi.waitFor(() => {
      expect(resolve).toBeTypeOf('function');
    });
    tak.useTakRelayPrefsStore.getState().setDirectMessages('radio', true);
    resolve({
      [KEYS.takRelayPrefs]: JSON.stringify({
        state: {
          byIdentity: {
            radio: {
              trackerChannels: [7],
              channelMode: 'selected',
              chatChannels: ['0123456789abcdef'],
              directMessages: false,
            },
          },
          retiredRooms: null,
        },
        version: 3,
      }),
    });
    await startup;
    expect(tak.getTakRelayPrefs('radio')).toMatchObject({
      trackerChannels: [7],
      channelMode: 'selected',
      chatChannels: ['0123456789abcdef'],
      directMessages: true,
    });
  });
});
