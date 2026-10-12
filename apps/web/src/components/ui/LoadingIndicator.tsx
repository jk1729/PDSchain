import { Loader2 } from 'lucide-react';

export interface LoadingIndicatorProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function LoadingIndicator({
  label = 'Loading service telemetry...',
  size = 'md',
}: LoadingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
    >
      <Loader2 className={`${sizeMap[size]} animate-spin text-slate-800`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
