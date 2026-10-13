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
import { Store, UserCheck, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

export const FpsDistributionPage: React.FC = () => {
  const { user } = useAuth();
  const assignedFps = user?.assignments.find((a) => a.shopCode)?.shopCode;
  const [fpsId, setFpsId] = useState(assignedFps || 'FPS-KA-BLR-042');

  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [fpsStock, setFpsStock] = useState<Record<string, number>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(true);

  // Beneficiary Lookup
  const [beneficiaryRef, setBeneficiaryRef] = useState('BENEFICIARY:RC-2026-0001');
  const [beneficiary, setBeneficiary] = useState<BeneficiaryItem | null>(null);
  const [entitlements, setEntitlements] = useState<Record<string, EntitlementItem>>({});
  const [isSearchingBen, setIsSearchingBen] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Distribution Form
  const [period] = useState(202610);
  const [selectedComm, setSelectedComm] = useState('COMMODITY:RICE');
  const [dispenseQty, setDispenseQty] = useState('');
  const [claimRef, setClaimRef] = useState(
    () => `CLAIM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
  );
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributeError, setDistributeError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ msg: string; txHash?: string } | null>(null);

  const loadStock = async () => {
    setIsLoadingStock(true);
    try {
      const commList = await apiClient.fetchCommodities();
      setCommodities(commList);

      const stockMap: Record<string, number> = {};
      for (const c of commList) {
        try {
          const s = await apiClient.fetchFpsStock(fpsId, c.id);
          stockMap[c.id] = s;
        } catch {
          stockMap[c.id] = 0;
        }
      }
      setFpsStock(stockMap);
    } catch (err) {
      setDistributeError((err as Error).message);
    } finally {
      setIsLoadingStock(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, [fpsId]);

  const handleLookupBeneficiary = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLookupError(null);
    setBeneficiary(null);
    setEntitlements({});
    setSuccessResult(null);
    setIsSearchingBen(true);

    try {
      const trimmedRef = beneficiaryRef.trim();
      if (!trimmedRef) throw new Error('Beneficiary reference cannot be empty');

      const ben = await apiClient.fetchBeneficiary(trimmedRef);
      setBeneficiary(ben);

      // Fetch entitlement for all active commodities
      const entMap: Record<string, EntitlementItem> = {};
      for (const c of commodities) {
        try {
          const ent = await apiClient.fetchEntitlement(trimmedRef, period, c.id);
          entMap[c.id] = ent;
        } catch {
          // ignore not found
        }
      }
      setEntitlements(entMap);
    } catch (err) {
      setLookupError((err as Error).message);
    } finally {
      setIsSearchingBen(false);
    }
  };

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setDistributeError(null);
    setSuccessResult(null);
    setIsDistributing(true);

    try {
      const qty = Number(dispenseQty);
      if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero');
      if (!beneficiary) throw new Error('Please verify beneficiary first');
      if (!beneficiary.isActive) throw new Error('Beneficiary is inactive or suspended');

      const currentStock = fpsStock[selectedComm] ?? 0;
      if (qty > currentStock) {
        throw new Error(`Insufficient FPS inventory (${currentStock} available)`);
      }

      const ent = entitlements[selectedComm];
      if (!ent || !ent.isSet) {
        throw new Error('No entitlement quota configured for this commodity');
      }
      if (qty > ent.remainingQuantity) {
        throw new Error(
          `Requested quantity exceeds remaining quota (${ent.remainingQuantity} available)`,
        );
      }

      const res = await apiClient.recordDistribution({
        fpsId,
        beneficiaryRef: beneficiary.beneficiaryRef,
        period,
        commodityId: selectedComm,
        quantity: qty,
        claimRef: claimRef.trim(),
      });

      setSuccessResult({
        msg: `Successfully distributed ${qty} ${commodities.find((c) => c.id === selectedComm)?.unit || 'kg'} to ${beneficiary.beneficiaryRef}`,
        txHash: res.txHash,
      });

      // Refresh stock & quota
      setDispenseQty('');
      setClaimRef(
        `CLAIM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      );
      await loadStock();
      await handleLookupBeneficiary();
    } catch (err) {
      setDistributeError((err as Error).message);
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-7 w-7 text-indigo-600" />
            Fair Price Shop — Ration Disbursement
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Verify beneficiary entitlement quotas, authenticate eligibility, and record atomic
            on-chain grain distributions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            label=""
            value={fpsId}
            onChange={(e) => setFpsId(e.target.value)}
            placeholder="FPS Shop Code"
            className="w-48 text-sm"
          />
          <Button variant="outline" size="sm" onClick={loadStock} disabled={isLoadingStock}>
            <RefreshCw className={`h-4 w-4 ${isLoadingStock ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {distributeError && <ErrorDisplay message={distributeError} onRetry={loadStock} />}

      {successResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-900">{successResult.msg}</p>
            {successResult.txHash && (
              <p className="text-xs text-emerald-700 font-mono mt-1 break-all">
                Mined On-Chain Tx Hash: {successResult.txHash}
              </p>
            )}
          </div>
        </div>
      )}

      {/* FPS Stock Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Available FPS Shop Inventory</h2>
        {isLoadingStock ? (
          <LoadingIndicator message="Fetching FPS inventory..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commodities.map((c) => (
              <Card key={c.id} className="p-4 bg-white border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{c.id}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-mono">
                    {fpsId}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-indigo-600">
                    {(fpsStock[c.id] ?? 0).toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-gray-600">{c.unit}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Beneficiary Lookup & Entitlement Verification */}
      <Card className="p-6 bg-white border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <UserCheck className="h-5 w-5 text-indigo-600" />
          Step 1: Beneficiary Eligibility & Quota Verification
        </h2>
        <form onSubmit={handleLookupBeneficiary} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              label=""
              value={beneficiaryRef}
              onChange={(e) => setBeneficiaryRef(e.target.value)}
              placeholder="Enter Non-Sensitive Beneficiary Reference (e.g. BENEFICIARY:RC-2026-0001)"
              required
            />
          </div>
          <Button type="submit" variant="primary" disabled={isSearchingBen}>
            {isSearchingBen ? 'Verifying...' : 'Verify Beneficiary & Quota'}
          </Button>
        </form>

        {lookupError && (
          <div className="mt-4">
            <ErrorDisplay message={lookupError} onRetry={() => handleLookupBeneficiary()} />
          </div>
        )}

        {beneficiary && (
          <div className="mt-6 border-t border-gray-200 pt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 font-medium">Beneficiary Reference</p>
                <p className="font-mono text-sm font-bold text-gray-900">
                  {beneficiary.beneficiaryRef}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Assigned District</p>
                <p className="text-sm font-semibold text-gray-800">{beneficiary.districtCode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Status</p>
                <StatusBadge
                  status={beneficiary.isActive ? 'operational' : 'offline'}
                  label={beneficiary.isActive ? 'Active' : 'Suspended'}
                />
              </div>
            </div>

            {/* Quota Table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Monthly Entitlements (Period: {period})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {commodities.map((c) => {
                  const ent = entitlements[c.id];
                  const remaining = ent?.remainingQuantity ?? 0;
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-lg border ${
                        remaining > 0
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-900">{c.name}</p>
                      <div className="mt-2 text-xs space-y-1">
                        <div className="flex justify-between text-gray-600">
                          <span>Allocated:</span>
                          <span className="font-mono">
                            {ent?.allocatedQuantity ?? 0} {c.unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Distributed:</span>
                          <span className="font-mono">
                            {ent?.distributedQuantity ?? 0} {c.unit}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-indigo-900 pt-1 border-t border-gray-200">
                          <span>Remaining:</span>
                          <span className="font-mono">
                            {remaining} {c.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Step 2: Record Distribution Form */}
      {beneficiary && beneficiary.isActive && (
        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Step 2: Dispense Ration Quota to Beneficiary
          </h2>
          <form onSubmit={handleDistribute} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Commodity
                </label>
                <select
                  value={selectedComm}
                  onChange={(e) => setSelectedComm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {commodities.map((c) => {
                    const remaining = entitlements[c.id]?.remainingQuantity ?? 0;
                    return (
                      <option key={c.id} value={c.id} disabled={remaining <= 0}>
                        {c.name} (Remaining Quota: {remaining} {c.unit})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to Dispense
                </label>
                <Input
                  label=""
                  type="number"
                  min="1"
                  max={entitlements[selectedComm]?.remainingQuantity ?? undefined}
                  value={dispenseQty}
                  onChange={(e) => setDispenseQty(e.target.value)}
                  placeholder="e.g. 20"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Unique Transaction Claim Reference (Replay-Protected)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setClaimRef(
                      `CLAIM-${Date.now().toString(36).toUpperCase()}-${Math.floor(
                        Math.random() * 1000,
                      )}`,
                    )
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Regenerate
                </button>
              </div>
              <Input
                label=""
                value={claimRef}
                onChange={(e) => setClaimRef(e.target.value)}
                required
                className="font-mono text-sm"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isDistributing || !dispenseQty}
            >
              {isDistributing
                ? 'Mining Distribution on Local Chain...'
                : 'Record On-Chain Ration Disbursement'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
