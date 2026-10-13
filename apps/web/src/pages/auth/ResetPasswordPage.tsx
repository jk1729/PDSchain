import * as React from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { apiClient, ApiClientError } from '../../lib/api-client';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryToken = searchParams.get('token') ?? '';
  const [token, setToken] = React.useState(queryToken);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage('Reset token is required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match. Please verify.');
      return;
    }

    if (newPassword.length < 10) {
      setErrorMessage('New password must be at least 10 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.resetPassword({
        token: token.trim(),
        newPassword,
        confirmPassword,
      });

      navigate('/login', {
        state: {
          notice:
            'Password successfully updated. All active sessions have been revoked. Please sign in with your new password.',
        },
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to reset password. The token may be expired or invalid.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <Card
        title="Set New Password"
        description="Enter your reset token and configure a secure new password for your account."
      >
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
            id="reset-token"
            type="text"
            label="Password Reset Token"
            placeholder="Paste reset token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            autoComplete="off"
          />

          <Input
            id="reset-new-password"
            type="password"
            label="New Password (min 10 chars, uppercase, lowercase, number, symbol)"
            placeholder="••••••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Input
            id="reset-confirm-password"
            type="password"
            label="Confirm New Password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            disabled={isSubmitting}
          >
            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Resetting Password...' : 'Save New Password'}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-sky-600 hover:underline">
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
