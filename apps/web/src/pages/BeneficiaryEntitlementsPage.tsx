import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { BeneficiaryItem, CommodityItem, EntitlementItem } from '../types/distribution';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Award, Search, PlusCircle, CheckCircle2, UserPlus } from 'lucide-react';

export const BeneficiaryEntitlementsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isOfficerOrAdmin = hasRole('ADMIN') || hasRole('DISTRICT_OFFICER');

  const [beneficiaryRef, setBeneficiaryRef] = useState('BENEFICIARY:RC-2026-0001');
  const [period, setPeriod] = useState(202610);
  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [beneficiary, setBeneficiary] = useState<BeneficiaryItem | null>(null);
  const [entitlements, setEntitlements] = useState<Record<string, EntitlementItem>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Beneficiary Enrollment (Officers/Admin)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newBenRef, setNewBenRef] = useState('');
  const [newDistrictCode, setNewDistrictCode] = useState('DIST-BLR-URBAN');
  const [isRegistering, setIsRegistering] = useState(false);

  // Set Entitlement Form (Officers/Admin)
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configComm, setConfigComm] = useState('COMMODITY:RICE');
  const [configQty, setConfigQty] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiClient
      .fetchCommodities()
      .then(setCommodities)
      .catch(() => {});
  }, []);

  const handleSearch = async (arg?: React.FormEvent | string, preserveSuccess = false) => {
    if (arg && typeof arg !== 'string') arg.preventDefault();
    const targetRef = (typeof arg === 'string' ? arg : beneficiaryRef).trim();
    setIsLoading(true);
    setErrorMsg(null);
    if (!preserveSuccess) {
      setSuccessMsg(null);
    }
    setBeneficiary(null);
    setEntitlements({});

    try {
      const ben = await apiClient.fetchBeneficiary(targetRef);
      setBeneficiary(ben);

      const entMap: Record<string, EntitlementItem> = {};
      for (const c of commodities) {
        try {
          const ent = await apiClient.fetchEntitlement(targetRef, period, c.id);
          entMap[c.id] = ent;
        } catch {
          // not found
        }
      }
      setEntitlements(entMap);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const qty = Number(configQty);
      if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero');

      await apiClient.setEntitlement({
        beneficiaryRef: beneficiaryRef.trim(),
        period,
        commodityId: configComm,
        allocatedQuantity: qty,
      });

      setSuccessMsg(`Monthly entitlement successfully configured on-chain.`);
      setShowConfigModal(false);
      setConfigQty('');
      await handleSearch(beneficiaryRef, true);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setErrorMsg(null);
    try {
      const createdRef = newBenRef.trim();
      if (!createdRef) throw new Error('Beneficiary reference is required');
      await apiClient.registerBeneficiary({
        beneficiaryRef: createdRef,
        districtCode: newDistrictCode.trim(),
      });
      setBeneficiaryRef(createdRef);
      setShowRegisterModal(false);
      setNewBenRef('');
      setSuccessMsg(`Successfully registered beneficiary ${createdRef} on ledger.`);
      await handleSearch(createdRef, true);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="h-7 w-7 text-indigo-600" />
            Beneficiary Entitlements & Public Quota Portal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Transparent on-chain ration quota verification and monthly entitlement allocation.
          </p>
        </div>
        {isOfficerOrAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              Enroll Beneficiary
            </Button>
            {beneficiary && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5"
              >
                <PlusCircle className="h-4 w-4" />
                Set / Adjust Entitlement
              </Button>
            )}
          </div>
        )}
      </div>

      {errorMsg && <ErrorDisplay message={errorMsg} onRetry={handleSearch} />}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-900">{successMsg}</p>
        </div>
      )}

      {/* Search Bar */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Beneficiary Reference Code"
              value={beneficiaryRef}
              onChange={(e) => setBeneficiaryRef(e.target.value)}
              placeholder="e.g. BENEFICIARY:RC-2026-0001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entitlement Period
            </label>
            <div className="flex gap-2">
              <Input
                label=""
                type="number"
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                placeholder="202610"
                required
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <Search className="h-4 w-4" />
                Query
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {isLoading && <LoadingIndicator message="Querying smart contract state..." />}

      {/* Results View */}
      {beneficiary && (
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">Verified On-Chain Beneficiary</p>
                <p className="font-mono text-base font-bold text-gray-900">
                  {beneficiary.beneficiaryRef}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">District Authority</p>
                <p className="text-sm font-semibold text-gray-800">{beneficiary.districtCode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Verification Status</p>
                <StatusBadge
                  status={beneficiary.isActive ? 'operational' : 'offline'}
                  label={beneficiary.isActive ? 'Active' : 'Suspended'}
                />
              </div>
            </div>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Quota Breakdown for Period {period}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {commodities.map((c) => {
                const ent = entitlements[c.id];
                const allocated = ent?.allocatedQuantity ?? 0;
                const distributed = ent?.distributedQuantity ?? 0;
                const remaining = ent?.remainingQuantity ?? 0;

                return (
                  <Card key={c.id} className="p-5 bg-white border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{c.name}</h3>
                        <p className="text-xs text-gray-500 font-mono">{c.id}</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                        Period {period}
                      </span>
                    </div>

                    <div className="space-y-2 mt-4 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Total Monthly Entitlement:</span>
                        <span className="font-mono font-medium">
                          {allocated} {c.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Already Received:</span>
                        <span className="font-mono font-medium text-emerald-700">
                          {distributed} {c.unit}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-indigo-900 pt-2 border-t border-gray-200">
                        <span>Remaining Available:</span>
                        <span className="font-mono text-lg text-indigo-600">
                          {remaining} {c.unit}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal for setting entitlement */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-xl rounded-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Configure Monthly Entitlement Quota
            </h3>
            <form onSubmit={handleSaveEntitlement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
                <select
                  value={configComm}
                  onChange={(e) => setConfigComm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm"
                >
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Allocated Quantity
                </label>
                <Input
                  label=""
                  type="number"
                  min="1"
                  value={configQty}
                  onChange={(e) => setConfigQty(e.target.value)}
                  placeholder="e.g. 35"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfigModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? 'Saving On-Chain...' : 'Save Entitlement'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal for enrolling new beneficiary */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 bg-white shadow-xl rounded-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Enroll Beneficiary on Blockchain Ledger
            </h3>
            <form onSubmit={handleRegisterBeneficiary} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beneficiary Reference
                </label>
                <Input
                  label=""
                  value={newBenRef}
                  onChange={(e) => setNewBenRef(e.target.value)}
                  placeholder="e.g. BENEFICIARY:RC-2026-0001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned District
                </label>
                <Input
                  label=""
                  value={newDistrictCode}
                  onChange={(e) => setNewDistrictCode(e.target.value)}
                  placeholder="DIST-BLR-URBAN"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRegisterModal(false)}
                  disabled={isRegistering}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isRegistering}>
                  {isRegistering ? 'Registering On-Chain...' : 'Register Beneficiary'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
