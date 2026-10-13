import * as React from 'react';
import { AlertCircle, CheckCircle2, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { StaffAccessRequestItem, StaffRequestStatus } from '../../types/auth';

export function AdminStaffRequestsPage() {
  const [requests, setRequests] = React.useState<StaffAccessRequestItem[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<StaffRequestStatus | 'ALL'>('PENDING');
  const [isLoading, setIsLoading] = React.useState(true);
  const [actionFeedback, setActionFeedback] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Review modal state
  const [reviewModalRequest, setReviewModalRequest] = React.useState<StaffAccessRequestItem | null>(
    null,
  );
  const [reviewAction, setReviewAction] = React.useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNote, setReviewNote] = React.useState('');
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false);

  const loadRequests = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.listStaffRequests(
        selectedStatus === 'ALL' ? undefined : selectedStatus,
      );
      setRequests(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setActionFeedback({ type: 'error', message: err.message });
      } else {
        setActionFeedback({ type: 'error', message: 'Failed to load staff requests.' });
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus]);

  React.useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleOpenReview = (request: StaffAccessRequestItem, action: 'APPROVE' | 'REJECT') => {
    setReviewModalRequest(request);
    setReviewAction(action);
    setReviewNote(
      action === 'APPROVE' ? 'Verified credentials and government deployment order.' : '',
    );
    setActionFeedback(null);
  };

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalRequest) return;

    if (reviewAction === 'REJECT' && !reviewNote.trim()) {
      setActionFeedback({ type: 'error', message: 'A rejection reason is required.' });
      return;
    }

    setIsSubmittingReview(true);
    setActionFeedback(null);

    try {
      if (reviewAction === 'APPROVE') {
        const res = await apiClient.approveStaffRequest(reviewModalRequest.id, reviewNote.trim());
        setActionFeedback({ type: 'success', message: res.message });
      } else {
        const res = await apiClient.rejectStaffRequest(reviewModalRequest.id, reviewNote.trim());
        setActionFeedback({ type: 'success', message: res.message });
      }
      setReviewModalRequest(null);
      await loadRequests();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setActionFeedback({ type: 'error', message: err.message });
      } else {
        setActionFeedback({ type: 'error', message: 'Failed to process request.' });
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Staff Access Review Queue</h1>
          <p className="text-xs text-slate-600">
            Review and grant operational role privileges (FPS Operator, Warehouse Manager, District
            Officer).
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedStatus === status
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {actionFeedback ? (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            actionFeedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingIndicator message="Fetching staff access requests..." />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-xs text-slate-500">
            No staff requests found matching the selected filter ({selectedStatus}).
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((item) => (
            <Card key={item.id}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {item.requester?.fullName || 'Beneficiary'}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        ({item.requester?.email})
                      </span>
                      <StatusBadge
                        status={
                          item.status === 'APPROVED'
                            ? 'success'
                            : item.status === 'REJECTED'
                              ? 'error'
                              : item.status === 'CANCELLED'
                                ? 'neutral'
                                : 'warning'
                        }
                        label={item.status}
                      />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="rounded bg-sky-50 px-2 py-0.5 font-bold text-sky-800 border border-sky-200">
                        Target Role: {item.requestedRole}
                      </span>
                      <span className="font-mono text-slate-600">
                        District: {item.districtCode}
                        {item.shopCode ? ` • Shop: ${item.shopCode}` : ''}
                        {item.warehouseCode ? ` • Warehouse: ${item.warehouseCode}` : ''}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-500">Justification: </span>
                  <span>{item.justification}</span>
                </div>

                {item.reviewNotes ? (
                  <div className="rounded bg-slate-50 p-2.5 text-xs text-slate-800">
                    <span className="font-semibold text-slate-600">
                      Reviewer Note ({item.reviewer?.fullName || 'Admin'}):{' '}
                    </span>
                    <span>{item.reviewNotes}</span>
                  </div>
                ) : null}

                {item.status === 'PENDING' ? (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleOpenReview(item, 'REJECT')}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <ThumbsDown className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Reject
                    </Button>
                    <Button variant="primary" onClick={() => handleOpenReview(item, 'APPROVE')}>
                      <ThumbsUp className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Approve & Assign Role
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalRequest ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {reviewAction === 'APPROVE' ? 'Approve Staff Request' : 'Reject Staff Request'}
              </h2>
              <button
                type="button"
                onClick={() => setReviewModalRequest(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="text-xs space-y-1 text-slate-700">
              <p>
                <span className="font-semibold">Applicant:</span>{' '}
                {reviewModalRequest.requester?.fullName} ({reviewModalRequest.requester?.email})
              </p>
              <p>
                <span className="font-semibold">Role:</span> {reviewModalRequest.requestedRole}
              </p>
              <p>
                <span className="font-semibold">Scope:</span> District{' '}
                {reviewModalRequest.districtCode}
                {reviewModalRequest.shopCode ? `, Shop ${reviewModalRequest.shopCode}` : ''}
                {reviewModalRequest.warehouseCode
                  ? `, Warehouse ${reviewModalRequest.warehouseCode}`
                  : ''}
              </p>
            </div>

            <form onSubmit={handleExecuteReview} className="space-y-4">
              <div>
                <label
                  htmlFor="review-note"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {reviewAction === 'APPROVE'
                    ? 'Approval Audit Notes'
                    : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  id="review-note"
                  rows={3}
                  required={reviewAction === 'REJECT'}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewAction === 'APPROVE'
                      ? 'Add any audit references or conditions...'
                      : 'Provide a reason for rejection...'
                  }
                  className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReviewModalRequest(null)}
                  disabled={isSubmittingReview}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingReview}
                  className={
                    reviewAction === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600'
                      : ''
                  }
                >
                  {isSubmittingReview
                    ? 'Processing...'
                    : reviewAction === 'APPROVE'
                      ? 'Confirm Approval'
                      : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
