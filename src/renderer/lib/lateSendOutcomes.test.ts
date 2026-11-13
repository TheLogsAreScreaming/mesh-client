import { beforeEach, describe, expect, it } from 'vitest';

import {
  announceLateSend,
  holdSendError,
  resetLateSendOutcomesForTests,
  takeHeldSendError,
} from './lateSendOutcomes';

describe('lateSendOutcomes', () => {
  beforeEach(() => {
    resetLateSendOutcomesForTests();
  });

  it('keeps the latest reason when a view fails twice', () => {
    holdSendError('meshtastic', 'ch:1', 'first');
    holdSendError('meshtastic', 'ch:1', 'second');

    expect(takeHeldSendError('meshtastic', 'ch:1')).toBe('second');
  });

  it('holds nothing for an announced send', () => {
    announceLateSend('meshtastic', 'ch:3', 'hello');

    expect(takeHeldSendError('meshtastic', 'ch:3')).toBeUndefined();
  });
});
