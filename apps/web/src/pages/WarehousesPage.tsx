import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { District, Warehouse } from '../types/inventory';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Building2, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

export const WarehousesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('ADMIN');
  const isDistrictOfficer = user?.roles.includes('DISTRICT_OFFICER');
  const canCreate = isAdmin || isDistrictOfficer;

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [districtCode, setDistrictCode] = useState('DIST-BLR-URBAN');
  const [address, setAddress] = useState('');
  const [capacityMtl, setCapacityMtl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [whList, distList] = await Promise.all([
        apiClient.fetchWarehouses(selectedDistrict || undefined),
        apiClient.fetchDistricts(),
      ]);
      setWarehouses(whList);
      setDistricts(distList);
      if (distList.length > 0 && !districtCode) {
        setDistrictCode(distList[0].code);
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

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      if (!code.trim()) throw new Error('Warehouse code is required');
      if (!name.trim()) throw new Error('Warehouse name is required');
      if (!districtCode.trim()) throw new Error('District is required');

      await apiClient.createWarehouse({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        districtCode: districtCode.trim(),
        address: address.trim() || undefined,
        capacityMtl: capacityMtl ? Number(capacityMtl) : undefined,
      });

      setSuccessMsg(`Warehouse ${code.toUpperCase()} registered successfully.`);
      setCode('');
      setName('');
      setAddress('');
      setCapacityMtl('');
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Warehouses Registry</h1>
          <p className="mt-1 text-sm text-slate-500">
            Food storage depots and nodal warehouses managing buffer and distribution stock.
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
              Add Warehouse
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

      {/* Create Warehouse Form */}
      {showCreateModal && (
        <Card className="p-6 border-indigo-200 bg-indigo-50/40">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Register New Warehouse</h2>
          <form onSubmit={handleCreateWarehouse} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warehouse Code (e.g. WH-KA-MYS-01)
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="WH-KA-MYS-01"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warehouse Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mysore Central Depot 01"
                required
              />
            </div>
            <div>
              <label
                htmlFor="create-wh-district"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                District
              </label>
              <select
                id="create-wh-district"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Capacity (Metric Tons)
              </label>
              <Input
                type="number"
                value={capacityMtl}
                onChange={(e) => setCapacityMtl(e.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Industrial Area, Sector 4"
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
                {isSubmitting ? 'Registering...' : 'Register Warehouse'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingIndicator message="Loading warehouses..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((w) => (
            <Card
              key={w.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{w.name}</h3>
                      <p className="text-xs font-mono text-slate-500">{w.code}</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={w.isActive ? 'operational' : 'offline'}
                    label={w.isActive ? 'Active' : 'Inactive'}
                  />
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {w.address || 'No physical address registered'}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">District</span>
                    <span className="font-medium">{w.districtCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Storage Capacity</span>
                    <span className="font-medium">
                      {w.capacityMtl ? `${w.capacityMtl} MT` : 'Not specified'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {warehouses.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No warehouses found for selected criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
