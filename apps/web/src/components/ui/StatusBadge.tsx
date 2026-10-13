import * as React from 'react';

export type StatusBadgeVariant =
  'operational' | 'degraded' | 'offline' | 'pending' | 'neutral' | 'success' | 'error' | 'warning';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusBadgeVariant;
  label: string;
}

const badgeStyles: Record<StatusBadgeVariant, { wrapper: string; dot: string }> = {
  operational: {
    wrapper: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    dot: 'bg-emerald-600',
  },
  success: {
    wrapper: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    dot: 'bg-emerald-600',
  },
  degraded: {
    wrapper: 'bg-amber-50 text-amber-900 border-amber-300',
    dot: 'bg-amber-600',
  },
  warning: {
    wrapper: 'bg-amber-50 text-amber-900 border-amber-300',
    dot: 'bg-amber-600',
  },
  offline: {
    wrapper: 'bg-red-50 text-red-900 border-red-300',
    dot: 'bg-red-600',
  },
  error: {
    wrapper: 'bg-red-50 text-red-900 border-red-300',
    dot: 'bg-red-600',
  },
  pending: {
    wrapper: 'bg-sky-50 text-sky-900 border-sky-300',
    dot: 'bg-sky-600 animate-pulse',
  },
  neutral: {
    wrapper: 'bg-slate-100 text-slate-800 border-slate-300',
    dot: 'bg-slate-500',
  },
};

export function StatusBadge({ status, label, className = '', ...props }: StatusBadgeProps) {
  const style = badgeStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style.wrapper} ${className}`}
      {...props}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
