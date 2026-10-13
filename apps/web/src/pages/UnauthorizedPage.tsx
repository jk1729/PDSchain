import { ArrowLeft, Home, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-lg py-12">
      <Card
        title="403 — Access Denied"
        description="You do not have permission to view or execute actions on this restricted resource."
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <ShieldAlert className="h-6 w-6 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-semibold text-amber-950">Role-Based Access Policy Enforced</p>
              <p className="mt-1 text-amber-800">
                Your account is currently assigned the following canonical role(s):{' '}
                <span className="font-semibold">
                  {user?.roles?.join(', ') || 'Unauthenticated'}
                </span>
                .
              </p>
              <p className="mt-2 text-xs text-amber-700">
                If your duties require Fair Price Shop, Warehouse, or District Officer
                authorization, please submit a staff access request for administrator review.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Link to="/profile" className="flex-1">
              <Button variant="primary" className="w-full justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Return to Profile
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="secondary" className="w-full justify-center">
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Platform Overview
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
