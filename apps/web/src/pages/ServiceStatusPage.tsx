import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Database, RefreshCw, Send, Server } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { Input } from '../components/ui/Input';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  ApiClientError,
  apiClient,
  DiagnosticPingResponse,
  HealthSummaryResponse,
  ReadinessResponse,
} from '../lib/api-client';

const diagnosticPingSchema = z.object({
  clientName: z
    .string()
    .min(1, 'Client identifier is required')
    .max(64, 'Client identifier must be at most 64 characters')
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'Only letters, numbers, dots, underscores, and hyphens are allowed',
    ),
  note: z.string().max(200, 'Diagnostic note must be at most 200 characters').optional(),
});

type DiagnosticPingFormValues = z.infer<typeof diagnosticPingSchema>;

export function ServiceStatusPage() {
  const [summary, setSummary] = React.useState<HealthSummaryResponse | null>(null);
  const [readiness, setReadiness] = React.useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [probeError, setProbeError] = React.useState<{
    message: string;
    code?: string;
    correlationId?: string;
  } | null>(null);

  const [pingResult, setPingResult] = React.useState<DiagnosticPingResponse | null>(null);
  const [pingError, setPingError] = React.useState<{
    message: string;
    code?: string;
    correlationId?: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DiagnosticPingFormValues>({
    resolver: zodResolver(diagnosticPingSchema),
    defaultValues: {
      clientName: 'web-diagnostics-console',
      note: 'Phase 1 operator connectivity check',
    },
  });

  const runHealthChecks = React.useCallback(async () => {
    setLoading(true);
    setProbeError(null);

    try {
      const [summaryRes, readyRes] = await Promise.all([
        apiClient.fetchHealthSummary(),
        apiClient.fetchReadiness(),
      ]);
      setSummary(summaryRes);
      setReadiness(readyRes);
    } catch (err) {
      setReadiness(null);
      if (err instanceof ApiClientError) {
        setProbeError({
          message: err.message,
          code: err.code,
          correlationId: err.correlationId,
        });
      } else {
        setProbeError({
          message: 'Unexpected failure while probing backend health endpoints.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void runHealthChecks();
  }, [runHealthChecks]);

  const onSubmitPing = async (values: DiagnosticPingFormValues) => {
    setPingError(null);
    setPingResult(null);
    try {
      const response = await apiClient.sendDiagnosticPing(values);
      setPingResult(response);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setPingError({
          message: err.message,
          code: err.code,
          correlationId: err.correlationId,
        });
      } else {
        setPingError({
          message: 'Diagnostic ping request failed.',
        });
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Service Status & Readiness Diagnostics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live verification of NestJS API availability and PostgreSQL database readiness.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          isLoading={loading}
          onClick={() => void runHealthChecks()}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          Re-run Health Probes
        </Button>
      </div>

      {loading ? (
        <LoadingIndicator label="Probing /api/v1/health and /api/v1/health/ready..." />
      ) : null}

      {probeError ? (
        <ErrorDisplay
          title="Service Readiness Check Failed"
          message={probeError.message}
          code={probeError.code}
          correlationId={probeError.correlationId}
          onRetry={() => void runHealthChecks()}
        />
      ) : null}

      {!loading && summary ? (
        <div className="grid gap-6 md:grid-cols-2" data-testid="service-status-grid">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Server className="h-5 w-5 text-slate-800" aria-hidden="true" />
                <div>
                  <CardTitle>Backend REST API</CardTitle>
                  <CardDescription>Endpoint: GET /api/v1/health</CardDescription>
                </div>
              </div>
              <StatusBadge
                data-testid="api-status-badge"
                status={summary.checks.api.status === 'up' ? 'operational' : 'offline'}
                label={summary.checks.api.status === 'up' ? 'Operational' : 'Offline'}
              />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Service Name</span>
                <span className="font-mono font-medium text-slate-900">{summary.service}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Version / Phase</span>
                <span className="font-mono text-slate-900">
                  v{summary.version} (Phase {summary.phase})
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Environment</span>
                <span className="font-mono text-slate-900">{summary.environment}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Process Uptime</span>
                <span className="font-mono text-slate-900">{summary.uptimeSeconds}s</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Correlation ID</span>
                <span className="font-mono text-xs text-slate-700">{summary.correlationId}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-slate-800" aria-hidden="true" />
                <div>
                  <CardTitle>PostgreSQL Relational Database</CardTitle>
                  <CardDescription>Endpoint: GET /api/v1/health/ready</CardDescription>
                </div>
              </div>
              <StatusBadge
                data-testid="db-status-badge"
                status={
                  readiness?.status === 'ready' && summary.checks.database.status === 'up'
                    ? 'operational'
                    : 'offline'
                }
                label={
                  readiness?.status === 'ready' && summary.checks.database.status === 'up'
                    ? 'Ready (Connected)'
                    : 'Unavailable'
                }
              />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Readiness State</span>
                <span className="font-mono font-medium text-slate-900">
                  {readiness?.status ?? 'not_ready'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Query Probe (SELECT 1)</span>
                <span className="font-mono text-slate-900">
                  {summary.checks.database.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-600">Round-Trip Latency</span>
                <span className="font-mono text-slate-900">
                  {summary.checks.database.latencyMs} ms
                </span>
              </div>
              <div className="py-1.5">
                <span className="block text-slate-600">Diagnostic Detail</span>
                <p className="mt-1 rounded bg-slate-50 p-2 font-mono text-xs text-slate-800">
                  {summary.checks.database.message}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Interactive API & DTO Validation Probe</CardTitle>
          <CardDescription>
            Dispatches a validated POST request to /api/v1/health/ping using React Hook Form, Zod,
            and NestJS class-validator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmitPing)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Client Identifier"
                placeholder="e.g. web-diagnostics-console"
                helperText="Alphanumeric, dots, underscores, or hyphens (max 64 chars)"
                error={errors.clientName?.message}
                {...register('clientName')}
              />
              <Input
                label="Diagnostic Note (Optional)"
                placeholder="Optional note echoed by the server"
                helperText="Max 200 characters"
                error={errors.note?.message}
                {...register('note')}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="secondary"
                isLoading={isSubmitting}
                leftIcon={<Send className="h-4 w-4" aria-hidden="true" />}
              >
                Send Diagnostic Ping
              </Button>
            </div>
          </form>

          {pingError ? (
            <div className="mt-4">
              <ErrorDisplay
                title="Diagnostic Ping Rejected"
                message={pingError.message}
                code={pingError.code}
                correlationId={pingError.correlationId}
              />
            </div>
          ) : null}

          {pingResult ? (
            <div
              className="mt-4 rounded-md border border-emerald-300 bg-emerald-50/80 p-4 text-sm text-emerald-950"
              data-testid="ping-ack-panel"
            >
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>Backend Acknowledged Diagnostic Ping</span>
              </div>
              <div className="mt-2 grid gap-2 font-mono text-xs sm:grid-cols-2">
                <div>Status: {pingResult.status}</div>
                <div>Client: {pingResult.clientName}</div>
                <div>Note: {pingResult.note ?? '—'}</div>
                <div>Correlation ID: {pingResult.correlationId}</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
