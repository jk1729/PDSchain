import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  code?: string;
  correlationId?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({
  title = 'Service Communication Error',
  message,
  code,
  correlationId,
  onRetry,
}: ErrorDisplayProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-300 bg-red-50/90 p-4 text-red-950"
      data-testid="error-display"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-red-900">{title}</h3>
            {code ? (
              <span className="rounded bg-red-100 px-2 py-0.5 font-mono text-xs font-medium text-red-800">
                {code}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-red-900">{message}</p>
          {correlationId ? (
            <p className="mt-1.5 font-mono text-xs text-red-800">Correlation ID: {correlationId}</p>
          ) : null}
          {onRetry ? (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Retry Check
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
