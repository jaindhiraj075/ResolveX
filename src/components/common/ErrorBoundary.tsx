import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, LogIn, ChevronDown, ChevronUp } from 'lucide-react';
import Button from './Button';
import { formatErrorMessage } from '../../utils/errorUtils';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  inline?: boolean;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  detailsOpen: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    detailsOpen: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ResolveX ErrorBoundary Caught Exception]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, detailsOpen: false });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleNavigateLogin = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = formatErrorMessage(this.state.error, 'An unexpected rendering error occurred in ResolveX.');
      const isReactError31 = errorMessage.includes('Minified React error #31') || 
        (this.state.error?.message && this.state.error.message.includes('React child'));

      const isInline = this.props.inline;
      const containerClasses = isInline
        ? 'w-full py-12 px-4 flex items-center justify-center bg-transparent text-slate-900 dark:text-slate-100'
        : 'min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors';

      return (
        <div className={containerClasses}>
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center animate-in fade-in duration-200">
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4 shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              System Boundary Guard
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
              {isReactError31
                ? 'A response data rendering issue occurred. Safe error recovery has intercepted this so your session remains secure.'
                : errorMessage}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="primary"
                onClick={this.handleReset}
                icon={<RefreshCw className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Reload Application
              </Button>
              <Button
                variant="outline"
                onClick={this.handleNavigateLogin}
                icon={<LogIn className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Go to Sign In
              </Button>
            </div>

            {/* Diagnostic Details Accordion */}
            {this.state.error && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ detailsOpen: !prev.detailsOpen }))}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <span>Diagnostic Information</span>
                  {this.state.detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {this.state.detailsOpen && (
                  <div className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    <p className="font-bold text-rose-400">
                      {String((this.state.error as any)?.name || 'Error')}: {String((this.state.error as any)?.message || errorMessage)}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="mt-2 text-slate-400 text-[10px] whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
