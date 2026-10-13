import * as React from 'react';
import { AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ApiClientError } from '../../lib/api-client';

export function RegisterPage() {
  const { register } = useAuth();

  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [acceptTerms, setAcceptTerms] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successInfo, setSuccessInfo] = React.useState<{ message: string; email: string } | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters long.');
      return;
    }

    if (!acceptTerms) {
      setErrorMessage(
        'You must accept the terms of service and public distribution privacy notice.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        fullName,
        email,
        password,
        confirmPassword,
        acceptTerms,
      });

      setSuccessInfo({
        message: res.message,
        email,
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Registration failed. Please check the entered details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successInfo) {
    return (
      <div className="mx-auto max-w-md py-6">
        <Card
          title="Registration Submitted"
          description="Your citizen registration has been recorded."
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-900">Check Your Email</p>
                <p className="mt-1 text-emerald-700">
                  We have dispatched an activation token to{' '}
                  <span className="font-mono font-medium">{successInfo.email}</span>.
                </p>
                <p className="mt-2 text-xs text-emerald-600">
                  In local development, the token is written to{' '}
                  <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">
                    .dev-mailbox/
                  </code>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link to="/verify-email">
                <Button variant="primary" className="w-full justify-center">
                  Enter Verification Token
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" className="w-full justify-center">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <Card
        title="Citizen Registration"
        description="Register as a beneficiary citizen on PDSChain v2 to view ration allotments and apply for staff assignments."
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
            id="register-fullname"
            type="text"
            label="Full Name (Beneficiary / Citizen)"
            placeholder="Aarav Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />

          <Input
            id="register-email"
            type="email"
            label="Official Email Address"
            placeholder="citizen@example.gov.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            id="register-password"
            type="password"
            label="Password (min 10 characters, upper, lower, number, symbol)"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Input
            id="register-confirm-password"
            type="password"
            label="Confirm Password"
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <div className="flex items-start gap-2 pt-1">
            <input
              id="register-terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
              className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="register-terms" className="text-xs text-slate-700 leading-snug">
              I acknowledge the public distribution data governance terms and understand that all
              operations and staff authorizations will be cryptographically auditable.
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            disabled={isSubmitting}
          >
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Creating Account...' : 'Register as Citizen'}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-600">
          Already registered?{' '}
          <Link
            to="/login"
            className="font-semibold text-sky-600 hover:text-sky-800 hover:underline"
          >
            Sign in here
          </Link>
        </div>
      </Card>
    </div>
  );
}
