import * as React from 'react';
import { Activity, ArrowRight, Blocks, Database, FileCheck2, Layers, Server } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ApiClientError, apiClient, HealthSummaryResponse } from '../lib/api-client';

const roadmapPhases = [
  {
    phase: 1,
    title: 'Foundation, Architecture & Project Setup',
    status: 'Active Phase',
    description:
      'Monorepo workspaces, React + Tailwind shell, NestJS health & readiness endpoints, PostgreSQL + Prisma migrations, and Hardhat workspace.',
  },
  {
    phase: 2,
    title: 'Identity, Authentication & Role-Based Access Control',
    status: 'Planned',
    description:
      'Secure authentication, session management, audit logging, and role boundaries for State Admin, Warehouse Manager, Ration Shop, and Auditor.',
  },
  {
    phase: 3,
    title: 'Smart Contracts & On-Chain Custody Anchor',
    status: 'Planned',
    description:
      'Production Solidity contracts for commodity batches, custody transfers, and immutable distribution proofs.',
  },
  {
    phase: 4,
    title: 'Core Off-Chain Domain & Supply Chain Registry',
    status: 'Planned',
    description:
      'Districts, warehouses, fair price shops, beneficiaries, and entitlement allocation management in PostgreSQL.',
  },
  {
    phase: 5,
    title: 'Dispatch, Transit & Custody Handover Workflows',
    status: 'Planned',
    description:
      'End-to-end stock allocation, dispatch verification, receipt reconciliation, and blockchain transaction indexing.',
  },
  {
    phase: 6,
    title: 'Beneficiary Distribution, Audit Trail & Public Verification',
    status: 'Planned',
    description:
      'Fair price shop issuance recording, anomaly detection, and cryptographic audit verification.',
  },
  {
    phase: 7,
    title: 'System Hardening, E2E Verification & Production Readiness',
    status: 'Planned',
    description:
      'Comprehensive browser E2E testing, security review, performance benchmarks, and deployment runbooks.',
  },
];

export function WelcomePage() {
  const [health, setHealth] = React.useState<HealthSummaryResponse | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<{
    message: string;
    code?: string;
    correlationId?: string;
  } | null>(null);

  const loadHealthOverview = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.fetchHealthSummary();
      setHealth(response);
    } catch (err) {
      setHealth(null);
      if (err instanceof ApiClientError) {
        setError({
          message: err.message,
          code: err.code,
          correlationId: err.correlationId,
        });
      } else {
        setError({
          message: 'Failed to retrieve live service status from backend API.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadHealthOverview();
  }, [loadHealthOverview]);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="operational" label="Phase 1 Foundation Established" />
          <span className="font-mono text-xs text-slate-600">
            API Target: {apiClient.getBaseUrl()}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          PDSChain v2 — Traceable Public Distribution System Platform
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700">
          PDSChain v2 is a blockchain-supported public distribution platform engineered to provide
          verifiable commodity custody, transparent warehouse-to-shop transfers, and auditable
          ration distribution records backed by PostgreSQL and Ethereum-compatible smart contracts.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/status"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span>Open Live Service Diagnostics</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Button variant="outline" size="md" onClick={() => void loadHealthOverview()}>
            Refresh Connectivity Snapshot
          </Button>
        </div>
      </section>

      <section aria-labelledby="architecture-pillars-heading">
        <h2 id="architecture-pillars-heading" className="text-lg font-semibold text-slate-900">
          Core Platform Architecture Pillars
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Layers className="h-5 w-5 text-sky-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Strict TypeScript Frontend</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                React 18, Vite, Tailwind CSS, React Router, and centralized API error boundaries
                built for role-based workflows.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Server className="h-5 w-5 text-sky-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold">NestJS REST API (/api/v1)</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Validated DTO pipelines, correlation IDs, structured request telemetry, and distinct
                liveness and readiness probes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Database className="h-5 w-5 text-sky-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold">PostgreSQL & Prisma ORM</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Version-controlled relational migrations and live SQL connectivity probes with zero
                SQLite or in-memory fallbacks.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Blocks className="h-5 w-5 text-sky-700" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Hardhat & Solidity</h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Independently testable smart-contract workspace with OpenZeppelin contracts,
                TypeChain bindings, and local deployment manifests.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="live-snapshot-heading">
        <Card>
          <CardHeader className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle id="live-snapshot-heading">
                Real-Time Foundation Connectivity Snapshot
              </CardTitle>
              <CardDescription>
                Live telemetry queried directly from GET /api/v1/health. No mocked responses or
                placeholder balances.
              </CardDescription>
            </div>
            {health ? (
              <StatusBadge
                status={health.status === 'healthy' ? 'operational' : 'degraded'}
                label={health.status === 'healthy' ? 'All Foundation Services Ready' : 'Degraded'}
              />
            ) : error ? (
              <StatusBadge status="offline" label="Backend Unreachable" />
            ) : (
              <StatusBadge status="pending" label="Checking..." />
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingIndicator label="Querying backend health endpoint (/api/v1/health)..." />
            ) : error ? (
              <ErrorDisplay
                title="Backend Health Endpoint Unreachable"
                message={error.message}
                code={error.code}
                correlationId={error.correlationId}
                onRetry={() => void loadHealthOverview()}
              />
            ) : health ? (
              <div className="grid gap-4 sm:grid-cols-3" data-testid="welcome-health-summary">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">API Process</span>
                    <StatusBadge
                      status="operational"
                      label={health.checks.api.status.toUpperCase()}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-700">{health.checks.api.message}</p>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">PostgreSQL Database</span>
                    <StatusBadge
                      status={health.checks.database.status === 'up' ? 'operational' : 'offline'}
                      label={health.checks.database.status.toUpperCase()}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-700">
                    {health.checks.database.message} ({health.checks.database.latencyMs} ms)
                  </p>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                  <span className="text-xs font-medium text-slate-600">Trace Metadata</span>
                  <p className="mt-2 font-mono text-xs text-slate-800">
                    Environment: {health.environment}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-slate-600">
                    Correlation: {health.correlationId}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Inspect readiness probes and test DTO validation on the Service Status page.
            </span>
            <Link to="/status" className="font-semibold text-slate-900 hover:underline">
              View Full Diagnostics →
            </Link>
          </CardFooter>
        </Card>
      </section>

      <section aria-labelledby="roadmap-heading">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-slate-800" aria-hidden="true" />
              <CardTitle id="roadmap-heading">Strict 7-Phase Engineering Roadmap</CardTitle>
            </div>
            <CardDescription>
              Phase 1 establishes the verified foundation. Business logic, RBAC, and domain smart
              contracts are scheduled for subsequent phases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="divide-y divide-slate-200">
              {roadmapPhases.map((item) => (
                <li
                  key={item.phase}
                  className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        Phase {item.phase}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge
                      status={item.phase === 1 ? 'operational' : 'neutral'}
                      label={item.status}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
