import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

import { errLikeToLogString } from '../lib/errLikeToLogString';
import i18n from '../lib/i18n';

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  resetError: () => void;
}

interface Props {
  children: ReactNode;
  /** When any value changes after an error, clear the error state (re-mount children). */
  resetKeys?: readonly unknown[];
  /** Optional custom fallback; default is the centered Try again UI. */
  fallback?: (props: ErrorBoundaryFallbackProps) => ReactNode;
  /** Called when the default Try again button (or fallback `resetError`) recovers. */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function resetKeysChanged(
  prev: readonly unknown[] | undefined,
  next: readonly unknown[] | undefined,
): boolean {
  if (prev === next) return false;
  if (!prev || !next) return prev !== next;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    if (!Object.is(prev[i], next[i])) return true;
  }
  return false;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      '[ErrorBoundary] caught: ' +
        errLikeToLogString(error) +
        ' info=' +
        errLikeToLogString(errorInfo),
    );
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetError();
    }
  }

  private resetError = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.resetError,
        });
      }
      return (
        <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
          <div className="text-display text-danger-400 font-semibold">
            {i18n.t('errorBoundary.title')}
          </div>
          <div
            className="rounded-card border-danger-800 bg-danger-900/30 w-full max-w-lg border p-4"
            role="alert"
          >
            <p className="text-body-lg text-danger-300 font-mono break-words">
              {this.state.error?.message || i18n.t('errorBoundary.unexpectedError')}
            </p>
          </div>
          <button
            type="button"
            onClick={this.resetError}
            className="bg-ink-700 text-ink-200 hover:bg-ink-600 rounded-card text-body-lg px-6 py-2 font-medium transition-colors"
          >
            {i18n.t('errorBoundary.tryAgain')}
          </button>
          <p className="text-muted text-label">{i18n.t('errorBoundary.persistHint')}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
