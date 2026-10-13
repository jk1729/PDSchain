import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { District, FairPriceShop, Warehouse } from '../types/inventory';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Store, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

export const FairPriceShopsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('ADMIN');
  const isDistrictOfficer = user?.roles.includes('DISTRICT_OFFICER');
  const canCreate = isAdmin || isDistrictOfficer;

  const [shops, setShops] = useState<FairPriceShop[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [districtCode, setDistrictCode] = useState('DIST-BLR-URBAN');
  const [warehouseCode, setWarehouseCode] = useState('WH-KA-BLR-01');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fpsList, distList, whList] = await Promise.all([
        apiClient.fetchFairPriceShops(selectedDistrict || undefined),
        apiClient.fetchDistricts(),
        apiClient.fetchWarehouses(),
      ]);
      setShops(fpsList);
      setDistricts(distList);
      setWarehouses(whList);
      if (distList.length > 0 && !districtCode) {
        setDistrictCode(distList[0].code);
      }
      if (whList.length > 0 && !warehouseCode) {
        setWarehouseCode(whList[0].code);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDistrict]);

  const handleCreateFps = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      if (!code.trim()) throw new Error('FPS code is required');
      if (!name.trim()) throw new Error('FPS name is required');
      if (!districtCode.trim()) throw new Error('District is required');

      await apiClient.createFairPriceShop({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        districtCode: districtCode.trim(),
        warehouseCode: warehouseCode.trim() || undefined,
        address: address.trim() || undefined,
      });

      setSuccessMsg(`Fair Price Shop ${code.toUpperCase()} registered successfully.`);
      setCode('');
      setName('');
      setAddress('');
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Fair Price Shops (FPS) Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Authorized ration distribution centers serving registered beneficiary cardholders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canCreate && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add FPS
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorDisplay message={error} />}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter by district */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-700">Filter District:</label>
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Districts</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
      </div>

      {/* Create FPS Form */}
      {showCreateModal && (
        <Card className="p-6 border-indigo-200 bg-indigo-50/40">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Register New Fair Price Shop
          </h2>
          <form onSubmit={handleCreateFps} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Code (e.g. FPS-KA-BLR-045)
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="FPS-KA-BLR-045"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fair Price Shop 45 Koramangala"
                required
              />
            </div>
            <div>
              <label
                htmlFor="create-fps-district"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                District
              </label>
              <select
                id="create-fps-district"
                value={districtCode}
                onChange={(e) => setDistrictCode(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                required
              >
                {districts.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="create-fps-warehouse"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Designated Source Warehouse
              </label>
              <select
                id="create-fps-warehouse"
                value={warehouseCode}
                onChange={(e) => setWarehouseCode(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">None / Unassigned</option>
                {warehouses.map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shop Address
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop No. 12, Main Bazar, 5th Block"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Register FPS'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingIndicator message="Loading Fair Price Shops..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => (
            <Card
              key={s.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.name}</h3>
                      <p className="text-xs font-mono text-slate-500">{s.code}</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={s.isActive ? 'operational' : 'offline'}
                    label={s.isActive ? 'Active' : 'Inactive'}
                  />
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {s.address || 'No physical address specified'}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">District</span>
                    <span className="font-medium">{s.districtCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Servicing Depot</span>
                    <span className="font-medium">{s.warehouseCode || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {shops.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No Fair Price Shops found for selected criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
