import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadStarred } from './chatPanelProtocolStorage';
import type { ChatMessage } from './types';
import { buildUnifiedInboxItems } from './unifiedInbox';
import { starInboxItems, STARRED_EXTERNAL_EVENT } from './unifiedInboxActions';

function msg(id: number, over: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    sender_id: 10,
    sender_name: 'Alpha',
    payload: `m${id}`,
    channel: 1,
    timestamp: id,
    ...over,
  };
}

describe('starInboxItems', () => {
  beforeEach(() => {
    localStorage.clear();
  });

});
