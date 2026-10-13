import * as React from 'react';
import { AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { apiClient, ApiClientError } from '../lib/api-client';
import { CanonicalRole } from '../types/auth';

export function StaffRequestCreatePage() {
  const navigate = useNavigate();

  const [requestedRole, setRequestedRole] = React.useState<CanonicalRole>('FPS_OPERATOR');
  const [districtCode, setDistrictCode] = React.useState('');
  const [shopCode, setShopCode] = React.useState('');
  const [warehouseCode, setWarehouseCode] = React.useState('');
  const [justification, setJustification] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (justification.trim().length < 15) {
      setErrorMessage('Justification must be at least 15 characters long.');
      return;
    }

    if (requestedRole === 'FPS_OPERATOR' && !shopCode.trim()) {
      setErrorMessage('Fair Price Shop code is required for FPS Operator role requests.');
      return;
    }

    if (requestedRole === 'WAREHOUSE_MANAGER' && !warehouseCode.trim()) {
      setErrorMessage('Warehouse code is required for Warehouse Manager role requests.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createStaffRequest({
        requestedRole,
        districtCode: districtCode.trim().toUpperCase(),
        shopCode: requestedRole === 'FPS_OPERATOR' ? shopCode.trim().toUpperCase() : undefined,
        warehouseCode:
          requestedRole === 'WAREHOUSE_MANAGER' ? warehouseCode.trim().toUpperCase() : undefined,
        justification: justification.trim(),
      });

      navigate('/profile');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to submit staff access request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="mb-4">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Profile
        </Link>
      </div>

      <Card
        title="Submit Staff Access Request"
        description="Apply for operational privileges (FPS Operator, Warehouse Manager, or District Officer). Requests require explicit administrator review."
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
          <div>
            <label
              htmlFor="request-role"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Requested Operational Role
            </label>
            <select
              id="request-role"
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as CanonicalRole)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="FPS_OPERATOR">Fair Price Shop Operator (FPS_OPERATOR)</option>
              <option value="WAREHOUSE_MANAGER">Warehouse Manager (WAREHOUSE_MANAGER)</option>
              <option value="DISTRICT_OFFICER">District Officer (DISTRICT_OFFICER)</option>
            </select>
          </div>

          <Input
            id="request-district"
            type="text"
            label="District Code"
            placeholder="e.g. DIST-CENTRAL or DEL-NORTH"
            value={districtCode}
            onChange={(e) => setDistrictCode(e.target.value)}
            required
            autoComplete="off"
          />

          {requestedRole === 'FPS_OPERATOR' ? (
            <Input
              id="request-shop"
              type="text"
              label="Fair Price Shop Code (Required for FPS Operator)"
              placeholder="e.g. FPS-101"
              value={shopCode}
              onChange={(e) => setShopCode(e.target.value)}
              required
              autoComplete="off"
            />
          ) : null}

          {requestedRole === 'WAREHOUSE_MANAGER' ? (
            <Input
              id="request-warehouse"
              type="text"
              label="Warehouse Facility Code (Required for Warehouse Manager)"
              placeholder="e.g. WH-SOUTH-02"
              value={warehouseCode}
              onChange={(e) => setWarehouseCode(e.target.value)}
              required
              autoComplete="off"
            />
          ) : null}

          <div>
            <label
              htmlFor="request-justification"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Official Justification & Order Reference
            </label>
            <textarea
              id="request-justification"
              rows={4}
              required
              minLength={15}
              placeholder="State your official deployment order, government ID, or appointment details (min 15 characters)..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <span className="mt-1 block text-right text-xs text-slate-500">
              {justification.length} / 15 characters minimum
            </span>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center"
              disabled={isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Submitting Request...' : 'Submit Request for Administrator Review'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
