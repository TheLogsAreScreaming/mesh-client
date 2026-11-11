import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isValidConnectHost } from '@/shared/connectHost';
import type {
  TAKEnrollmentRequest,
  TAKRemoteCredentialSummary,
  TAKRemoteSettings,
  TAKRemoteStatus,
} from '@/shared/tak-types';
import { TCP_PORT_MAX, TCP_PORT_MIN } from '@/shared/tcpPort';

import { useTakRemoteRelay } from '../hooks/useTakRemoteRelay';
import { localizeTakRemoteUserError } from '../lib/takRemoteUserError';
import { buttonClassName } from './ui/Button';
import { INPUT_BOX_CLASS } from './ui/formClasses';
import { SettingsSection } from './ui/SettingsSection';

const DEFAULT_TLS_PORT = 8089;
const DEFAULT_TCP_PORT = 8087;
const DEFAULT_ENROLLMENT_PORT = 8446;

const DEFAULT_REMOTE_SETTINGS: TAKRemoteSettings = {
  host: '',
  port: DEFAULT_TLS_PORT,
  useTls: true,
  verifyServer: true,
  allowNameMismatch: false,
  autoConnect: false,
};

const STATUS_DOT: Record<TAKRemoteStatus['state'], string> = {
  connected: 'bg-success-500',
  connecting: 'bg-warning-500',
  disconnected: 'bg-ink-500',
};

function CredentialSummary({ credentials }: { credentials: TAKRemoteCredentialSummary | null }) {
  const { t } = useTranslation();
  if (!credentials) return null;
  return (
    <ul className="text-ink-400 text-label space-y-1">
      <li>
        {credentials.caSubjects.length > 0
          ? t('takServerPanel.remoteCaSummary', { names: credentials.caSubjects.join(', ') })
          : t('takServerPanel.remoteNoCa')}
      </li>
      <li>
        {credentials.clientSubject
          ? t('takServerPanel.remoteClientSummary', {
              subject: credentials.clientSubject,
              date:
                credentials.clientExpiresAt != null
                  ? new Date(credentials.clientExpiresAt).toLocaleDateString()
                  : '',
            })
          : t('takServerPanel.remoteNoClient')}
      </li>
    </ul>
  );
}

interface EnrollProps {
  host: string;
  hostValid: boolean;
  verifyServer: boolean;
  /** Effective opt-out: the checkbox, and only when an imported CA is pinned. */
  allowNameMismatch: boolean;
  disabled: boolean;
  onEnroll: (request: TAKEnrollmentRequest) => Promise<boolean>;
}

/** Username/password enrollment for a client certificate, as ATAK's "Enroll for client certificate". */
function EnrollForm({
  host,
  hostValid,
  verifyServer,
  allowNameMismatch,
  disabled,
  onEnroll,
}: EnrollProps) {
  const { t } = useTranslation();
  const id = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState(String(DEFAULT_ENROLLMENT_PORT));
  const portNum = Number(port);
  const portValid = Number.isInteger(portNum) && portNum >= TCP_PORT_MIN && portNum <= TCP_PORT_MAX;
  const ready = verifyServer && hostValid && portValid && username.trim() !== '' && password !== '';

  const handleEnroll = async () => {
    if (!ready) return;
    await onEnroll({
      host: host.trim(),
      port: portNum,
      username: username.trim(),
      password,
      verifyServer,
      allowNameMismatch,
    });
    setPassword('');
  };

  return (
    <div data-setting-anchor="tak.remote.enroll" className="space-y-2">
      <h5 className="text-ink-300 text-label font-medium">
        {t('takServerPanel.remoteEnrollTitle')}
      </h5>
      <p className="text-ink-400 text-label">{t('takServerPanel.remoteEnrollHint')}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`${id}-user`} className="text-ink-400 text-label mb-1 block">
            {t('takServerPanel.remoteEnrollUsername')}
          </label>
          <input
            id={`${id}-user`}
            aria-label={t('takServerPanel.remoteEnrollUsername')}
            type="text"
            autoComplete="off"
            spellCheck={false}
            maxLength={256}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
            disabled={disabled}
            className={`${INPUT_BOX_CLASS} w-40`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-pass`} className="text-ink-400 text-label mb-1 block">
            {t('takServerPanel.remoteEnrollPassword')}
          </label>
          <input
            id={`${id}-pass`}
            aria-label={t('takServerPanel.remoteEnrollPassword')}
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            disabled={disabled}
            className={`${INPUT_BOX_CLASS} w-40`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-port`} className="text-ink-400 text-label mb-1 block">
            {t('takServerPanel.remoteEnrollPort')}
          </label>
          <input
            id={`${id}-port`}
            aria-label={t('takServerPanel.remoteEnrollPort')}
            type="number"
            min={TCP_PORT_MIN}
            max={TCP_PORT_MAX}
            value={port}
            onChange={(e) => {
              setPort(e.target.value);
            }}
            disabled={disabled}
            className={`${INPUT_BOX_CLASS} w-24`}
          />
        </div>
        <button
          type="button"
          onClick={handleEnroll}
          aria-label={t('takServerPanel.remoteEnroll')}
          disabled={disabled || !ready}
          className={buttonClassName('secondary', 'md')}
        >
          {t('takServerPanel.remoteEnroll')}
        </button>
      </div>
      {!hostValid && (
        <p className="text-ink-400 text-label">{t('takServerPanel.remoteEnrollNeedsHost')}</p>
      )}
      {!verifyServer && (
        <p className="text-ink-400 text-label">{t('takServerPanel.remoteEnrollNeedsVerify')}</p>
      )}
    </div>
  );
}

