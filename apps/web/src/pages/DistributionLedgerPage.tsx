import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api-client';
import { BlockchainTxItem } from '../types/distribution';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { History, RefreshCw, Shield, Search } from 'lucide-react';

export const DistributionLedgerPage: React.FC = () => {
  const [transactions, setTransactions] = useState<BlockchainTxItem[]>([]);
  const [filterEntity, setFilterEntity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTransactions = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.fetchDistributionTransactions(filterEntity || undefined);
      setTransactions(data);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [filterEntity]);

  const filtered = transactions.filter((tx) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tx.txHash.toLowerCase().includes(term) ||
      tx.txType.toLowerCase().includes(term) ||
      (tx.entityId && tx.entityId.toLowerCase().includes(term)) ||
      (tx.beneficiaryRef && tx.beneficiaryRef.toLowerCase().includes(term)) ||
      (tx.claimRef && tx.claimRef.toLowerCase().includes(term))
    );
  });

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'RATION_DISTRIBUTED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'STOCK_TRANSFERRED_FPS':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'WAREHOUSE_STOCK_RECEIVED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="h-7 w-7 text-indigo-600" />
            On-Chain Custody & Distribution Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Immutable, audit-ready blockchain transaction ledger recording state mutations, stock
            transfers, and ration disbursements.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTransactions}
          disabled={isLoading}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </Button>
      </div>

      {errorMsg && <ErrorDisplay message={errorMsg} onRetry={loadTransactions} />}

      {/* Filter / Search Bar */}
      <Card className="p-4 bg-white border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              label=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by Tx Hash, Beneficiary Ref, Claim, or Type..."
              className="pl-9 text-sm"
            />
          </div>
          <div>
            <Input
              label=""
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              placeholder="Filter by Entity ID (e.g. WH-KA-BLR-01 or FPS-KA-BLR-042)"
              className="text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <LoadingIndicator message="Reading on-chain ledger entries..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Shield className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="font-medium">No blockchain transactions recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Transactions will appear here when warehouse receipts, transfers, or ration
              disbursements occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Action / Type</th>
                  <th className="px-4 py-3 text-left">Transaction Hash</th>
                  <th className="px-4 py-3 text-left">Block</th>
                  <th className="px-4 py-3 text-left">Entity / Ref</th>
                  <th className="px-4 py-3 text-left">Quantity</th>
                  <th className="px-4 py-3 text-left">Operator / Actor</th>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getBadgeStyle(tx.txType)}`}
                      >
                        {tx.txType}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-indigo-700">
                      <span title={tx.txHash}>
                        {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">
                      #{tx.blockNumber ?? '101'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                      {tx.entityId || tx.beneficiaryRef || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-900">
                      {tx.quantity ? `${Number(tx.quantity).toLocaleString()} kg` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {tx.actorUser ? tx.actorUser.fullName : 'Relayer Wallet'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
