import * as React from 'react';
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { apiClient, ApiClientError } from '../../lib/api-client';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryToken = searchParams.get('token') ?? '';
  const [token, setToken] = React.useState(queryToken);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const executeVerification = React.useCallback(async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setErrorMessage('Please provide a verification token.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.verifyEmail(tokenToVerify.trim());
      setSuccessMessage(res.message);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Email verification failed. The token may be expired or already used.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  React.useEffect(() => {
    if (queryToken && !successMessage && !errorMessage) {
      void executeVerification(queryToken);
    }
  }, [queryToken, executeVerification, successMessage, errorMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeVerification(token);
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <Card
        title="Verify Email Address"
        description="Confirm your email to activate your account and permit login access."
      >
        {successMessage ? (
          <div className="space-y-4">
            <div
              role="status"
              className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-semibold text-emerald-900">Email Verified Successfully</p>
                <p className="mt-1 text-emerald-700">{successMessage}</p>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() =>
                navigate('/login', { state: { notice: 'Email verified. Please sign in.' } })
              }
            >
              Proceed to Sign In
            </Button>
          </div>
        ) : (
          <div>
            {errorMessage ? (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium">{errorMessage}</p>
                  <p className="mt-1 text-xs text-rose-700">
                    Need a fresh token?{' '}
                    <Link
                      to="/resend-verification"
                      className="underline font-semibold hover:text-rose-900"
                    >
                      Request a new verification email
                    </Link>
                  </p>
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="verify-token"
                type="text"
                label="Verification Token"
                placeholder="Paste 64-character token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                autoComplete="off"
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full justify-center"
                disabled={isSubmitting}
              >
                <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                {isSubmitting ? 'Verifying Token...' : 'Verify Email'}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
              Already verified?{' '}
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
