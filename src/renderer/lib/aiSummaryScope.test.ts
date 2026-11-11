// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { mergeSummaryMessages, selectSummaryMessages } from './aiSummaryScope';
import { mockConsoleWarn } from './vitestConsoleMock';

describe('AI summary scope and RRC read boundaries', () => {
  const messages = [
    { at: 1, sender: 'A', body: 'old' },
    { at: 3600001, sender: 'B', body: 'new' },
  ];
  it.each([
    [2, 1, 2],
    [1, 2, 2],
    [2, 2, 2],
    [1, 1, 1],
    [0, 2, 2],
  ])('preserves repeated messages across %i history and %i live copies', (history, live, count) => {
    const message = { at: 1, sender: 'Alice', body: 'Morning' };
    expect(
      mergeSummaryMessages(
        Array.from({ length: history }, () => message),
        Array.from({ length: live }, () => message),
      ),
    ).toHaveLength(count);
  });

  it('does not merge distinct sender/body tuples containing colons', () => {
    const first = { at: 1, sender: 'Alice: Bob', body: 'Morning' };
    const second = { at: 1, sender: 'Alice', body: ' Bob:Morning' };
    expect(mergeSummaryMessages([first], [second])).toEqual([first, second]);
  });
  it('keeps unread exclusive, hour range inclusive and loaded unfiltered', () => {
    expect(selectSummaryMessages({ messages, scope: { kind: 'unread' }, watermark: 1 })).toEqual([
      messages[1],
    ]);
    expect(
      selectSummaryMessages({ messages, scope: { kind: 'hours', hours: 1 }, now: 3600001 }),
    ).toEqual(messages);
    expect(selectSummaryMessages({ messages, scope: { kind: 'loaded' } })).toEqual(messages);
  });
});
