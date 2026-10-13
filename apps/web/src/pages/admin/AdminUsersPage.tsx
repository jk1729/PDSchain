import * as React from 'react';
import { AlertCircle, Ban, CheckCircle2, Search, Trash2, Unlock, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { UserDetail, UserSummaryItem } from '../../types/auth';

export function AdminUsersPage() {
  const [users, setUsers] = React.useState<UserSummaryItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedUser, setSelectedUser] = React.useState<UserDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false);

  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Suspension modal
  const [suspendModalUser, setSuspendModalUser] = React.useState<UserSummaryItem | null>(null);
  const [suspendReason, setSuspendReason] = React.useState('');
  const [isSuspending, setIsSuspending] = React.useState(false);

  // Role revocation modal
  const [revokeModalAssignment, setRevokeModalAssignment] = React.useState<{
    userId: string;
    assignmentId: string;
    role: string;
  } | null>(null);
  const [revokeReason, setRevokeReason] = React.useState('');
  const [isRevoking, setIsRevoking] = React.useState(false);

  const loadUsers = React.useCallback(async (query = '') => {
    try {
      setIsLoading(true);
      const data = await apiClient.listUsers(query || undefined);
      setUsers(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.message });
      } else {
        setFeedback({ type: 'error', message: 'Failed to load user roster.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadUsers(searchQuery);
  };

  const handleSelectUser = async (userId: string) => {
    try {
      setIsLoadingDetail(true);
      const detail = await apiClient.getUserDetails(userId);
      setSelectedUser(detail);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.message });
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleExecuteSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendModalUser || !suspendReason.trim()) return;

    setIsSuspending(true);
    setFeedback(null);
    try {
      const res = await apiClient.suspendUser(suspendModalUser.id, suspendReason.trim());
      setFeedback({ type: 'success', message: res.message });
      setSuspendModalUser(null);
      setSuspendReason('');
      await loadUsers(searchQuery);
      if (selectedUser?.id === suspendModalUser.id) {
        await handleSelectUser(suspendModalUser.id);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.message });
      }
    } finally {
      setIsSuspending(false);
    }
  };

  const handleExecuteReactivate = async (userId: string) => {
    setFeedback(null);
    try {
      const res = await apiClient.reactivateUser(userId);
      setFeedback({ type: 'success', message: res.message });
      await loadUsers(searchQuery);
      if (selectedUser?.id === userId) {
        await handleSelectUser(userId);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleExecuteRevokeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeModalAssignment || !revokeReason.trim()) return;

    setIsRevoking(true);
    setFeedback(null);
    try {
      const res = await apiClient.revokeRole(
        revokeModalAssignment.userId,
        revokeModalAssignment.assignmentId,
        revokeReason.trim(),
      );
      setFeedback({ type: 'success', message: res.message });
      setRevokeModalAssignment(null);
      setRevokeReason('');
      await loadUsers(searchQuery);
      if (selectedUser?.id === revokeModalAssignment.userId) {
        await handleSelectUser(revokeModalAssignment.userId);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.message });
      }
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">User & Access Management</h1>
        <p className="text-xs text-slate-600">
          Inspect beneficiary accounts, active staff role scopes, account suspension, and role
          revocation.
        </p>
      </div>

      {feedback ? (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            feedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Users list with search */}
        <div className="space-y-4 lg:col-span-1">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <Input
              id="user-search"
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs"
            />
            <Button type="submit" variant="secondary" className="px-3" aria-label="Search users">
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>

          {isLoading ? (
            <LoadingIndicator message="Loading user roster..." />
          ) : users.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No users found.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u.id)}
                  className={`cursor-pointer rounded-md border p-3 text-xs transition-all ${
                    selectedUser?.id === u.id
                      ? 'border-slate-900 bg-slate-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 truncate">{u.fullName}</span>
                    <StatusBadge
                      status={u.status === 'ACTIVE' ? 'success' : 'error'}
                      label={u.status}
                    />
                  </div>
                  <p className="font-mono text-slate-500 truncate mt-0.5">{u.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span
                        key={r}
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 text-[10px]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: User Details and Administrative Controls */}
        <div className="space-y-4 lg:col-span-2">
          {isLoadingDetail ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <LoadingIndicator message="Fetching user details..." />
            </div>
          ) : selectedUser ? (
            <Card
              title={selectedUser.fullName}
              description={`ID: ${selectedUser.id} • Registered ${new Date(selectedUser.createdAt).toLocaleDateString()}`}
            >
              <div className="space-y-4 text-xs">
                {/* Status and Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={selectedUser.status === 'ACTIVE' ? 'success' : 'error'}
                      label={`Account: ${selectedUser.status}`}
                    />
                    <StatusBadge
                      status={selectedUser.emailVerified ? 'success' : 'warning'}
                      label={selectedUser.emailVerified ? 'Email Verified' : 'Unverified'}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedUser.status === 'ACTIVE' ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setSuspendModalUser({
                            id: selectedUser.id,
                            email: selectedUser.email,
                            fullName: selectedUser.fullName,
                            status: selectedUser.status,
                            emailVerified: selectedUser.emailVerified,
                            createdAt: selectedUser.createdAt,
                            roles: selectedUser.roles,
                            assignmentsCount: selectedUser.assignments.length,
                          })
                        }
                        className="text-rose-600 hover:text-rose-800"
                      >
                        <Ban className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Suspend Account
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleExecuteReactivate(selectedUser.id)}
                      >
                        <Unlock className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Reactivate Account
                      </Button>
                    )}
                  </div>
                </div>

                {selectedUser.suspensionReason ? (
                  <div className="rounded bg-rose-50 p-2.5 text-rose-900 border border-rose-200">
                    <p className="font-semibold">Account Suspended</p>
                    <p className="mt-0.5 text-rose-800">{selectedUser.suspensionReason}</p>
                    {selectedUser.suspendedAt ? (
                      <p className="mt-1 text-[10px] text-rose-600">
                        Date: {new Date(selectedUser.suspendedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* Role Assignments Section */}
                <div className="space-y-2 pt-2">
                  <h3 className="font-bold text-slate-900 text-sm">Role Assignments & Scopes</h3>
                  {selectedUser.assignments.length === 0 ? (
                    <p className="text-slate-500 italic">No staff role assignments granted.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded border border-slate-200">
                      {selectedUser.assignments.map((a) => (
                        <div
                          key={a.assignmentId}
                          className="flex items-center justify-between p-2.5 bg-white"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{a.role}</span>
                            <span className="ml-2 font-mono text-slate-500">
                              District: {a.districtCode || 'GLOBAL'}
                              {a.shopCode ? ` • Shop: ${a.shopCode}` : ''}
                              {a.warehouseCode ? ` • WH: ${a.warehouseCode}` : ''}
                            </span>
                          </div>
                          {a.role !== 'CITIZEN' ? (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setRevokeModalAssignment({
                                  userId: selectedUser.id,
                                  assignmentId: a.assignmentId,
                                  role: a.role,
                                })
                              }
                              className="text-rose-600 hover:text-rose-800 text-[11px] py-1 px-2"
                            >
                              <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" />
                              Revoke
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="py-16 text-center text-xs text-slate-500">
                Select a user from the roster on the left to inspect privileges and execute actions.
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Suspend Modal */}
      {suspendModalUser ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Suspend User Account</h2>
              <button
                type="button"
                onClick={() => setSuspendModalUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-slate-700">
              Suspending <span className="font-semibold">{suspendModalUser.fullName}</span> (
              {suspendModalUser.email}) will immediately terminate all active sessions and block any
              future login attempts until reactivated.
            </p>

            <form onSubmit={handleExecuteSuspend} className="space-y-4">
              <div>
                <label
                  htmlFor="suspend-reason"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Suspension Reason (Required for Audit Trail)
                </label>
                <textarea
                  id="suspend-reason"
                  rows={3}
                  required
                  minLength={5}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Enter official investigation or policy violation reason..."
                  className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSuspendModalUser(null)}
                  disabled={isSuspending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSuspending}
                  className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                >
                  {isSuspending ? 'Suspending...' : 'Confirm Suspension'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Revoke Role Modal */}
      {revokeModalAssignment ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Revoke Role Assignment</h2>
              <button
                type="button"
                onClick={() => setRevokeModalAssignment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-slate-700">
              Revoking role <span className="font-semibold">{revokeModalAssignment.role}</span> will
              immediately remove operational access for this assignment.
            </p>

            <form onSubmit={handleExecuteRevokeRole} className="space-y-4">
              <div>
                <label
                  htmlFor="revoke-reason"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Revocation Reason (Required)
                </label>
                <textarea
                  id="revoke-reason"
                  rows={3}
                  required
                  minLength={5}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Reason for role revocation (e.g. transfer, end of contract)..."
                  className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRevokeModalAssignment(null)}
                  disabled={isRevoking}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isRevoking}
                  className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                >
                  {isRevoking ? 'Revoking...' : 'Confirm Revocation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
