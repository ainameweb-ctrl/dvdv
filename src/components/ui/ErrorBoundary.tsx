import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { formatFirebaseError } from '../../utils/firebaseErrors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  scopeLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('UI ErrorBoundary caught an error:', error, info);
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const friendly = formatFirebaseError(this.state.error);

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0f] px-4 text-zinc-100">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#13131c] p-6 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-rose-500/15 p-2.5 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-bold">
                {this.props.scopeLabel || 'Application'} encountered an error
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-300">{friendly}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#e50914] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
