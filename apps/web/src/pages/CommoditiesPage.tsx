import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { Commodity } from '../types/inventory';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Wheat, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

export const CommoditiesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('ADMIN');

  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('KG');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const commList = await apiClient.fetchCommoditiesRegistry();
      setCommodities(commList);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCommodity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      if (!code.trim()) throw new Error('Commodity code is required');
      if (!name.trim()) throw new Error('Commodity name is required');
      if (!unit.trim()) throw new Error('Unit is required');

      await apiClient.createCommodityRegistry({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        unit: unit.trim().toUpperCase(),
        description: description.trim() || undefined,
      });

      setSuccessMsg(`Commodity ${code.toUpperCase()} registered successfully.`);
      setCode('');
      setName('');
      setDescription('');
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Commodities Registry</h1>
          <p className="mt-1 text-sm text-slate-500">
            Standardized essential commodities authorized for Public Distribution System rationing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Commodity
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

      {/* Create Commodity Modal */}
      {showCreateModal && (
        <Card className="p-6 border-indigo-200 bg-indigo-50/40">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Register New Commodity</h2>
          <form onSubmit={handleCreateCommodity} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commodity Code (e.g. COMMODITY:PULSES)
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="COMMODITY:PULSES"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commodity Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Red Lentils / Toor Dal"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Measurement Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
                required
              >
                <option value="KG">KG (Kilograms)</option>
                <option value="L">L (Liters)</option>
                <option value="QUINTAL">QUINTAL (100 KG)</option>
                <option value="PKT">PKT (Packets)</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Grade 1 polished pulses supplied under central quota"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Register Commodity'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingIndicator message="Loading commodities..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {commodities.map((c) => (
            <Card
              key={c.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                      <Wheat className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{c.name}</h3>
                      <p className="text-xs font-mono text-slate-500">{c.code}</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={c.isActive ? 'operational' : 'offline'}
                    label={c.isActive ? 'Active' : 'Inactive'}
                  />
                </div>
                <div className="mt-3 text-xs text-slate-500 min-h-[36px]">
                  {c.description || 'Standard public distribution ration article'}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="text-slate-400">Unit of Measure</span>
                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {c.unit}
                  </span>
                </div>
              </div>
            </Card>
          ))}
          {commodities.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No commodities registered.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
