import { app } from 'electron';
import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

import { buildInfoForManifest, getBuildInfo } from '../shared/buildInfo';
import {
  redactMeshcoreCliSecretsInJsonText,
  redactMeshcoreCliSecretsInText,
} from '../shared/meshcoreCliSecrets';
import type { SupportBundleMode } from '../shared/support-bundle.types';
import { exportDatabase } from './database';
import { flushLogBeforeQuit, getLogPath } from './log-service';

export type { SupportBundleMode };

const MAX_DEBUG_SNAPSHOT_JSON_BYTES = 5 * 1024 * 1024;
/** Tail-cap for preserved/rotated `mesh-client.log.1` in support zips (full file can be ~100 MB). */
const MAX_SUPPORT_BUNDLE_LOG_BACKUP_BYTES = 10 * 1024 * 1024;
const LOG_BACKUP_FILENAME = 'mesh-client.log.1';
const GITHUB_SUPPORT_BUNDLE_ALLOWLIST = new Set([
  'debug-snapshot.json',
  'mesh-client.log',
  LOG_BACKUP_FILENAME,
  'manifest.json',
  'README.txt',
]);

export function validateDebugSnapshotJson(debugSnapshotJson: string): Record<string, unknown> {
  if (debugSnapshotJson.length > MAX_DEBUG_SNAPSHOT_JSON_BYTES) {
    throw new Error('debug snapshot JSON too large');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(debugSnapshotJson);
  } catch {
    throw new Error('debug snapshot JSON is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('debug snapshot JSON must be an object');
  }
  return parsed as Record<string, unknown>;
}

function buildManifest(mode: SupportBundleMode): Record<string, unknown> {
  const kind = mode === 'github' ? 'mesh-client-github-report' : 'mesh-client-developer-bundle';
  const stamped = buildInfoForManifest(getBuildInfo());
  const manifest: Record<string, unknown> = {
    kind,
    bundleVersion: 1,
    appVersion:
      typeof app !== 'undefined' && typeof app.getVersion === 'function'
        ? app.getVersion()
        : 'unknown',
    buildChannel: stamped.buildChannel,
    platform: process.platform,
    arch: process.arch,
    packaged:
      typeof app !== 'undefined' && typeof app.isPackaged === 'boolean' ? app.isPackaged : false,
    capturedAt: new Date().toISOString(),
  };
  if (stamped.buildInfo) {
    manifest.buildInfo = stamped.buildInfo;
  }
  const flatpakId = process.env.FLATPAK_ID;
  if (typeof flatpakId === 'string' && flatpakId.length > 0) {
    manifest.flatpakId = flatpakId;
  }
  return manifest;
}

function buildChannelReadmeLine(): string {
  const stamped = buildInfoForManifest(getBuildInfo());
  const runUrl =
    stamped.buildInfo && typeof stamped.buildInfo.runUrl === 'string'
      ? stamped.buildInfo.runUrl
      : undefined;
  if (runUrl) {
    return `Build channel: ${stamped.buildChannel} — CI run: ${runUrl}`;
  }
  return `Build channel: ${stamped.buildChannel}`;
}

function buildReadme(mode: SupportBundleMode): string {
  if (mode === 'github') {
    return `mesh-client support bundle (GitHub report)

This zip is safe to attach to public GitHub issues.

${buildChannelReadmeLine()}

Contents:
  debug-snapshot.json  — UI/session state for triage (Meshtastic, MeshCore)
  mesh-client.log      — Application log (current session)
  mesh-client.log.1    — Prior session log (preserved on restart) or size-rotated backup
  manifest.json        — App version, buildChannel, and platform metadata
  README.txt           — This file

For deeper triage that requires your local database, a maintainer may ask you to
export "Export for Developer" separately and share it via a private channel only.
`;
  }

  return `mesh-client support bundle (Developer)

PRIVATE USE ONLY — do not attach this zip or mesh-client.db to public GitHub issues.

The database may contain saved passwords (MeshCore room/repeater credentials, MQTT
settings, and similar secrets). MECP audit logs may contain emergency message text,
sender and channel identifiers, and location details. Share this bundle only with
maintainers via a private channel (email, Discord DM, etc.) when they request it.

${buildChannelReadmeLine()}

Contents:
  debug-snapshot.json           — UI/session state for triage
  mesh-client.db                — SQLite database backup (contains secrets)
  mesh-client.log               — Application log (current session)
  mesh-client.log.1             — Prior session log (preserved on restart) or size-rotated backup
  mecp-received.log             — Durable MECP (emergency) received audit log
  mecp-received.log.1           — Size-rotated MECP audit backup (if present)
  manifest.json                 — App version, buildChannel, and platform metadata
  README.txt                    — This file
`;
}

/**
 * Scrub MeshCore CLI secrets (`set wifi.pwd`, `set pin`, `get wifi.pwd` replies, …) from a log
 * buffer. The renderer already redacts before logging; this catches older builds' lines. The
 * debug snapshot gets the JSON-string variant so it stays valid JSON.
 */
export function redactMeshcoreCliSecretsInLog(log: Buffer): Buffer {
  if (log.length === 0) return log;
  const text = log.toString('utf8');
  const redacted = redactMeshcoreCliSecretsInText(text);
  return redacted === text ? log : Buffer.from(redacted, 'utf8');
}

/** Truncate long hex ids in exported log lines (keep triage prefix only). */
function redactLxmfOutboundLogLine(line: string): string {
  return line.replace(/\b([0-9a-fA-F]{16,})\b/g, (hex) => `${hex.slice(0, 8)}…`);
}

/** Extract LXMF outbound / PN cascade diagnostic lines for developer triage. */
export function extractLxmfOutboundLogSlice(...logChunks: Buffer[]): Buffer {
  const patterns = [
    /lxmf-outbound/i,
    /propagation-deposit/i,
    /propagation-retrieve/i,
    /propagation-sync/i,
    /propagation establish/i,
    /PROPAGATION_PATH_UNKNOWN/i,
    /LXMF advancing PN cascade/i,
    /LXMF outbound delivery failed/i,
    /outbound Direct Completes/i,
    /LXMF delivery Failed/i,
    /LXMF delivery Rejected/i,
    /Direct path failover/i,
    /PN cascade/i,
    /DeliverPropagated/i,
    // PN island diagnosis: actual deposit PN hash vs preferred, and sync target counts.
    /deposit[_ ]?pn/i,
    /preferred[_ ]?pn/i,
    /sync[_ ]?target/i,
    /pn[_ ]?island/i,
    /HaveAll|empty[_ ]?offer/i,
  ];
  const lines: string[] = [];
  for (const chunk of logChunks) {
    if (!chunk.length) continue;
    const text = chunk.toString('utf8');
    for (const line of text.split(/\r?\n/)) {
      if (patterns.some((re) => re.test(line))) {
        lines.push(redactLxmfOutboundLogLine(line));
      }
    }
  }
  // Cap slice so huge logs cannot bloat the zip.
  const capped = lines.length > 4000 ? lines.slice(-4000) : lines;
  return Buffer.from(capped.join('\n') + (capped.length ? '\n' : ''), 'utf8');
}

async function readFileOrEmpty(filePath: string): Promise<Buffer> {
  try {
    return await fs.promises.readFile(filePath);
  } catch {
    // catch-no-log-ok missing log file returns empty buffer for bundle export
    return Buffer.alloc(0);
  }
}

/** Read the last `maxBytes` of a file (or the whole file if smaller). */
async function readFileTailOrEmpty(filePath: string, maxBytes: number): Promise<Buffer> {
  try {
    // Open first, then fstat/read via the same handle (avoids CodeQL js/file-system-race TOCTOU).
    const fh = await fs.promises.open(filePath, 'r');
    try {
      const st = await fh.stat();
      if (st.size <= maxBytes) {
        return await fh.readFile();
      }
      const buf = Buffer.alloc(maxBytes);
      const { bytesRead } = await fh.read(buf, 0, maxBytes, st.size - maxBytes);
      return buf.subarray(0, bytesRead);
    } finally {
      await fh.close();
    }
  } catch {
    // catch-no-log-ok missing/unreadable backup returns empty buffer for bundle export
    return Buffer.alloc(0);
  }
}

async function atomicWriteFile(destPath: string, data: Buffer): Promise<void> {
  const tmpPath = `${destPath}.tmp`;
  await fs.promises.writeFile(tmpPath, data);
  try {
    if (process.platform === 'win32' && fs.existsSync(destPath)) {
      await fs.promises.rm(destPath, { force: true });
    }
    await fs.promises.rename(tmpPath, destPath);
  } catch (err) {
    try {
      await fs.promises.rm(tmpPath, { force: true });
    } catch {
      // catch-no-log-ok best-effort cleanup after failed rename
    }
    throw err;
  }
}

export function defaultSupportBundleFilename(mode: SupportBundleMode): string {
  const date = new Date().toISOString().slice(0, 10);
  return mode === 'github'
    ? `mesh-client-github-report-${date}.zip`
    : `mesh-client-developer-bundle-${date}.zip`;
}

export function isSupportBundleMode(value: unknown): value is SupportBundleMode {
  return value === 'github' || value === 'developer';
}

/** Public (GitHub) bundles may only contain the allowlisted, non-sensitive files. */
function assertGitHubSupportBundleAllowlist(zip: JSZip): void {
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir && !GITHUB_SUPPORT_BUNDLE_ALLOWLIST.has(name)) {
      throw new Error(`GitHub support bundle contains non-public entry: ${name}`);
    }
  }
}

