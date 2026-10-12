export interface DatabaseHealthProbe {
  status: 'up' | 'down';
  latencyMs: number;
  message: string;
}

export interface HealthSummaryResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  phase: number;
  environment: string;
  uptimeSeconds: number;
  checks: {
    api: {
      status: 'up';
      message: string;
    };
    database: DatabaseHealthProbe;
  };
  timestamp: string;
  correlationId: string;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  service: string;
  phase: number;
  check: 'readiness';
  dependencies: {
    database: DatabaseHealthProbe;
  };
  timestamp: string;
  correlationId: string;
}

export interface DiagnosticPingRequest {
  clientName: string;
  note?: string;
}

export interface DiagnosticPingResponse {
  status: 'acknowledged';
  service: string;
  phase: number;
  clientName: string;
  note: string | null;
  timestamp: string;
  correlationId: string;
}

export interface StandardApiErrorEnvelope {
  status: 'error';
  error: {
    code: string;
    statusCode: number;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
    correlationId: string;
  };
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly correlationId?: string;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;

  constructor(options: {
    message: string;
    statusCode: number;
    code: string;
    correlationId?: string;
    details?: unknown;
    isNetworkError?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.correlationId = options.correlationId;
    this.details = options.details;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

export function resolveApiBaseUrl(configuredUrl?: string): string {
  const raw = (configuredUrl ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1')
    .trim()
    .replace(/\/+$/, '');
  return raw;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = resolveApiBaseUrl(baseUrl);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init?.headers ?? {}),
        },
      });
    } catch (error) {
      throw new ApiClientError({
        message:
          error instanceof Error
            ? `Unable to reach backend API at ${this.baseUrl}: ${error.message}`
            : `Unable to reach backend API at ${this.baseUrl}`,
        statusCode: 0,
        code: 'NETWORK_UNAVAILABLE',
        isNetworkError: true,
      });
    }

    const correlationHeader = response.headers.get('x-correlation-id') ?? undefined;
    let body: unknown = null;

    try {
      body = await response.json();
    } catch {
      if (!response.ok) {
        throw new ApiClientError({
          message: `API responded with HTTP ${response.status} and a non-JSON payload`,
          statusCode: response.status,
          code: `HTTP_${response.status}`,
          correlationId: correlationHeader,
        });
      }
      throw new ApiClientError({
        message: 'API returned a malformed JSON response',
        statusCode: response.status,
        code: 'INVALID_JSON_RESPONSE',
        correlationId: correlationHeader,
      });
    }

    if (!response.ok) {
      const errEnv = body as Partial<StandardApiErrorEnvelope>;
      if (errEnv && typeof errEnv === 'object' && errEnv.error) {
        throw new ApiClientError({
          message: errEnv.error.message || `API request failed with HTTP ${response.status}`,
          statusCode: errEnv.error.statusCode ?? response.status,
          code: errEnv.error.code ?? `HTTP_${response.status}`,
          correlationId: errEnv.error.correlationId ?? correlationHeader,
          details: errEnv.error.details,
        });
      }

      throw new ApiClientError({
        message: `API request failed with HTTP ${response.status}`,
        statusCode: response.status,
        code: `HTTP_${response.status}`,
        correlationId: correlationHeader,
      });
    }

    return body as T;
  }

  public fetchHealthSummary(): Promise<HealthSummaryResponse> {
    return this.request<HealthSummaryResponse>('/health');
  }

  public fetchReadiness(): Promise<ReadinessResponse> {
    return this.request<ReadinessResponse>('/health/ready');
  }

  public sendDiagnosticPing(payload: DiagnosticPingRequest): Promise<DiagnosticPingResponse> {
    return this.request<DiagnosticPingResponse>('/health/ping', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const apiClient = new ApiClient();
