import { CircleCheck, CircleX, Info, Siren, TriangleAlert, X } from 'lucide-react-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { type Tone, TONE_ICON_CLASS, TONE_STRIPE_CLASS } from './ui/tone';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'emergency';

const TOAST_ICON: Record<ToastType, typeof Info> = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
  emergency: Siren,
};

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
}

export interface PushAppToastOptions {
  action?: ToastAction;
}

interface ToastContextValue {
  addToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    options?: PushAppToastOptions,
  ) => void;
}

type ToastFn = (
  message: string,
  type?: ToastType,
  duration?: number,
  options?: PushAppToastOptions,
) => void;

const ToastContext = createContext<ToastContextValue>({
  addToast: () => {},
});

/** Module bridge so non-React code (runtimes, lib) can surface toasts when the provider is mounted. */
let externalAddToast: ToastFn | null = null;

export function pushAppToast(
  message: string,
  type: ToastType = 'info',
  duration = 4000,
  options?: PushAppToastOptions,
): void {
  externalAddToast?.(message, type, duration, options);
}

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextIdRef = useRef(0);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 4000, options?: PushAppToastOptions) => {
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev, { id, message, type, duration, action: options?.action }]);
    },
    [],
  );

  useEffect(() => {
    externalAddToast = addToast;
    return () => {
      if (externalAddToast === addToast) externalAddToast = null;
    };
  }, [addToast]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast container, bottom right, above the status bar and the phone-width bottom nav. */}
      <div
        data-toast-stack=""
        className="pointer-events-none fixed right-4 bottom-[calc(var(--shell-bottom-chrome,0px)+0.75rem)] z-50 flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_TONE: Record<ToastType, Tone> = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info',
  emergency: 'danger',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const remainingRef = useRef(toast.duration);
  const startedAtRef = useRef(0);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
    dismissTimerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }, [onDismiss, toast.id]);

  const startTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(dismiss, remainingRef.current);
  }, [dismiss]);

  // Hovering or focusing a toast pauses its timer, so it never vanishes while being read or used.
  const pauseTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    remainingRef.current = Math.max(
      1000,
      remainingRef.current - (Date.now() - startedAtRef.current),
    );
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      setVisible(true);
    });
    remainingRef.current = toast.duration;
    startTimer();
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(dismissTimerRef.current);
    };
  }, [toast, startTimer]);

  const Icon = TOAST_ICON[toast.type];
  const tone = TOAST_TONE[toast.type];
  const urgent = toast.type === 'error' || toast.type === 'emergency';
  const emergency = toast.type === 'emergency';

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      onFocus={pauseTimer}
      onBlur={startTimer}
      className={`shadow-level-4 rounded-card text-body-lg pointer-events-auto relative flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 overflow-hidden border py-3 pr-3 pl-4 transition-all duration-200 ${
        emergency ? 'bg-danger-900 border-danger-500' : 'bg-deep-black border-ink-700'
      } ${visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${TONE_STRIPE_CLASS[tone]}`} />
      <Icon
        aria-hidden
        className={`mt-0.5 h-4 w-4 shrink-0 ${emergency ? 'text-danger-200' : TONE_ICON_CLASS[tone]}`}
      />
      <span
        className={`min-w-0 flex-1 leading-snug ${emergency ? 'text-danger-50' : 'text-ink-100'}`}
      >
        {toast.message}
      </span>
      <div className="-my-0.5 flex shrink-0 items-center gap-1">
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              dismiss();
            }}
            aria-label={toast.action.label}
            className="text-bright-green hover:bg-ink-800 rounded-control text-label px-2 py-1 font-semibold"
          >
            {toast.action.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('common.dismiss')}
          title={t('common.dismiss')}
          className="text-muted hover:text-ink-100 hover:bg-ink-800 rounded-control flex h-6 w-6 items-center justify-center"
        >
          <X aria-hidden className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
