import * as React from 'react';
import { AlertCircle, CheckCircle2, Edit2, PlusCircle, Save, Shield, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { apiClient, ApiClientError } from '../lib/api-client';
import { StaffAccessRequestItem, UserDetail } from '../types/auth';

export function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = React.useState<UserDetail | null>(null);
  const [myRequests, setMyRequests] = React.useState<StaffAccessRequestItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [userProfile, requests] = await Promise.all([
        apiClient.getMyProfile(),
        apiClient.getMyStaffRequests(),
      ]);
      setProfile(userProfile);
      setEditedName(userProfile.fullName);
      setMyRequests(requests);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load user profile details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim()) return;

    setIsUpdating(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const updated = await apiClient.updateMyProfile({ fullName: editedName.trim() });
      setProfile(updated);
      setIsEditingName(false);
      setStatusMessage('Profile name updated successfully.');
      await refreshUser();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to update profile name.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await apiClient.cancelStaffRequest(requestId);
      setStatusMessage('Staff request cancelled.');
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoadingIndicator message="Loading profile and credentials..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <p className="font-semibold">Unable to load profile</p>
          <p className="text-sm">{errorMessage || 'User record not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      {statusMessage ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {/* Profile Overview Card */}
      <Card
        title="Beneficiary Profile & Identity"
        description="Canonical identity and cryptographic authentication status."
      >
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Full Legal Name
              </span>
              {isEditingName ? (
                <form onSubmit={handleUpdateName} className="flex items-center gap-2 pt-1">
                  <Input
                    id="edit-fullname"
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    required
                    className="max-w-xs"
                  />
                  <Button type="submit" variant="primary" disabled={isUpdating}>
                    <Save className="h-4 w-4 mr-1" aria-hidden="true" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(profile.fullName);
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-900">{profile.fullName}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800"
                  >
                    <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={profile.status === 'ACTIVE' ? 'success' : 'error'}
                label={`Status: ${profile.status}`}
              />
              <StatusBadge
                status={profile.emailVerified ? 'success' : 'warning'}
                label={profile.emailVerified ? 'Email Verified' : 'Email Unverified'}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-slate-500">Official Email</span>
              <p className="font-mono text-sm text-slate-800">{profile.email}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Account ID</span>
              <p className="font-mono text-xs text-slate-600 truncate">{profile.id}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Member Since</span>
              <p className="text-sm text-slate-700">
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500">Email Verified At</span>
              <p className="text-sm text-slate-700">
                {profile.emailVerifiedAt
                  ? new Date(profile.emailVerifiedAt).toLocaleString()
                  : 'Pending Verification'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Role Assignments Card */}
      <Card
        title="Assigned Roles & Scopes"
        description="Authorized privileges granted by platform administrators."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {profile.roles.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800"
              >
                <Shield className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                {r}
              </span>
            ))}
          </div>

          {profile.assignments.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">District Scope</th>
                    <th className="px-3 py-2">Facility Scope</th>
                    <th className="px-3 py-2">Granted Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {profile.assignments.map((a) => (
                    <tr key={a.assignmentId}>
                      <td className="px-3 py-2 font-medium text-slate-900">{a.role}</td>
                      <td className="px-3 py-2 text-slate-600 font-mono">
                        {a.districtCode || '— (Global/Unrestricted)'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 font-mono">
                        {a.shopCode
                          ? `Fair Price Shop: ${a.shopCode}`
                          : a.warehouseCode
                            ? `Warehouse: ${a.warehouseCode}`
                            : '— (District-wide)'}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {new Date(a.grantedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No staff role assignments granted. You hold default citizen privileges.
            </p>
          )}
        </div>
      </Card>

      {/* Staff Access Requests History Card */}
      <Card
        title="Staff Access Requests"
        description="History of submitted operational access requests and administrator reviews."
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link to="/staff-requests/new">
              <Button variant="primary">
                <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Submit New Staff Request
              </Button>
            </Link>
          </div>

          {myRequests.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-500">
              You have not submitted any staff access requests.
            </p>
          ) : (
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-md border border-slate-200 bg-white p-3.5 text-xs shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{req.requestedRole}</span>
                      <StatusBadge
                        status={
                          req.status === 'APPROVED'
                            ? 'success'
                            : req.status === 'REJECTED'
                              ? 'error'
                              : req.status === 'CANCELLED'
                                ? 'neutral'
                                : 'warning'
                        }
                        label={req.status}
                      />
                    </div>
                    <span className="text-slate-500 font-mono">
                      {new Date(req.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-slate-700">
                    <div>
                      <span className="text-slate-500 font-semibold">Scope: </span>
                      <span className="font-mono">
                        District {req.districtCode}
                        {req.shopCode ? ` • Shop ${req.shopCode}` : ''}
                        {req.warehouseCode ? ` • Warehouse ${req.warehouseCode}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">Justification: </span>
                      <span>{req.justification}</span>
                    </div>
                  </div>

                  {req.reviewNotes ? (
                    <div className="mt-2 rounded bg-slate-50 p-2 text-slate-800">
                      <span className="font-semibold text-slate-600">Reviewer Notes: </span>
                      <span>{req.reviewNotes}</span>
                    </div>
                  ) : null}

                  {req.status === 'PENDING' ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => handleCancelRequest(req.id)}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Cancel Request
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
