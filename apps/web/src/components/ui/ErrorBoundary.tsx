import * as React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error ? error.message : 'An unexpected rendering error occurred.',
    };
  }

  handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: null });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto my-12 max-w-xl rounded-lg border border-red-300 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 shrink-0 text-red-700" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Unexpected Application UI Error
              </h1>
              <p className="mt-1 text-sm text-slate-700">
                The interface encountered an unexpected error and prevented a full crash.
              </p>
              {this.state.errorMessage ? (
                <pre className="mt-3 overflow-x-auto rounded bg-slate-100 p-3 font-mono text-xs text-slate-800">
                  {this.state.errorMessage}
                </pre>
              ) : null}
              <div className="mt-4 flex gap-3">
                <Button variant="primary" size="sm" onClick={this.handleReset}>
                  Attempt Recovery
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.location.assign('/')}>
                  Return to Welcome Screen
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
