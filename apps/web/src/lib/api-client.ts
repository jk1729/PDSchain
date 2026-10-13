import {
  AuthenticatedPrincipal,
  CanonicalRole,
  SecurityAuditEventItem,
  StaffAccessRequestItem,
  StaffRequestStatus,
  UserDetail,
  UserSummaryItem,
} from '../types/auth';

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

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)pdschain_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiClient {
  private readonly baseUrl: string;
  private currentCsrfToken: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = resolveApiBaseUrl(baseUrl);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setCsrfToken(token: string | null): void {
    this.currentCsrfToken = token;
  }

  public getCsrfToken(): string | null {
    return this.currentCsrfToken ?? getCsrfTokenFromCookie();
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;
    const method = init?.method?.toUpperCase() ?? 'GET';
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init?.headers as Record<string, string>) ?? {}),
    };

    if (isMutating) {
      const token = this.getCsrfToken();
      if (token) {
        headers['x-csrf-token'] = token;
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        credentials: 'include',
        headers,
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

  // --- Diagnostic & Health Endpoints ---

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

  // --- Authentication Endpoints ---

  public async registerCitizen(payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  }): Promise<{
    status: string;
    message: string;
    emailDelivery: { delivered: boolean; mode: string };
  }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async verifyEmail(token: string): Promise<{ status: string; message: string }> {
    return this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  public async resendVerification(email: string): Promise<{ status: string; message: string }> {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async login(payload: { email: string; password: string }): Promise<{
    status: string;
    user: AuthenticatedPrincipal;
    csrfToken: string;
    expiresAt: string;
  }> {
    const res = await this.request<{
      status: string;
      user: AuthenticatedPrincipal;
      csrfToken: string;
      expiresAt: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.csrfToken) {
      this.setCsrfToken(res.csrfToken);
    }
    return res;
  }

  public async logout(): Promise<{ status: string; message: string }> {
    const res = await this.request<{ status: string; message: string }>('/auth/logout', {
      method: 'POST',
    });
    this.setCsrfToken(null);
    return res;
  }

  public async getCurrentUser(): Promise<{
    status: string;
    user: AuthenticatedPrincipal;
    csrfToken: string | null;
  }> {
    const res = await this.request<{
      status: string;
      user: AuthenticatedPrincipal;
      csrfToken: string | null;
    }>('/auth/me');
    if (res.csrfToken) {
      this.setCsrfToken(res.csrfToken);
    }
    return res;
  }

  public async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(payload: {
    token: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ status: string; message: string }> {
    const res = await this.request<{ status: string; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setCsrfToken(null);
    return res;
  }

  // --- Users Endpoints ---

  public async getMyProfile(): Promise<UserDetail> {
    return this.request<UserDetail>('/users/me');
  }

  public async updateMyProfile(payload: { fullName?: string }): Promise<UserDetail> {
    return this.request<UserDetail>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public async getUser(id: string): Promise<UserDetail> {
    return this.request<UserDetail>(`/users/${id}`);
  }

  // --- Staff Requests Endpoints ---

  public async createStaffRequest(payload: {
    requestedRole: CanonicalRole;
    districtCode: string;
    warehouseCode?: string;
    shopCode?: string;
    justification: string;
  }): Promise<{ status: string; message: string; request: StaffAccessRequestItem }> {
    return this.request('/staff-access-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getMyStaffRequests(): Promise<StaffAccessRequestItem[]> {
    return this.request<StaffAccessRequestItem[]>('/staff-access-requests/me');
  }

  public async cancelStaffRequest(id: string): Promise<{ status: string; message: string }> {
    return this.request(`/staff-access-requests/${id}/cancel`, {
      method: 'POST',
    });
  }

  // --- Admin Endpoints ---

  public async listStaffRequests(status?: StaffRequestStatus): Promise<StaffAccessRequestItem[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<StaffAccessRequestItem[]>(`/admin/staff-access-requests${q}`);
  }

  public async getStaffRequestDetails(id: string): Promise<StaffAccessRequestItem> {
    return this.request<StaffAccessRequestItem>(`/admin/staff-access-requests/${id}`);
  }

  public async approveStaffRequest(
    id: string,
    notes?: string,
  ): Promise<{ status: string; message: string; assignmentId: string }> {
    return this.request(`/admin/staff-access-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  public async rejectStaffRequest(
    id: string,
    reason: string,
  ): Promise<{ status: string; message: string }> {
    return this.request(`/admin/staff-access-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async listUsers(search?: string): Promise<UserSummaryItem[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<UserSummaryItem[]>(`/admin/users${q}`);
  }

  public async getUserDetails(id: string): Promise<UserDetail> {
    return this.request<UserDetail>(`/admin/users/${id}`);
  }

  public async suspendUser(
    id: string,
    reason: string,
  ): Promise<{ status: string; message: string }> {
    return this.request(`/admin/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async reactivateUser(id: string): Promise<{ status: string; message: string }> {
    return this.request(`/admin/users/${id}/reactivate`, {
      method: 'POST',
    });
  }

  public async revokeRole(
    userId: string,
    assignmentId: string,
    reason: string,
  ): Promise<{ status: string; message: string }> {
    return this.request(`/admin/users/${userId}/roles/${assignmentId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async listAuditEvents(limit = 100): Promise<SecurityAuditEventItem[]> {
    return this.request<SecurityAuditEventItem[]>(`/admin/audit-events?limit=${limit}`);
  }
}

export const apiClient = new ApiClient();
