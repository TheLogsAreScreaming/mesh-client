import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hydrateAxeThemeColors } from '@/renderer/lib/a11yTestHelpers';

import { GlobalMessageSearchDialog } from './GlobalMessageSearchDialog';

describe('GlobalMessageSearchDialog', () => {
  beforeEach(() => {
    vi.mocked(window.electronAPI.db.searchMessages).mockResolvedValue([
      {
        id: 1,
        sender_id: 10,
        sender_name: 'Alpha',
        payload: 'hello mesh search',
        channel: 0,
        timestamp: 1_700_000_000_000,
        packetId: null,
        status: 'acked',
        error: null,
        emoji: null,
        replyId: null,
        to: undefined,
        mqttStatus: null,
        receivedVia: null,
      },
    ]);
    vi.mocked(window.electronAPI.db.searchMeshcoreMessages).mockResolvedValue([]);
  });
});
