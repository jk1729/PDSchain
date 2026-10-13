import * as React from 'react';
import { AlertCircle, CheckCircle2, LogIn } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ApiClientError } from '../../lib/api-client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    const state = location.state as { notice?: string } | null;
    if (state?.notice) {
      setSuccessNotice(state.notice);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else if (user.roles.includes('ADMIN')) {
        navigate('/admin/staff-requests', { replace: true });
      } else {
        navigate('/profile', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
        setErrorCode(err.code);
      } else {
        setErrorMessage('Failed to sign in. Please check your credentials and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <Card
        title="Sign In to PDSChain v2"
        description="Access your account, ration allocations, or operational management portal."
      >
        {successNotice ? (
          <div
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{successNotice}</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium">{errorMessage}</p>
              {errorCode === 'EMAIL_NOT_VERIFIED' ? (
                <p className="mt-1 text-xs text-rose-700">
                  Need a new verification link?{' '}
                  <Link
                    to="/resend-verification"
                    className="underline font-semibold hover:text-rose-900"
                  >
                    Resend verification email
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="login-email"
            type="email"
            label="Email Address"
            placeholder="you@domain.gov.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            id="login-password"
            type="password"
            label="Password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="text-slate-600 underline hover:text-slate-900">
              Forgot your password?
            </Link>
            <Link
              to="/resend-verification"
              className="text-slate-600 underline hover:text-slate-900"
            >
              Resend verification?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            disabled={isSubmitting}
          >
            <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
          Don&apos;t have an account yet?{' '}
          <Link
            to="/register"
            className="font-semibold text-sky-600 hover:text-sky-800 hover:underline"
          >
            Register as a Citizen
          </Link>
        </div>
      </Card>
    </div>
  );
}
