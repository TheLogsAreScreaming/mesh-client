import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '@/renderer/lib/types';

import { buildContactMessageTimeline } from './contactMessageHistory';
import type { LinkPresenceSnapshot } from './contactPresence';

function msg(
  partial: Partial<ChatMessage> & Pick<ChatMessage, 'sender_id' | 'payload' | 'timestamp'>,
): ChatMessage {
  return {
    sender_name: 'x',
    channel: 0,
    ...partial,
  };
}

describe('contactMessageHistory', () => {

});
