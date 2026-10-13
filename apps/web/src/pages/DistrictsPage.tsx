import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/api-client';
import { District } from '../types/inventory';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MapPin, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

export const DistrictsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('ADMIN');

  const [districts, setDistricts] = useState<District[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('Karnataka');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDistricts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.fetchDistricts();
      setDistricts(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDistricts();
  }, []);

  const handleCreateDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      if (!code.trim()) throw new Error('District code is required');
      if (!name.trim()) throw new Error('District name is required');

      await apiClient.createDistrict({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        state: state.trim(),
      });

      setSuccessMsg(`District ${code.toUpperCase()} registered successfully.`);
      setCode('');
      setName('');
      setShowCreateModal(false);
      await loadDistricts();
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Districts Registry</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administrative jurisdictional districts governing public food distribution networks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadDistricts} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add District
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

      {/* Creation Modal / Form */}
      {showCreateModal && (
        <Card className="p-6 border-indigo-200 bg-indigo-50/40">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Register New District</h2>
          <form onSubmit={handleCreateDistrict} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                District Code (e.g. DIST-MYS-01)
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="DIST-MYS-01"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                District Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mysore Rural"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Karnataka"
                required
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
                {isSubmitting ? 'Registering...' : 'Register District'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingIndicator message="Loading districts..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {districts.map((d) => (
            <Card
              key={d.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{d.name}</h3>
                      <p className="text-xs font-mono text-slate-500">{d.code}</p>
                    </div>
                  </div>
                  <StatusBadge
                    status={d.isActive ? 'operational' : 'offline'}
                    label={d.isActive ? 'Active' : 'Inactive'}
                  />
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block">State</span>
                    <span className="font-medium">{d.state}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Facilities</span>
                    <span className="font-medium">
                      {d._count?.warehouses ?? 0} Warehouses • {d._count?.shops ?? 0} FPS
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {districts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No districts found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