interface FormProps {
  initial: TAKRemoteSettings;
  relay: ReturnType<typeof useTakRemoteRelay>;
}

function RemoteRelayForm({ initial, relay }: FormProps) {
  const { t } = useTranslation();
  const id = useId();
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(String(initial.port));
  const [useTls, setUseTls] = useState(initial.useTls);
  const [verifyServer, setVerifyServer] = useState(initial.verifyServer);
  const [allowNameMismatch, setAllowNameMismatch] = useState(initial.allowNameMismatch);
  const [autoConnect, setAutoConnect] = useState(initial.autoConnect);
  const [password, setPassword] = useState('');

  const { status, credentials, isBusy, error } = relay;
  // The name-mismatch opt-out only applies when trust is pinned to an imported CA.
  const hasCa = (credentials?.caSubjects.length ?? 0) > 0;
  const active = status.state !== 'disconnected';
  const portNum = Number(port);
  const portValid = Number.isInteger(portNum) && portNum >= TCP_PORT_MIN && portNum <= TCP_PORT_MAX;
  const hostValid = isValidConnectHost(host);
  // An unverified or unencrypted relay is only started by hand, never at launch.
  const canAutoConnect = useTls && verifyServer;

  const handleUseTlsChange = (next: boolean) => {
    setUseTls(next);
    // Follow the TAK default port for the transport unless the user typed their own.
    if (next && port === String(DEFAULT_TCP_PORT)) setPort(String(DEFAULT_TLS_PORT));
    if (!next && port === String(DEFAULT_TLS_PORT)) setPort(String(DEFAULT_TCP_PORT));
  };

  const statusLabel =
    status.state === 'connected'
      ? t('takServerPanel.remoteConnected', { host: status.host, port: status.port })
      : status.state === 'connecting'
        ? t('takServerPanel.remoteConnecting', { host: status.host, port: status.port })
        : t('takServerPanel.remoteDisconnected');
  const translateRemoteError = (key: string, options?: Record<string, string>) => t(key, options);
  const statusError = status.error
    ? localizeTakRemoteUserError(status.error, translateRemoteError)
    : null;
  const actionError = error ? localizeTakRemoteUserError(error, translateRemoteError) : null;

  const handleConnect = () => {
    if (!hostValid || !portValid) return;
    void relay.connect({
      host: host.trim(),
      port: portNum,
      useTls,
      verifyServer,
      allowNameMismatch: allowNameMismatch && hasCa,
      autoConnect: autoConnect && canAutoConnect,
    });
  };

  const handleImport = async () => {
    await relay.importCredentials(password);
    setPassword('');
  };

  const handleEnroll = async (request: TAKEnrollmentRequest) => {
    const enrolled = await relay.enroll(request);
    // Enrolled trust is pinned to the server's own CA, and TAK Server stream certificates are
    // usually issued for "takserver" rather than the dialed name; ATAK does not check the name.
    if (enrolled) setAllowNameMismatch(true);
    return enrolled;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 shrink-0 rounded-full ${STATUS_DOT[status.state]}`} />
        <div className="min-w-0">
          <p className="text-ink-200 text-body-lg font-medium">{statusLabel}</p>
          {statusError && (
            <p className="text-ink-400 text-label break-words">
              {t('takServerPanel.remoteLastError', { error: statusError })}
            </p>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-card border-danger-700 bg-danger-900/40 text-body-lg text-danger-300 border p-3">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div data-setting-anchor="tak.remote.host" className="min-w-0 flex-1 basis-56">
          <label htmlFor={`${id}-host`} className="text-ink-400 text-label mb-1 block">
            {t('takServerPanel.remoteHostLabel')}
          </label>
          <input
            id={`${id}-host`}
            aria-label={t('takServerPanel.remoteHostLabel')}
            type="text"
            maxLength={253}
            autoComplete="off"
            spellCheck={false}
            value={host}
            onChange={(e) => {
              setHost(e.target.value);
            }}
            disabled={active || isBusy}
            className={`${INPUT_BOX_CLASS} w-full`}
          />
          {host !== '' && !hostValid && (
            <p className="text-label text-danger-400 mt-1">{t('takServerPanel.remoteHostError')}</p>
          )}
        </div>
        <div data-setting-anchor="tak.remote.port">
          <label htmlFor={`${id}-port`} className="text-ink-400 text-label mb-1 block">
            {t('takServerPanel.remotePortLabel')}
          </label>
          <input
            id={`${id}-port`}
            aria-label={t('takServerPanel.remotePortLabel')}
            type="number"
            min={TCP_PORT_MIN}
            max={TCP_PORT_MAX}
            value={port}
            onChange={(e) => {
              setPort(e.target.value);
            }}
            disabled={active || isBusy}
            className={`${INPUT_BOX_CLASS} w-28`}
          />
          {port !== '' && !portValid && (
            <p className="text-label text-danger-400 mt-1">{t('takServerPanel.remotePortError')}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div data-setting-anchor="tak.remote.useTls" className="flex items-center gap-2">
          <input
            id={`${id}-tls`}
            aria-label={t('takServerPanel.remoteUseTls')}
            type="checkbox"
            checked={useTls}
            onChange={(e) => {
              handleUseTlsChange(e.target.checked);
            }}
            disabled={active || isBusy}
            className="accent-brand-green disabled:opacity-50"
          />
          <label htmlFor={`${id}-tls`} className="text-ink-300 text-body-lg cursor-pointer">
            {t('takServerPanel.remoteUseTls')}
          </label>
        </div>
        {!useTls && (
          <p className="text-label text-warning-300 pl-6">
            {t('takServerPanel.remotePlainTcpWarning')}
          </p>
        )}
        {useTls && (
          <div data-setting-anchor="tak.remote.verifyServer" className="flex items-center gap-2">
            <input
              id={`${id}-verify`}
              aria-label={t('takServerPanel.remoteVerifyServer')}
              type="checkbox"
              checked={verifyServer}
              onChange={(e) => {
                setVerifyServer(e.target.checked);
              }}
              disabled={active || isBusy}
              className="accent-brand-green disabled:opacity-50"
            />
            <label htmlFor={`${id}-verify`} className="text-ink-300 text-body-lg cursor-pointer">
              {t('takServerPanel.remoteVerifyServer')}
            </label>
          </div>
        )}
        {useTls && verifyServer && (
          <div
            data-setting-anchor="tak.remote.allowNameMismatch"
            className="flex items-center gap-2 pl-6"
          >
            <input
              id={`${id}-name-mismatch`}
              aria-label={t('takServerPanel.remoteAllowNameMismatch')}
              type="checkbox"
              checked={allowNameMismatch && hasCa}
              onChange={(e) => {
                setAllowNameMismatch(e.target.checked);
              }}
              disabled={active || isBusy || !hasCa}
              className="accent-brand-green disabled:opacity-50"
            />
            <label
              htmlFor={`${id}-name-mismatch`}
              className="text-ink-300 text-body-lg cursor-pointer"
            >
              {t('takServerPanel.remoteAllowNameMismatch')}
            </label>
          </div>
        )}
        {useTls && !verifyServer && (
          <p className="text-label text-warning-300">
            {t('takServerPanel.remoteVerifyOffWarning')}{' '}
            {t('takServerPanel.remoteAutoConnectNeedsVerify')}
          </p>
        )}
        {useTls && verifyServer && !hasCa && (
          <p className="text-ink-400 text-label pl-6">
            {t('takServerPanel.remoteNameMismatchNeedsCa')}
          </p>
        )}
        <div data-setting-anchor="tak.remote.autoConnect" className="flex items-center gap-2">
          <input
            id={`${id}-autoconnect`}
            aria-label={t('takServerPanel.remoteAutoConnect')}
            type="checkbox"
            checked={autoConnect && canAutoConnect}
            onChange={(e) => {
              setAutoConnect(e.target.checked);
            }}
            disabled={active || isBusy || !canAutoConnect}
            className="accent-brand-green disabled:opacity-50"
          />
          <label htmlFor={`${id}-autoconnect`} className="text-ink-300 text-body-lg cursor-pointer">
            {t('takServerPanel.remoteAutoConnect')}
          </label>
        </div>
      </div>

      <div className="border-ink-700 space-y-3 border-t pt-4">
        <h4 className="text-ink-300 text-label font-medium">
          {t('takServerPanel.remoteCertificates')}
        </h4>
        <CredentialSummary credentials={credentials} />
        <p className="text-ink-400 text-label">{t('takServerPanel.remoteImportHint')}</p>
        <div
          data-setting-anchor="tak.remote.importCertificates"
          className="flex flex-wrap items-end gap-2"
        >
          <div>
            <label htmlFor={`${id}-password`} className="text-ink-400 text-label mb-1 block">
              {t('takServerPanel.remotePasswordLabel')}
            </label>
            <input
              id={`${id}-password`}
              aria-label={t('takServerPanel.remotePasswordLabel')}
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              disabled={active || isBusy}
              className={`${INPUT_BOX_CLASS} w-48`}
            />
          </div>
          <button
            type="button"
            onClick={handleImport}
            aria-label={t('takServerPanel.remoteImport')}
            disabled={active || isBusy}
            className={buttonClassName('secondary', 'md')}
          >
            {t('takServerPanel.remoteImport')}
          </button>
          {credentials && (credentials.caSubjects.length > 0 || credentials.clientSubject) && (
            <button
              type="button"
              onClick={relay.clearCredentials}
              aria-label={t('takServerPanel.remoteClear')}
              disabled={active || isBusy}
              className={buttonClassName('secondary', 'md')}
            >
              {t('takServerPanel.remoteClear')}
            </button>
          )}
        </div>
        {useTls && (
          <EnrollForm
            host={host}
            hostValid={hostValid}
            verifyServer={verifyServer}
            allowNameMismatch={allowNameMismatch && hasCa}
            disabled={active || isBusy}
            onEnroll={handleEnroll}
          />
        )}
      </div>

      <div data-setting-anchor="tak.remote.connect" className="pt-1">
        {active ? (
          <button
            type="button"
            onClick={relay.disconnect}
            aria-label={t('takServerPanel.remoteDisconnect')}
            disabled={isBusy}
            className={buttonClassName('destructive', 'lg')}
          >
            {t('takServerPanel.remoteDisconnect')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            aria-label={t('takServerPanel.remoteConnect')}
            disabled={isBusy || !hostValid || !portValid}
            className={buttonClassName('primary', 'md')}
          >
            {t('takServerPanel.remoteConnect')}
          </button>
        )}
      </div>
    </div>
  );
}

/** Relay to a remote TAK server; sits in the TAK panel beside the local server controls. */
export default function TakRemoteRelaySection() {
  const { t } = useTranslation();
  const relay = useTakRemoteRelay();
  return (
    <SettingsSection
      title={t('takServerPanel.remoteTitle')}
      description={t('takServerPanel.remoteDescription')}
      bodyClassName="space-y-3"
    >
      {/* The form seeds its fields from saved settings, so mount it once they have loaded. */}
      {relay.savedSettings !== undefined && (
        <RemoteRelayForm initial={relay.savedSettings ?? DEFAULT_REMOTE_SETTINGS} relay={relay} />
      )}
    </SettingsSection>
  );
}
