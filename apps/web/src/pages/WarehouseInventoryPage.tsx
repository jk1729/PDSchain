import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { CommodityItem } from '../types/distribution';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Package, Truck, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

export const WarehouseInventoryPage: React.FC = () => {
  const { user } = useAuth();
  const assignedWh = user?.assignments.find((a) => a.warehouseCode)?.warehouseCode;
  const [warehouseId, setWarehouseId] = useState(assignedWh || 'WH-KA-BLR-01');

  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Receive Form
  const [receiveComm, setReceiveComm] = useState('COMMODITY:RICE');
  const [receiveQty, setReceiveQty] = useState('');
  const [batchRef, setBatchRef] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  // Transfer Form
  const [targetFps, setTargetFps] = useState('FPS-KA-BLR-042');
  const [transferComm, setTransferComm] = useState('COMMODITY:RICE');
  const [transferQty, setTransferQty] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const commList = await apiClient.fetchCommodities();
      setCommodities(commList);

      const stockMap: Record<string, number> = {};
      for (const c of commList) {
        try {
          const s = await apiClient.fetchWarehouseStock(warehouseId, c.id);
          stockMap[c.id] = s;
        } catch {
          stockMap[c.id] = 0;
        }
      }
      setStocks(stockMap);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [warehouseId]);

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    setTxHash(null);
    setIsReceiving(true);

    try {
      const qty = Number(receiveQty);
      if (!qty || qty <= 0) throw new Error('Please enter a valid positive quantity');
      if (!batchRef.trim()) throw new Error('Batch reference is required');

      const res = await apiClient.receiveWarehouseStock({
        warehouseId,
        commodityId: receiveComm,
        quantity: qty,
        batchReference: batchRef.trim(),
      });

      setSuccessMsg(
        `Successfully received ${qty} ${commodities.find((c) => c.id === receiveComm)?.unit || 'kg'} into warehouse.`,
      );
      setTxHash(res.txHash ?? null);
      setReceiveQty('');
      setBatchRef('');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsReceiving(false);
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);
    setTxHash(null);
    setIsTransferring(true);

    try {
      const qty = Number(transferQty);
      if (!qty || qty <= 0) throw new Error('Please enter a valid positive quantity');
      if (!targetFps.trim()) throw new Error('Target FPS code is required');
      if (!transferRef.trim()) throw new Error('Transfer reference is required');

      const available = stocks[transferComm] ?? 0;
      if (qty > available) {
        throw new Error(`Transfer quantity exceeds available stock (${available} available)`);
      }

      const res = await apiClient.transferStockToFps({
        warehouseId,
        fpsId: targetFps.trim(),
        commodityId: transferComm,
        quantity: qty,
        transferReference: transferRef.trim(),
      });

      setSuccessMsg(`Successfully dispatched ${qty} to FPS ${targetFps.trim()}`);
      setTxHash(res.txHash ?? null);
      setTransferQty('');
      setTransferRef('');
      await loadData();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-7 w-7 text-indigo-600" />
            Warehouse Inventory & Custody Transfers
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time on-chain commodity custody management and verified fair price shop dispatches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            label=""
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            placeholder="Warehouse ID"
            className="w-48 text-sm"
          />
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {actionError && <ErrorDisplay message={actionError} onRetry={loadData} />}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-900">{successMsg}</p>
            {txHash && (
              <p className="text-xs text-emerald-700 font-mono mt-1 break-all">
                Mined Tx Hash: {txHash}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stock Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">On-Chain Stock Balances</h2>
        {isLoading ? (
          <LoadingIndicator message="Fetching on-chain inventory..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commodities.map((c) => (
              <Card key={c.id} className="p-4 bg-white border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{c.id}</p>
                  </div>
                  <StatusBadge
                    status={c.isActive ? 'operational' : 'offline'}
                    label={c.isActive ? 'Active' : 'Suspended'}
                  />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-indigo-600">
                    {(stocks[c.id] ?? 0).toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-gray-600">{c.unit}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dual Forms: Receive vs Transfer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Receive Stock */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-emerald-600" />
            Record Incoming Stock Batch
          </h2>
          <form onSubmit={handleReceiveStock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
              <select
                value={receiveComm}
                onChange={(e) => setReceiveComm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
                Quantity Received
              </label>
              <Input
                label=""
                type="number"
                min="1"
                value={receiveQty}
                onChange={(e) => setReceiveQty(e.target.value)}
                placeholder="e.g. 5000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch / Inward Reference
              </label>
              <Input
                label=""
                value={batchRef}
                onChange={(e) => setBatchRef(e.target.value)}
                placeholder="e.g. BATCH-2026-FCI-001"
                required
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" disabled={isReceiving}>
              {isReceiving ? 'Confirming On-Chain...' : 'Commit Inward Stock to Ledger'}
            </Button>
          </form>
        </Card>

        {/* Transfer Stock to FPS */}
        <Card className="p-6 bg-white border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-indigo-600" />
            Dispatch Transfer to FPS Shop
          </h2>
          <form onSubmit={handleTransferStock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination Fair Price Shop
              </label>
              <Input
                label=""
                value={targetFps}
                onChange={(e) => setTargetFps(e.target.value)}
                placeholder="e.g. FPS-KA-BLR-042"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
              <select
                value={transferComm}
                onChange={(e) => setTransferComm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                {commodities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Available: {stocks[c.id] ?? 0} {c.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to Dispatch
              </label>
              <Input
                label=""
                type="number"
                min="1"
                max={stocks[transferComm] ?? undefined}
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                placeholder="e.g. 1500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dispatch / Transit Reference
              </label>
              <Input
                label=""
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="e.g. DISPATCH-2026-KA-001"
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              disabled={isTransferring}
            >
              {isTransferring ? (
                'Processing On-Chain...'
              ) : (
                <>
                  Transfer Custody to Shop <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
