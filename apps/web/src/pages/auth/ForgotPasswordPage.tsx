import * as React from 'react';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { apiClient, ApiClientError } from '../../lib/api-client';

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiClient.forgotPassword(email.trim());
      setSuccessMessage(res.message);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to submit password reset request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <Card
        title="Reset Password"
        description="Enter your registered email address to receive password reset instructions."
      >
        {successMessage ? (
          <div className="space-y-4">
            <div
              role="status"
              className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-semibold text-emerald-900">Reset Instructions Dispatched</p>
                <p className="mt-1 text-emerald-700">{successMessage}</p>
                <p className="mt-2 text-xs text-emerald-600">
                  In development mode, inspect{' '}
                  <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">
                    .dev-mailbox/
                  </code>{' '}
                  for the reset token.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link to="/reset-password" className="flex-1">
                <Button variant="primary" className="w-full justify-center">
                  Enter Reset Token
                </Button>
              </Link>
              <Link to="/login" className="flex-1">
                <Button variant="secondary" className="w-full justify-center">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {errorMessage ? (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="forgot-email"
                type="email"
                label="Account Email Address"
                placeholder="citizen@domain.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center"
                disabled={isSubmitting}
              >
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                {isSubmitting ? 'Requesting Reset...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-sky-600 hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
