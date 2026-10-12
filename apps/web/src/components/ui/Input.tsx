import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, helperText, error, className = '', ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const describedBy = error ? errorId : helperText ? helperId : undefined;

    return (
      <div className="w-full">
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-800">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`mt-1.5 block w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            error
              ? 'border-red-600 focus:border-red-600 focus:ring-red-600'
              : 'border-slate-300 focus:border-slate-900 focus:ring-slate-900'
          } ${className}`}
          {...props}
        />
        {helperText && !error ? (
          <p id={helperId} className="mt-1 text-xs text-slate-600">
            {helperText}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
