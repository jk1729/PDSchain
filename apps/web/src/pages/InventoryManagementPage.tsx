import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import {
  Commodity,
  InventoryBatch,
  ReceiptConfirmation,
  ReconciliationReport,
  StockAdjustment,
  StockAllocation,
  StockDispatch,
  StockMovement,
  StockReturn,
} from '../types/inventory';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  Package,
  Truck,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Scale,
  RotateCcw,
  FileText,
  AlertTriangle,
  History,
} from 'lucide-react';

type ActiveTab =
  | 'batches'
  | 'receipts'
  | 'allocations'
  | 'dispatches'
  | 'confirmations'
  | 'returns'
  | 'adjustments'
  | 'reconciliation'
  | 'movements';

export const InventoryManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('ADMIN');
  const isDistrictOfficer = user?.roles.includes('DISTRICT_OFFICER');
  const isWhManager = user?.roles.includes('WAREHOUSE_MANAGER');
  const isFpsOperator = user?.roles.includes('FPS_OPERATOR');

  const assignedWh =
    user?.assignments?.find((a) => a.warehouseCode)?.warehouseCode || 'WH-KA-BLR-01';
  const assignedFps = user?.assignments?.find((a) => a.shopCode)?.shopCode || 'FPS-KA-BLR-042';

  const [activeTab, setActiveTab] = useState<ActiveTab>('batches');
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [allocations, setAllocations] = useState<StockAllocation[]>([]);
  const [dispatches, setDispatches] = useState<StockDispatch[]>([]);
  const [confirmations, setConfirmations] = useState<ReceiptConfirmation[]>([]);
  const [returns, setReturns] = useState<StockReturn[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states:
  // 1. Receipt
  const [recWh, setRecWh] = useState(assignedWh);
  const [recComm, setRecComm] = useState('COMMODITY:RICE');
  const [recBatch, setRecBatch] = useState('');
  const [recQty, setRecQty] = useState('');
  const [recRef, setRecRef] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  // 2. Allocation
  const [allocWh, setAllocWh] = useState(assignedWh);
  const [allocFps, setAllocFps] = useState(assignedFps);
  const [allocComm, setAllocComm] = useState('COMMODITY:RICE');
  const [allocQty, setAllocQty] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  // 3. Dispatch
  const [dispWh, setDispWh] = useState(assignedWh);
  const [dispFps, setDispFps] = useState(assignedFps);
  const [dispComm, setDispComm] = useState('COMMODITY:RICE');
  const [dispBatch, setDispBatch] = useState('');
  const [dispQty, setDispQty] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  // 4. Confirmation
  const [selectedDispatchId, setSelectedDispatchId] = useState('');
  const [confReceivedQty, setConfReceivedQty] = useState('');
  const [confShortageQty, setConfShortageQty] = useState('');
  const [confDamagedQty, setConfDamagedQty] = useState('');
  const [confReason, setConfReason] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  // 5. Return
  const [retFps, setRetFps] = useState(assignedFps);
  const [retWh, setRetWh] = useState(assignedWh);
  const [retComm, setRetComm] = useState('COMMODITY:RICE');
  const [retBatch, setRetBatch] = useState('');
  const [retQty, setRetQty] = useState('');
  const [retReason, setRetReason] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  // 6. Adjustment
  const [adjLocType, setAdjLocType] = useState<'WAREHOUSE' | 'FPS'>('WAREHOUSE');
  const [adjLocCode, setAdjLocCode] = useState(assignedWh);
  const [adjComm, setAdjComm] = useState('COMMODITY:RICE');
  const [adjBatch, setAdjBatch] = useState('');
  const [adjType, setAdjType] = useState<'INCREASE' | 'DECREASE'>('DECREASE');
  const [adjQty, setAdjQty] = useState('');
  const [adjReasonCode, setAdjReasonCode] = useState('AUDIT_VERIFICATION');
  const [adjExplanation, setAdjExplanation] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // 7. Reconciliation Engine
  const [reconLocType, setReconLocType] = useState<'WAREHOUSE' | 'FPS'>('WAREHOUSE');
  const [reconLocCode, setReconLocCode] = useState(assignedWh);
  const [reconComm, setReconComm] = useState('COMMODITY:RICE');
  const [reconReport, setReconReport] = useState<ReconciliationReport | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [commList, batchList, allocList, dispList, confList, retList, adjList, movList] =
        await Promise.all([
          apiClient.fetchCommoditiesRegistry(),
          apiClient.fetchInventoryBatches(),
          apiClient.fetchStockAllocations(),
          apiClient.fetchStockDispatches(),
          apiClient.fetchReceiptConfirmations(),
          apiClient.fetchStockReturns(),
          apiClient.fetchStockAdjustments(),
          apiClient.fetchStockMovements(),
        ]);
      setCommodities(commList);
      setBatches(batchList);
      setAllocations(allocList);
      setDispatches(dispList);
      setConfirmations(confList);
      setReturns(retList);
      setAdjustments(adjList);
      setMovements(movList);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    setIsReceiving(true);
    try {
      const qty = Number(recQty);
      if (!qty || qty <= 0) throw new Error('Positive quantity required');
      if (!recBatch.trim()) throw new Error('Batch number is required');

      await apiClient.receiveInwardBatchStock({
        warehouseCode: recWh,
        commodityCode: recComm,
        batchNumber: recBatch.trim(),
        quantity: qty,
        receiptRef: recRef.trim() || undefined,
      });

      setSuccessMsg(`Successfully received ${qty} units inward into batch ${recBatch.trim()}`);
      setRecBatch('');
      setRecQty('');
      setRecRef('');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsReceiving(false);
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    setIsAllocating(true);
    try {
      const qty = Number(allocQty);
      if (!qty || qty <= 0) throw new Error('Positive allocation quantity required');

      await apiClient.createStockAllocation({
        sourceWarehouseCode: allocWh,
        destinationFpsCode: allocFps,
        commodityCode: allocComm,
        allocatedQuantity: qty,
      });

      setSuccessMsg(`Stock quota allocation of ${qty} units created successfully.`);
      setAllocQty('');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsAllocating(false);
    }
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    setIsDispatching(true);
    try {
      const qty = Number(dispQty);
      if (!qty || qty <= 0) throw new Error('Positive dispatch quantity required');
      if (!dispBatch.trim()) throw new Error('Batch number is required');

      await apiClient.createStockDispatch({
        sourceWarehouseCode: dispWh,
        destinationFpsCode: dispFps,
        commodityCode: dispComm,
        batchNumber: dispBatch.trim(),
        dispatchedQuantity: qty,
      });

      setSuccessMsg(`Dispatched ${qty} units from warehouse ${dispWh} to FPS ${dispFps}.`);
      setDispBatch('');
      setDispQty('');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    setIsConfirming(true);
    try {
      if (!selectedDispatchId) throw new Error('Please select a dispatch consignment to confirm');
      const rQty = Number(confReceivedQty);
      const sQty = Number(confShortageQty) || 0;
      const dQty = Number(confDamagedQty) || 0;

      await apiClient.confirmStockReceipt(selectedDispatchId, {
        receivedQuantity: rQty,
        shortageQuantity: sQty,
        damagedQuantity: dQty,
        discrepancyReason: confReason.trim() || undefined,
      });

      setSuccessMsg('Receipt confirmation recorded successfully.');
      setSelectedDispatchId('');
      setConfReceivedQty('');
      setConfShortageQty('');
      setConfDamagedQty('');
      setConfReason('');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    setIsReturning(true);
    try {
      const qty = Number(retQty);
      if (!qty || qty <= 0) throw new Error('Positive return quantity required');
      if (!retReason.trim()) throw new Error('Reason is required');

      await apiClient.createStockReturn({
        sourceFpsCode: retFps,
        destinationWarehouseCode: retWh,
        commodityCode: retComm,
        batchNumber: retBatch.trim() || undefined,
        returnQuantity: qty,
        reason: retReason.trim(),
      });

      setSuccessMsg(`Initiated return of ${qty} units back to warehouse.`);
      setRetBatch('');
      setRetQty('');
      setRetReason('');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsReturning(false);
    }
  };

  const handleConfirmReturn = async (returnId: string) => {
    setActionError(null);
    setSuccessMsg(null);
    try {
      await apiClient.confirmStockReturn(returnId, {
        status: 'CONFIRMED',
        remarks: 'Inspected and confirmed into warehouse inventory',
      });
      setSuccessMsg('Return confirmed into warehouse inventory.');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    setIsAdjusting(true);
    try {
      const qty = Number(adjQty);
      if (!qty || qty <= 0) throw new Error('Positive adjustment quantity required');
      if (!adjExplanation.trim()) throw new Error('Audit explanation is required');

      await apiClient.createStockAdjustment({
        locationType: adjLocType,
        locationCode: adjLocCode,
        commodityCode: adjComm,
        batchNumber: adjBatch.trim() || undefined,
        adjustmentType: adjType,
        quantityChange: qty,
        reasonCode: adjReasonCode,
        explanation: adjExplanation.trim(),
      });

      setSuccessMsg(`Stock adjustment of ${qty} units (${adjType}) executed.`);
      setAdjQty('');
      setAdjExplanation('');
      setAdjBatch('');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleRunReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsReconciling(true);
    try {
      const report = await apiClient.fetchStockReconciliation(
        reconLocType,
        reconLocCode,
        reconComm || undefined,
      );
      setReconReport(report);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory & Logistics Operations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Authoritative multi-tiered inventory management, tracked batch lots, dispatches, receipt
            confirmations & reconciliation.
          </p>
        </div>
        <Button variant="secondary" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {actionError && <ErrorDisplay message={actionError} />}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: 'batches', label: 'Batches & Stock', icon: Package },
          { id: 'receipts', label: 'Inward Receipt', icon: FileText },
          { id: 'allocations', label: 'Allocations', icon: Sliders },
          { id: 'dispatches', label: 'Dispatches', icon: Truck },
          { id: 'confirmations', label: 'FPS Receipts', icon: CheckCircle2 },
          { id: 'returns', label: 'Stock Returns', icon: RotateCcw },
          { id: 'adjustments', label: 'Adjustments', icon: Scale },
          { id: 'reconciliation', label: 'Reconciliation Engine', icon: Scale },
          { id: 'movements', label: 'Audit Ledger', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Batches & Physical Stock */}
      {activeTab === 'batches' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Current Inventory Batches</h2>
            <span className="text-xs text-slate-500">{batches.length} lots tracked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3">Current Balance</th>
                  <th className="py-2.5 px-3">Initial Quantity</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                      {b.batchNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 mr-1.5">
                        {b.locationType}
                      </span>
                      <span className="font-mono text-slate-800">{b.locationCode}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{b.commodityCode}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {Number(b.currentQuantity)} {b.unit}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {Number(b.initialQuantity)} {b.unit}
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusBadge
                        status={b.status === 'ACTIVE' ? 'operational' : 'offline'}
                        label={b.status}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No inventory batches available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Inward Stock Receipts */}
      {activeTab === 'receipts' && (
        <Card className="p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Record Inward Stock Receipt</h2>
          <p className="text-xs text-slate-500 mb-6">
            Accepts bulk grain or goods consignment from FCI or suppliers into designated nodal
            warehouse batch.
          </p>
          <form onSubmit={handleReceiveStock} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receiving Warehouse Code
                </label>
                <Input
                  value={recWh}
                  onChange={(e) => setRecWh(e.target.value)}
                  placeholder="WH-KA-BLR-01"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commodity</label>
                <select
                  value={recComm}
                  onChange={(e) => setRecComm(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  required
                >
                  {commodities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batch Lot Number (e.g. BATCH-RICE-2026-01)
                </label>
                <Input
                  value={recBatch}
                  onChange={(e) => setRecBatch(e.target.value)}
                  placeholder="BATCH-RICE-2026-01"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Received
                </label>
                <Input
                  type="number"
                  value={recQty}
                  onChange={(e) => setRecQty(e.target.value)}
                  placeholder="5000"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Delivery Note / Receipt Ref
                </label>
                <Input
                  value={recRef}
                  onChange={(e) => setRecRef(e.target.value)}
                  placeholder="FCI-DN-2026-9981"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={isReceiving}>
                {isReceiving ? 'Recording...' : 'Receive Stock Inward'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: Allocations */}
      {activeTab === 'allocations' && (
        <div className="space-y-6">
          {(isAdmin || isDistrictOfficer) && (
            <Card className="p-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Create Stock Allocation</h2>
              <p className="text-xs text-slate-500 mb-4">
                District officers authorize monthly stock quotas from designated warehouses to Fair
                Price Shops.
              </p>
              <form
                onSubmit={handleCreateAllocation}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Source Warehouse
                  </label>
                  <Input
                    value={allocWh}
                    onChange={(e) => setAllocWh(e.target.value)}
                    placeholder="WH-KA-BLR-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Fair Price Shop
                  </label>
                  <Input
                    value={allocFps}
                    onChange={(e) => setAllocFps(e.target.value)}
                    placeholder="FPS-KA-BLR-042"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Commodity
                  </label>
                  <select
                    value={allocComm}
                    onChange={(e) => setAllocComm(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    {commodities.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Allocated Quantity
                  </label>
                  <Input
                    type="number"
                    value={allocQty}
                    onChange={(e) => setAllocQty(e.target.value)}
                    placeholder="1000"
                    required
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isAllocating}>
                    {isAllocating ? 'Allocating...' : 'Create Allocation'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Stock Allocations</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Ref</th>
                    <th className="py-2.5 px-3">From Warehouse</th>
                    <th className="py-2.5 px-3">To FPS</th>
                    <th className="py-2.5 px-3">Commodity</th>
                    <th className="py-2.5 px-3">Allocated</th>
                    <th className="py-2.5 px-3">Dispatched</th>
                    <th className="py-2.5 px-3">Remaining</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {a.allocationRef}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{a.sourceWarehouseCode}</td>
                      <td className="py-2.5 px-3 font-mono">{a.destinationFpsCode}</td>
                      <td className="py-2.5 px-3 font-medium">{a.commodityCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {Number(a.allocatedQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-blue-600 font-medium">
                        {Number(a.dispatchedQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">
                        {Number(a.remainingQuantity)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge
                          status={
                            a.status === 'COMPLETED'
                              ? 'operational'
                              : a.status === 'PARTIALLY_DISPATCHED'
                                ? 'warning'
                                : a.status === 'PENDING'
                                  ? 'pending'
                                  : 'offline'
                          }
                          label={a.status}
                        />
                      </td>
                    </tr>
                  ))}
                  {allocations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No allocations recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: Dispatches */}
      {activeTab === 'dispatches' && (
        <div className="space-y-6">
          {(isAdmin || isWhManager) && (
            <Card className="p-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Dispatch Stock Consignment
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Atomically deducts quantity from source batch lot and generates an in-transit
                dispatch manifest.
              </p>
              <form
                onSubmit={handleCreateDispatch}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Source Warehouse
                  </label>
                  <Input
                    value={dispWh}
                    onChange={(e) => setDispWh(e.target.value)}
                    placeholder="WH-KA-BLR-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Fair Price Shop
                  </label>
                  <Input
                    value={dispFps}
                    onChange={(e) => setDispFps(e.target.value)}
                    placeholder="FPS-KA-BLR-042"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Commodity
                  </label>
                  <select
                    value={dispComm}
                    onChange={(e) => setDispComm(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    {commodities.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Source Batch Lot
                  </label>
                  <Input
                    value={dispBatch}
                    onChange={(e) => setDispBatch(e.target.value)}
                    placeholder="BATCH-RICE-2026-01"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity to Dispatch
                  </label>
                  <Input
                    type="number"
                    value={dispQty}
                    onChange={(e) => setDispQty(e.target.value)}
                    placeholder="400"
                    required
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isDispatching}>
                    {isDispatching ? 'Dispatching...' : 'Dispatch Consignment'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Stock Dispatches</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Dispatch Ref</th>
                    <th className="py-2.5 px-3">From</th>
                    <th className="py-2.5 px-3">To</th>
                    <th className="py-2.5 px-3">Commodity</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Dispatched Qty</th>
                    <th className="py-2.5 px-3">Received Qty</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatches.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {d.dispatchRef}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{d.sourceWarehouseCode}</td>
                      <td className="py-2.5 px-3 font-mono">{d.destinationFpsCode}</td>
                      <td className="py-2.5 px-3 font-medium">{d.commodityCode}</td>
                      <td className="py-2.5 px-3 font-mono">{d.batchNumber || 'N/A'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {Number(d.dispatchedQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">
                        {Number(d.receivedQuantity)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge
                          status={
                            d.status === 'DELIVERED'
                              ? 'operational'
                              : d.status === 'DISPATCHED'
                                ? 'pending'
                                : d.status === 'PARTIALLY_RECEIVED'
                                  ? 'warning'
                                  : 'offline'
                          }
                          label={d.status}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(d.dispatchedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {dispatches.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No dispatches recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: FPS Delivery Confirmations */}
      {activeTab === 'confirmations' && (
        <div className="space-y-6">
          {(isAdmin || isFpsOperator) && (
            <Card className="p-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm Received Consignment
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Fair Price Shop operators verify deliveries, recording received quantities,
                shortages, and damages.
              </p>
              <form onSubmit={handleConfirmReceipt} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Pending Consignment
                  </label>
                  <select
                    value={selectedDispatchId}
                    onChange={(e) => setSelectedDispatchId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Consignment --</option>
                    {dispatches
                      .filter((d) => d.status !== 'DELIVERED')
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.dispatchRef} ({d.commodityCode} - {Number(d.dispatchedQuantity)} units)
                          to {d.destinationFpsCode}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity Received
                    </label>
                    <Input
                      type="number"
                      value={confReceivedQty}
                      onChange={(e) => setConfReceivedQty(e.target.value)}
                      placeholder="395"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Shortage Quantity
                    </label>
                    <Input
                      type="number"
                      value={confShortageQty}
                      onChange={(e) => setConfShortageQty(e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Damaged Quantity
                    </label>
                    <Input
                      type="number"
                      value={confDamagedQty}
                      onChange={(e) => setConfDamagedQty(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discrepancy Reason / Condition Remarks
                  </label>
                  <Input
                    value={confReason}
                    onChange={(e) => setConfReason(e.target.value)}
                    placeholder="Shortage noticed on weigh-in; bag torn in transit"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isConfirming}>
                    {isConfirming ? 'Confirming...' : 'Confirm Delivery'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Receipt Confirmation History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Confirmation Ref</th>
                    <th className="py-2.5 px-3">FPS</th>
                    <th className="py-2.5 px-3">Dispatch</th>
                    <th className="py-2.5 px-3">Received Qty</th>
                    <th className="py-2.5 px-3">Shortage</th>
                    <th className="py-2.5 px-3">Damaged</th>
                    <th className="py-2.5 px-3">Discrepancy Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {confirmations.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {c.confirmationRef}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{c.destinationFpsCode}</td>
                      <td className="py-2.5 px-3 font-mono">{c.dispatchRef}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">
                        {Number(c.receivedQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-amber-700 font-medium">
                        {Number(c.shortageQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-red-700 font-medium">
                        {Number(c.damagedQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                        {c.discrepancyReason || 'None'}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge
                          status={c.status === 'CONFIRMED' ? 'operational' : 'warning'}
                          label={c.status}
                        />
                      </td>
                    </tr>
                  ))}
                  {confirmations.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No receipt confirmations recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: Stock Returns */}
      {activeTab === 'returns' && (
        <div className="space-y-6">
          {(isAdmin || isFpsOperator) && (
            <Card className="p-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Initiate Stock Return to Warehouse
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Return damaged or expired stock from Fair Price Shop back to supply warehouse.
              </p>
              <form onSubmit={handleCreateReturn} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Source Fair Price Shop
                  </label>
                  <Input
                    value={retFps}
                    onChange={(e) => setRetFps(e.target.value)}
                    placeholder="FPS-KA-BLR-042"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Warehouse
                  </label>
                  <Input
                    value={retWh}
                    onChange={(e) => setRetWh(e.target.value)}
                    placeholder="WH-KA-BLR-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Commodity
                  </label>
                  <select
                    value={retComm}
                    onChange={(e) => setRetComm(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    {commodities.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Return Quantity
                  </label>
                  <Input
                    type="number"
                    value={retQty}
                    onChange={(e) => setRetQty(e.target.value)}
                    placeholder="15"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Return
                  </label>
                  <Input
                    value={retReason}
                    onChange={(e) => setRetReason(e.target.value)}
                    placeholder="Moisture ingress, damaged grain lot"
                    required
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isReturning}>
                    {isReturning ? 'Submitting...' : 'Initiate Return'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Stock Returns</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Return Ref</th>
                    <th className="py-2.5 px-3">From FPS</th>
                    <th className="py-2.5 px-3">To Warehouse</th>
                    <th className="py-2.5 px-3">Commodity</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returns.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {r.returnRef}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{r.sourceFpsCode}</td>
                      <td className="py-2.5 px-3 font-mono">{r.destinationWarehouseCode}</td>
                      <td className="py-2.5 px-3 font-medium">{r.commodityCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {Number(r.returnQuantity)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 italic">{r.reason}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge
                          status={
                            r.status === 'CONFIRMED'
                              ? 'operational'
                              : r.status === 'PENDING'
                                ? 'pending'
                                : 'offline'
                          }
                          label={r.status}
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        {r.status === 'PENDING' && (isAdmin || isWhManager) ? (
                          <Button size="sm" onClick={() => handleConfirmReturn(r.id)}>
                            Confirm Receipt
                          </Button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {returns.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No returns recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 7: Stock Adjustments */}
      {activeTab === 'adjustments' && (
        <div className="space-y-6">
          {(isAdmin || isDistrictOfficer || isWhManager) && (
            <Card className="p-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Execute Stock Adjustment
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Audited manual balance adjustments for physical inventory discrepancies, moisture
                loss, or lab samples.
              </p>
              <form
                onSubmit={handleCreateAdjustment}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location Type
                  </label>
                  <select
                    value={adjLocType}
                    onChange={(e) => setAdjLocType(e.target.value as 'WAREHOUSE' | 'FPS')}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="FPS">Fair Price Shop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location Code
                  </label>
                  <Input
                    value={adjLocCode}
                    onChange={(e) => setAdjLocCode(e.target.value)}
                    placeholder="WH-KA-BLR-01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Commodity
                  </label>
                  <select
                    value={adjComm}
                    onChange={(e) => setAdjComm(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    {commodities.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Direction
                  </label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as 'INCREASE' | 'DECREASE')}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="DECREASE">Decrease (Loss / Spillage / Damage)</option>
                    <option value="INCREASE">Increase (Surplus / Correction)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity Change
                  </label>
                  <Input
                    type="number"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    placeholder="10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Audit Reason Code
                  </label>
                  <Input
                    value={adjReasonCode}
                    onChange={(e) => setAdjReasonCode(e.target.value)}
                    placeholder="PHYSICAL_AUDIT_2026"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Detailed Explanation
                  </label>
                  <Input
                    value={adjExplanation}
                    onChange={(e) => setAdjExplanation(e.target.value)}
                    placeholder="Annual physical weigh-in deduction approved by district auditor"
                    required
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isAdjusting}>
                    {isAdjusting ? 'Executing...' : 'Apply Stock Adjustment'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Stock Adjustments Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Adjustment Ref</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Commodity</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Previous</th>
                    <th className="py-2.5 px-3">Resulting</th>
                    <th className="py-2.5 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                        {a.adjustmentRef}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{a.locationCode}</td>
                      <td className="py-2.5 px-3 font-medium">{a.commodityCode}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            a.adjustmentType === 'INCREASE' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {a.adjustmentType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">{Number(a.quantityChange)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{Number(a.previousBalance)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {Number(a.resultingBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">
                        {a.explanation}
                      </td>
                    </tr>
                  ))}
                  {adjustments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No stock adjustments recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 8: Mathematical Stock Reconciliation Engine */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Mathematical Stock Reconciliation Engine
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Calculates authoritative theoretical balance from all inward receipts, outward
              dispatches, confirmations, returns, and adjustments, proving absence of inventory
              drift against physical batch balances.
            </p>
            <form
              onSubmit={handleRunReconciliation}
              className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Type
                </label>
                <select
                  value={reconLocType}
                  onChange={(e) => setReconLocType(e.target.value as 'WAREHOUSE' | 'FPS')}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="FPS">Fair Price Shop</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Facility Code
                </label>
                <Input
                  value={reconLocCode}
                  onChange={(e) => setReconLocCode(e.target.value)}
                  placeholder="WH-KA-BLR-01"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commodity (Optional)
                </label>
                <select
                  value={reconComm}
                  onChange={(e) => setReconComm(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">All Commodities</option>
                  {commodities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Button type="submit" disabled={isReconciling} className="w-full">
                  {isReconciling ? 'Calculating...' : 'Run Reconciliation Probe'}
                </Button>
              </div>
            </form>
          </Card>

          {reconReport && (
            <Card className="p-6 border-slate-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reconciliation Audit Report: {reconReport.locationType} [
                    {reconReport.locationCode}]
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">{reconReport.formula}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      reconReport.status === 'RECONCILED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {reconReport.status === 'RECONCILED' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {reconReport.status}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {reconReport.commodities.map((c) => (
                  <div
                    key={c.commodityCode}
                    className="p-4 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900">{c.commodityCode}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.isReconciled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.isReconciled ? 'BALANCED' : 'DRIFT DETECTED'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600 mt-3">
                      <div className="flex justify-between">
                        <span>Total Inbound (+):</span>
                        <span className="font-mono text-emerald-700">+{Number(c.inbound)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Outbound (-):</span>
                        <span className="font-mono text-red-700">-{Number(c.outbound)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Adjustments Net:</span>
                        <span className="font-mono text-blue-700">
                          {Number(c.adjustmentsAdd) - Number(c.adjustmentsSubtract) >= 0 ? '+' : ''}
                          {Number(c.adjustmentsAdd) - Number(c.adjustmentsSubtract)}
                        </span>
                      </div>
                      <div className="pt-2 border-t flex justify-between font-bold">
                        <span>Expected Balance:</span>
                        <span className="font-mono">{Number(c.expectedBalance)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Physical Batch Balance:</span>
                        <span className="font-mono">{Number(c.actualBalance)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 pt-1">
                        <span>Unaccounted Drift:</span>
                        <span
                          className={`font-mono ${
                            Number(c.drift) === 0 ? 'text-emerald-600' : 'text-red-600 font-bold'
                          }`}
                        >
                          {Number(c.drift).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 9: Audit Movements Ledger */}
      {activeTab === 'movements' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Authoritative Stock Movements Ledger
            </h2>
            <span className="text-xs text-slate-500">{movements.length} ledger transitions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Movement Ref</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Quantity</th>
                  <th className="py-2.5 px-3">Balance After</th>
                  <th className="py-2.5 px-3">Source Document</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                      {m.movementRef}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {m.movementType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {m.locationType}:{m.locationCode}
                    </td>
                    <td className="py-2.5 px-3 font-medium">{m.commodityCode}</td>
                    <td className="py-2.5 px-3 font-mono">{m.batchNumber || 'N/A'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-bold ${
                          m.direction === 'IN' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {m.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{Number(m.quantity)}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {Number(m.balanceAfter)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{m.sourceDocumentRef}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No stock movements recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
