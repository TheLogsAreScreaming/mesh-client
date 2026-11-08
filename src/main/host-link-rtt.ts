import { MS_PER_SECOND } from '../shared/timeConstants';
import { sanitizeLogMessage } from './log-service';

/** Align with renderer `HOST_LINK_RTT_PROBE_TIMEOUT_MS`. */
export const HOST_LINK_RTT_PROBE_TIMEOUT_MS = 3 * MS_PER_SECOND;

/**
 * Time a Meshtastic HTTP `/json/report` GET. Returns RTT ms, or null on failure.
 * Does not throw — callers treat null as "no bars".
 */
export async function probeHttpRttMs(host: string, tls: boolean): Promise<number | null> {
  const protocol = tls ? 'https' : 'http';
  const url = `${protocol}://${host}/json/report`;
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(HOST_LINK_RTT_PROBE_TIMEOUT_MS) });
    const rtt = Date.now() - started;
    if (!res.ok) {
      console.debug(
        `[hostLink] HTTP probe non-OK ${res.status} for ${sanitizeLogMessage(host)} rtt=${rtt}ms`,
      );
      // Still usable as latency if the host answered quickly.
      return rtt;
    }
    return rtt;
  } catch (err) {
    console.debug(
      `[hostLink] HTTP probe failed for ${sanitizeLogMessage(host)}:`,
      sanitizeLogMessage(err instanceof Error ? err.message : String(err)),
    );
    return null;
  }
}
