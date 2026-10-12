import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { ApiClientError, apiClient } from '../src/lib/api-client';

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

describe('PDSChain v2 Frontend Foundation (Vitest + Testing Library)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the WelcomePage and displays live backend connectivity when healthy', async () => {
    vi.spyOn(apiClient, 'fetchHealthSummary').mockResolvedValue({
      status: 'healthy',
      service: 'pdschain-v2',
      version: '0.1.0',
      phase: 1,
      environment: 'test',
      uptimeSeconds: 42,
      checks: {
        api: { status: 'up', message: 'NestJS API process is active and serving requests' },
        database: {
          status: 'up',
          latencyMs: 1.4,
          message: 'PostgreSQL connection verified via SELECT 1',
        },
      },
      timestamp: new Date().toISOString(),
      correlationId: 'corr-unit-001',
    });

    render(
      <MemoryRouter initialEntries={['/']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        name: /PDSChain v2 — Traceable Public Distribution System Platform/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('welcome-health-summary')).toBeInTheDocument();
    });

    expect(screen.getByText(/PostgreSQL connection verified via SELECT 1/i)).toBeInTheDocument();
    expect(screen.getByText(/All Foundation Services Ready/i)).toBeInTheDocument();
  });

  it('displays an explicit ErrorDisplay when the backend API is unreachable', async () => {
    vi.spyOn(apiClient, 'fetchHealthSummary').mockRejectedValue(
      new ApiClientError({
        message: 'Unable to reach backend API at http://localhost:4000/api/v1',
        statusCode: 0,
        code: 'NETWORK_UNAVAILABLE',
        isNetworkError: true,
      }),
    );

    render(
      <MemoryRouter initialEntries={['/']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
    });

    expect(screen.getByText(/Backend Unreachable/i)).toBeInTheDocument();
    expect(screen.getByText(/NETWORK_UNAVAILABLE/i)).toBeInTheDocument();
  });

  it('renders the ServiceStatusPage and submits a validated diagnostic ping', async () => {
    vi.spyOn(apiClient, 'fetchHealthSummary').mockResolvedValue({
      status: 'healthy',
      service: 'pdschain-v2',
      version: '0.1.0',
      phase: 1,
      environment: 'test',
      uptimeSeconds: 18,
      checks: {
        api: { status: 'up', message: 'NestJS API process is active and serving requests' },
        database: {
          status: 'up',
          latencyMs: 0.9,
          message: 'PostgreSQL connection verified via SELECT 1',
        },
      },
      timestamp: new Date().toISOString(),
      correlationId: 'corr-status-001',
    });

    vi.spyOn(apiClient, 'fetchReadiness').mockResolvedValue({
      status: 'ready',
      service: 'pdschain-v2',
      phase: 1,
      check: 'readiness',
      dependencies: {
        database: {
          status: 'up',
          latencyMs: 0.9,
          message: 'PostgreSQL connection verified via SELECT 1',
        },
      },
      timestamp: new Date().toISOString(),
      correlationId: 'corr-ready-001',
    });

    const pingSpy = vi.spyOn(apiClient, 'sendDiagnosticPing').mockResolvedValue({
      status: 'acknowledged',
      service: 'pdschain-v2',
      phase: 1,
      clientName: 'web-diagnostics-console',
      note: 'Phase 1 operator connectivity check',
      timestamp: new Date().toISOString(),
      correlationId: 'corr-ping-001',
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/status']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('service-status-grid')).toBeInTheDocument();
    });

    expect(screen.getByTestId('api-status-badge')).toHaveTextContent('Operational');
    expect(screen.getByTestId('db-status-badge')).toHaveTextContent('Ready (Connected)');

    const submitBtn = screen.getByRole('button', { name: /Send Diagnostic Ping/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('ping-ack-panel')).toBeInTheDocument();
    });
    expect(pingSpy).toHaveBeenCalledWith({
      clientName: 'web-diagnostics-console',
      note: 'Phase 1 operator connectivity check',
    });
  });

  it('renders the NotFoundPage for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-phase-route']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Requested Page Does Not Exist/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Platform Overview/i })).toBeInTheDocument();
  });

  it('catches unexpected rendering errors using ErrorBoundary', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenComponent(): JSX.Element {
      throw new Error('Simulated unexpected UI failure');
    }

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: /Unexpected Application UI Error/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Simulated unexpected UI failure/i)).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });
});