/** Build a support zip at destZipPath. Failure point: disk I/O or DB backup; throws on error. */
export async function buildSupportBundleZip(
  destZipPath: string,
  mode: SupportBundleMode,
  debugSnapshotJson: string,
): Promise<void> {
  validateDebugSnapshotJson(debugSnapshotJson);
  await flushLogBeforeQuit();

  const zip = new JSZip();
  zip.file('debug-snapshot.json', redactMeshcoreCliSecretsInJsonText(debugSnapshotJson));

  const logPath = getLogPath();
  const logDir = path.dirname(logPath);
  const currentLog = redactMeshcoreCliSecretsInLog(await readFileOrEmpty(logPath));
  zip.file('mesh-client.log', currentLog);

  const backupPath = path.join(logDir, LOG_BACKUP_FILENAME);
  if (fs.existsSync(backupPath)) {
    backupLog = redactMeshcoreCliSecretsInLog(
      await readFileTailOrEmpty(backupPath, MAX_SUPPORT_BUNDLE_LOG_BACKUP_BYTES),
    );
    zip.file(LOG_BACKUP_FILENAME, backupLog);
  }

  zip.file('manifest.json', JSON.stringify(buildManifest(mode), null, 2));
  zip.file('README.txt', buildReadme(mode));

  if (mode === 'developer') {
    const mecpLogPath = path.join(logDir, 'mecp-received.log');
    const mecpLog = await readFileOrEmpty(mecpLogPath);
    if (mecpLog.length > 0) {
      zip.file('mecp-received.log', mecpLog);
    }
    const mecpBackupPath = path.join(logDir, 'mecp-received.log.1');
    if (fs.existsSync(mecpBackupPath)) {
      zip.file(
        'mecp-received.log.1',
        await readFileTailOrEmpty(mecpBackupPath, MAX_SUPPORT_BUNDLE_LOG_BACKUP_BYTES),
      );
    }

    const tempRoot = app.getPath('temp');
    await fs.promises.mkdir(tempRoot, { recursive: true });
    const tempDbDir = await fs.promises.mkdtemp(path.join(tempRoot, 'mesh-support-db-'));
    const tempDbPath = path.join(tempDbDir, 'mesh-client.db');
    try {
      exportDatabase(tempDbPath);
      zip.file('mesh-client.db', await fs.promises.readFile(tempDbPath));
    } finally {
      await fs.promises.rm(tempDbDir, { recursive: true, force: true });
    }
  } else {
    assertGitHubSupportBundleAllowlist(zip);
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  await atomicWriteFile(destZipPath, buf);
}
