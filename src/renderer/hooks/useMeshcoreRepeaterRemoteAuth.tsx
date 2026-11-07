import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog } from '@/renderer/components/ui/Dialog';
import {
  hasResolvableAdminPassword,
  setAdminPassword,
} from '@/renderer/lib/meshcoreInfraAdminSecrets';
import { getMeshcoreRepeaterCredential } from '@/renderer/lib/meshcoreRepeaterCredentialStorage';
import { getMeshcoreRoomCredential } from '@/renderer/lib/meshcoreRoomCredentialStorage';
import { Z_NESTED_AUTH_OVERLAY } from '@/renderer/lib/modalZIndex';

import { useToast } from '../components/Toast';
import { buttonClassName } from '../components/ui/Button';
import { INPUT_BOX_CLASS } from '../components/ui/formClasses';

/** Firmware/admin passwords are short; cap input to avoid accidental paste floods. */
const MESHCORE_INFRA_ADMIN_PASSWORD_MAX_LENGTH = 128;

export interface RepeaterAuthResult {
  ok: boolean;
  saved?: boolean;
}

interface PendingInfraAuth {
  nodeId: number;
  displayName: string;
  hwModel: string | undefined;
  /** When true, show modal even if a saved credential exists (change password). */
  forcePrompt: boolean;
}

function InfraRemoteAuthFields({
  password,
  onPasswordChange,
  onSubmit,
  disabled,
  passwordInputId,
}: {
  password: string;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  passwordInputId: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[12rem] flex-1 space-y-1">
        <label htmlFor={passwordInputId} className="text-ink-400 text-label">
          {t('repeatersPanel.remoteAuthLabel')}
        </label>
        <input
          id={passwordInputId}
          type="password"
          autoComplete="off"
          value={password}
          onChange={(e) => {
            onPasswordChange(e.target.value.slice(0, MESHCORE_INFRA_ADMIN_PASSWORD_MAX_LENGTH));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          disabled={disabled}
          maxLength={MESHCORE_INFRA_ADMIN_PASSWORD_MAX_LENGTH}
          placeholder={t('repeatersPanel.remoteAuthPlaceholder')}
          className={`${INPUT_BOX_CLASS} w-full`}
        />
      </div>
    </div>
  );
}

function existingAdminPasswordHint(nodeId: number, hwModel: string | undefined): string {
  if (hwModel === 'Room') {
    return getMeshcoreRoomCredential(nodeId)?.adminPassword ?? '';
  }
  return getMeshcoreRepeaterCredential(nodeId)?.password ?? '';
}

/**
 * Ops admin-password modal for Repeaters & Rooms.
 * Persists via meshcoreInfraAdminSecrets (never writes room secrets to repeater keys).
 */
export function useMeshcoreRepeaterRemoteAuth() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<PendingInfraAuth | null>(null);
  const resolverRef = useRef<((result: RepeaterAuthResult) => void) | null>(null);
  const passwordId = useId();

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current({ ok: false });
        resolverRef.current = null;
      }
    };
  }, []);

  const finishModal = useCallback(
    async (
      ok: boolean,
      mode: 'cancel' | 'skip' | 'save',
      password: string,
      rememberPassword: boolean,
      nodeId: number,
      hwModel: string | undefined,
    ) => {
      if (!ok || mode === 'cancel') {
        resolverRef.current?.({ ok: false });
        resolverRef.current = null;
        setModalOpen(false);
        setPending(null);
        return;
      }
      if (mode === 'skip') {
        resolverRef.current?.({ ok: true });
        resolverRef.current = null;
        setModalOpen(false);
        setPending(null);
        return;
      }
      const trimmed = password.trim();
      let saved = false;
      if (trimmed) {
        try {
          await setAdminPassword(nodeId, hwModel, trimmed, { persist: rememberPassword });
          saved = rememberPassword;
        } catch {
          // catch-no-log-ok credential storage already logs persist failures
          if (rememberPassword) {
            addToast(t('repeatersPanel.rememberPasswordSaveFailed'), 'error');
          }
        }
      }
      resolverRef.current?.({ ok: true, saved });
      resolverRef.current = null;
      setModalOpen(false);
      setPending(null);
    },
    [addToast, t],
  );

  const openAuthModal = useCallback(
    (
      nodeId: number,
      displayName: string,
      forcePrompt: boolean,
      hwModel?: string,
    ): Promise<RepeaterAuthResult> => {
      if (!forcePrompt && hasResolvableAdminPassword(nodeId, hwModel)) {
        return Promise.resolve({ ok: true });
      }
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setPending({ nodeId, displayName, hwModel, forcePrompt });
        setModalOpen(true);
      });
    },
    [],
  );

  const ensureRepeaterAuth = useCallback(
    (nodeId: number, displayName: string, hwModel?: string): Promise<RepeaterAuthResult> => {
      return openAuthModal(nodeId, displayName, false, hwModel);
    },
    [openAuthModal],
  );

  const promptRepeaterPassword = useCallback(
    (nodeId: number, displayName: string, hwModel?: string): Promise<RepeaterAuthResult> => {
      return openAuthModal(nodeId, displayName, true, hwModel);
    },
    [openAuthModal],
  );

  const RemoteAuthModal =
    modalOpen && pending != null ? (
      <Dialog
        title={t('repeatersPanel.remoteAuthTitle')}
        description={
          <>
            <span className="text-ink-200 block font-medium">{pending.displayName}</span>
            <span className="block">{t('repeatersPanel.remoteAuthModalHelp')}</span>
          </>
        }
        onClose={() => {
          void finishModal(false, 'cancel', '', true, pending.nodeId, pending.hwModel);
        }}
        size="md"
        zIndex={Z_NESTED_AUTH_OVERLAY}
        backdropLabel={t('repeatersPanel.remoteAuthCancelDialog')}
      >
        <div className="space-y-3 pb-1">
          <ModalAuthBody
            passwordId={passwordId}
            nodeId={pending.nodeId}
            hwModel={pending.hwModel}
            onCancel={() => {
              void finishModal(false, 'cancel', '', true, pending.nodeId, pending.hwModel);
            }}
            onSkip={() => {
              void finishModal(true, 'skip', '', true, pending.nodeId, pending.hwModel);
            }}
            onSave={(pwd, remember) => {
              void finishModal(true, 'save', pwd, remember, pending.nodeId, pending.hwModel);
            }}
            cancelLabel={t('common.cancel')}
            skipLabel={t('repeatersPanel.remoteAuthNoPassword')}
            continueLabel={t('repeatersPanel.remoteAuthContinue')}
          />
        </div>
      </Dialog>
    ) : null;

  return { ensureRepeaterAuth, promptRepeaterPassword, RemoteAuthModal };
}

