import { useCallback } from 'react';

import { sendChatOnIdentity } from '../lib/sendChatOnIdentity';
import type { IdentityId } from '../lib/types';

/**
 * Chat's send function for one identity: {@link sendChatOnIdentity}. Returns the provisional
 * store id, or undefined when nothing was sent.
 */
export function useSendMessage(
  identityId: IdentityId | null,
): (
  text: string,
  channelIndex: number,
  destination?: number,
  replyTo?: string,
  retryOfStoreId?: string,
) => string | undefined {
  return useCallback(
    (
      text: string,
      channelIndex: number,
      destination?: number,
      replyTo?: string,
      retryOfStoreId?: string,
    ) => {
      if (!identityId) return;
      return sendChatOnIdentity(identityId, {
        text,
        channelIndex,
        destination,
        replyTo,
        retryOfStoreId,
      });
    },
    [identityId],
  );
}
