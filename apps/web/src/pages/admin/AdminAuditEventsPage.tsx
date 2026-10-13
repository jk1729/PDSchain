import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { apiClient, ApiClientError } from '../../lib/api-client';
import { SecurityAuditEventItem } from '../../types/auth';

export function AdminAuditEventsPage() {
  const [events, setEvents] = React.useState<SecurityAuditEventItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadAuditEvents = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await apiClient.listAuditEvents(100);
      setEvents(data);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load audit events.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAuditEvents();
  }, [loadAuditEvents]);

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Security Audit Trail</h1>
          <p className="text-xs text-slate-600">
            Immutable log of all security, authentication, and role transitions (redacts tokens &
            credentials).
          </p>
        </div>

        <Button variant="secondary" onClick={() => void loadAuditEvents()} disabled={isLoading}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Refresh Audit Trail
        </Button>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <AlertCircle className="h-4 w-4 text-rose-600" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingIndicator message="Fetching audit events..." />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-xs text-slate-500">
            No audit events recorded yet.
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2.5">Event Type</th>
                  <th className="px-3 py-2.5">Outcome</th>
                  <th className="px-3 py-2.5">Actor / Target</th>
                  <th className="px-3 py-2.5">Resource Scope</th>
                  <th className="px-3 py-2.5">IP / Correlation ID</th>
                  <th className="px-3 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-bold text-slate-900">{ev.eventType}</td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        status={
                          ev.outcome === 'SUCCESS'
                            ? 'success'
                            : ev.outcome === 'DENIED'
                              ? 'error'
                              : 'warning'
                        }
                        label={ev.outcome}
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                      <div>
                        Actor:{' '}
                        {ev.actorUserId ? ev.actorUserId.slice(0, 8) + '...' : 'System / Unauth'}
                      </div>
                      {ev.targetUserId ? <div>Target: {ev.targetUserId.slice(0, 8)}...</div> : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {ev.targetResourceType ? (
                        <span className="font-mono text-[11px]">
                          {ev.targetResourceType}: {ev.targetResourceId || '—'}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                      <div>{ev.ipAddress || '—'}</div>
                      {ev.correlationId ? (
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          {ev.correlationId}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