function ModalAuthBody({
  passwordId,
  nodeId,
  hwModel,
  onCancel,
  onSkip,
  onSave,
  cancelLabel,
  skipLabel,
  continueLabel,
}: {
  passwordId: string;
  nodeId: number;
  hwModel: string | undefined;
  onCancel: () => void;
  onSkip: () => void;
  onSave: (password: string, rememberPassword: boolean) => void;
  cancelLabel: string;
  skipLabel: string;
  continueLabel: string;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState(() => existingAdminPasswordHint(nodeId, hwModel));
  const [rememberPassword, setRememberPassword] = useState(true);
  const submitPassword = () => {
    onSave(password, rememberPassword);
  };

  return (
    <>
      <InfraRemoteAuthFields
        password={password}
        onPasswordChange={setPassword}
        onSubmit={submitPassword}
        passwordInputId={passwordId}
      />
      <label className="text-ink-400 text-label flex items-center gap-2">
        <input
          type="checkbox"
          checked={rememberPassword}
          onChange={(e) => {
            setRememberPassword(e.target.checked);
          }}
          aria-label={t('repeatersPanel.rememberPassword')}
        />
        {t('repeatersPanel.rememberPassword')}
      </label>
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className={buttonClassName('ghost', 'md')}
          aria-label={cancelLabel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className={buttonClassName('secondary', 'md')}
          aria-label={skipLabel}
        >
          {skipLabel}
        </button>
        <button
          type="button"
          onClick={submitPassword}
          className={buttonClassName('primary', 'md')}
          aria-label={continueLabel}
        >
          {continueLabel}
        </button>
      </div>
    </>
  );
}
