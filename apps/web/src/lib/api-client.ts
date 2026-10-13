import {
  AuthenticatedPrincipal,
  CanonicalRole,
  SecurityAuditEventItem,
  StaffAccessRequestItem,
  StaffRequestStatus,
  UserDetail,
  UserSummaryItem,
} from '../types/auth';
import {
  BeneficiaryItem,
  BlockchainActionResponse,
  BlockchainTxItem,
  CommodityItem,
  EntitlementItem,
  RecordDistributionPayload,
  WarehouseReceiptPayload,
  WarehouseTransferPayload,
} from '../types/distribution';
import {
  Commodity,
  District,
  FairPriceShop,
  InventoryBatch,
  ReceiptConfirmation,
  ReconciliationReport,
  StockAdjustment,
  StockAllocation,
  StockDispatch,
  StockMovement,
  StockReturn,
  Warehouse,
} from '../types/inventory';

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

  // ---------------------------------------------------------------------------
  // Phase 3 Distribution & Smart Contract Endpoints
  // ---------------------------------------------------------------------------
  public async fetchCommodities(): Promise<CommodityItem[]> {
    const res = await this.request<{ commodities: CommodityItem[] }>('/distribution/commodities');
    return res.commodities;
  }

  public async registerCommodity(payload: { commodityId: string; name: string; unit: string }) {
    return this.request('/distribution/commodities', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchBeneficiary(ref: string): Promise<BeneficiaryItem> {
    const res = await this.request<{ beneficiary: BeneficiaryItem }>(
      `/distribution/beneficiaries/${encodeURIComponent(ref)}`,
    );
    return res.beneficiary;
  }

  public async registerBeneficiary(payload: { beneficiaryRef: string; districtCode: string }) {
    return this.request('/distribution/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchEntitlement(
    ref: string,
    period: number,
    commodityId: string,
  ): Promise<EntitlementItem> {
    const res = await this.request<{ entitlement: EntitlementItem }>(
      `/distribution/entitlements?ref=${encodeURIComponent(ref)}&period=${period}&commodityId=${encodeURIComponent(commodityId)}`,
    );
    return res.entitlement;
  }

  public async setEntitlement(payload: {
    beneficiaryRef: string;
    period: number;
    commodityId: string;
    allocatedQuantity: number;
  }) {
    return this.request('/distribution/entitlements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchWarehouseStock(warehouseId: string, commodityId: string): Promise<number> {
    const res = await this.request<{ stock: number }>(
      `/distribution/inventory/warehouse/${encodeURIComponent(warehouseId)}?commodityId=${encodeURIComponent(commodityId)}`,
    );
    return res.stock;
  }

  public async receiveWarehouseStock(
    payload: WarehouseReceiptPayload,
  ): Promise<BlockchainActionResponse> {
    return this.request<BlockchainActionResponse>('/distribution/inventory/warehouse/receipt', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async transferStockToFps(
    payload: WarehouseTransferPayload,
  ): Promise<BlockchainActionResponse> {
    return this.request<BlockchainActionResponse>('/distribution/inventory/warehouse/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchFpsStock(fpsId: string, commodityId: string): Promise<number> {
    const res = await this.request<{ stock: number }>(
      `/distribution/inventory/fps/${encodeURIComponent(fpsId)}?commodityId=${encodeURIComponent(commodityId)}`,
    );
    return res.stock;
  }

  public async recordDistribution(
    payload: RecordDistributionPayload,
  ): Promise<BlockchainActionResponse> {
    return this.request<BlockchainActionResponse>('/distribution/distribute', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchDistributionTransactions(entityId?: string): Promise<BlockchainTxItem[]> {
    const q = entityId ? `?entityId=${encodeURIComponent(entityId)}` : '';
    const res = await this.request<{ transactions: BlockchainTxItem[] }>(
      `/distribution/transactions${q}`,
    );
    return res.transactions;
  }

  // ---------------------------------------------------------------------------
  // Phase 4 Districts, Warehouses, FPS, Commodities & Inventory
  // ---------------------------------------------------------------------------
  public async fetchDistricts(): Promise<District[]> {
    const res = await this.request<{ districts: District[] }>('/inventory/districts');
    return res.districts;
  }

  public async fetchDistrict(code: string): Promise<District> {
    const res = await this.request<{ district: District }>(
      `/inventory/districts/${encodeURIComponent(code)}`,
    );
    return res.district;
  }

  public async createDistrict(payload: { code: string; name: string; state?: string }) {
    return this.request<{ district: District }>('/inventory/districts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchWarehouses(districtCode?: string): Promise<Warehouse[]> {
    const q = districtCode ? `?districtCode=${encodeURIComponent(districtCode)}` : '';
    const res = await this.request<{ warehouses: Warehouse[] }>(`/inventory/warehouses${q}`);
    return res.warehouses;
  }

  public async fetchWarehouse(code: string): Promise<Warehouse> {
    const res = await this.request<{ warehouse: Warehouse }>(
      `/inventory/warehouses/${encodeURIComponent(code)}`,
    );
    return res.warehouse;
  }

  public async createWarehouse(payload: {
    code: string;
    name: string;
    districtCode: string;
    address?: string;
    capacityMtl?: number;
  }) {
    return this.request<{ warehouse: Warehouse }>('/inventory/warehouses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchFairPriceShops(
    districtCode?: string,
    warehouseCode?: string,
  ): Promise<FairPriceShop[]> {
    const params = new URLSearchParams();
    if (districtCode) params.set('districtCode', districtCode);
    if (warehouseCode) params.set('warehouseCode', warehouseCode);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ shops: FairPriceShop[] }>(`/inventory/fps${q}`);
    return res.shops;
  }

  public async fetchFairPriceShop(code: string): Promise<FairPriceShop> {
    const res = await this.request<{ shop: FairPriceShop }>(
      `/inventory/fps/${encodeURIComponent(code)}`,
    );
    return res.shop;
  }

  public async createFairPriceShop(payload: {
    code: string;
    name: string;
    districtCode: string;
    warehouseCode?: string;
    address?: string;
  }) {
    return this.request<{ shop: FairPriceShop }>('/inventory/fps', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchCommoditiesRegistry(): Promise<Commodity[]> {
    const res = await this.request<{ commodities: Commodity[] }>('/inventory/commodities');
    return res.commodities;
  }

  public async fetchCommodity(code: string): Promise<Commodity> {
    const res = await this.request<{ commodity: Commodity }>(
      `/inventory/commodities/${encodeURIComponent(code)}`,
    );
    return res.commodity;
  }

  public async createCommodityRegistry(payload: {
    code: string;
    name: string;
    unit: string;
    description?: string;
  }) {
    return this.request<{ commodity: Commodity }>('/inventory/commodities', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchInventoryBatches(
    locationType?: 'WAREHOUSE' | 'FPS',
    locationCode?: string,
    commodityCode?: string,
  ): Promise<InventoryBatch[]> {
    const params = new URLSearchParams();
    if (locationType) params.set('locationType', locationType);
    if (locationCode) params.set('locationCode', locationCode);
    if (commodityCode) params.set('commodityCode', commodityCode);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ batches: InventoryBatch[] }>(`/inventory/batches${q}`);
    return res.batches;
  }

  public async receiveInwardBatchStock(payload: {
    warehouseCode: string;
    commodityCode: string;
    batchNumber: string;
    quantity: number;
    receiptRef?: string;
  }) {
    return this.request<{ batch: InventoryBatch; movement: StockMovement }>('/inventory/receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchStockAllocations(
    warehouseCode?: string,
    fpsCode?: string,
    status?: string,
  ): Promise<StockAllocation[]> {
    const params = new URLSearchParams();
    if (warehouseCode) params.set('warehouseCode', warehouseCode);
    if (fpsCode) params.set('fpsCode', fpsCode);
    if (status) params.set('status', status);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ allocations: StockAllocation[] }>(
      `/inventory/allocations${q}`,
    );
    return res.allocations;
  }

  public async createStockAllocation(payload: {
    sourceWarehouseCode: string;
    destinationFpsCode: string;
    commodityCode: string;
    allocatedQuantity: number;
    period?: number;
    allocationRef?: string;
  }) {
    return this.request<{ allocation: StockAllocation }>('/inventory/allocations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchStockDispatches(
    warehouseCode?: string,
    fpsCode?: string,
    status?: string,
  ): Promise<StockDispatch[]> {
    const params = new URLSearchParams();
    if (warehouseCode) params.set('warehouseCode', warehouseCode);
    if (fpsCode) params.set('fpsCode', fpsCode);
    if (status) params.set('status', status);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ dispatches: StockDispatch[] }>(`/inventory/dispatches${q}`);
    return res.dispatches;
  }

  public async createStockDispatch(payload: {
    allocationId?: string;
    sourceWarehouseCode: string;
    destinationFpsCode: string;
    commodityCode: string;
    batchNumber: string;
    dispatchedQuantity: number;
    dispatchRef?: string;
  }) {
    return this.request<{
      dispatch: StockDispatch;
      updatedBatch: InventoryBatch;
      movement: StockMovement;
    }>('/inventory/dispatches', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchReceiptConfirmations(fpsCode?: string): Promise<ReceiptConfirmation[]> {
    const q = fpsCode ? `?fpsCode=${encodeURIComponent(fpsCode)}` : '';
    const res = await this.request<{ confirmations: ReceiptConfirmation[] }>(
      `/inventory/confirmations${q}`,
    );
    return res.confirmations;
  }

  public async confirmStockReceipt(
    dispatchId: string,
    payload: {
      receivedQuantity: number;
      shortageQuantity?: number;
      excessQuantity?: number;
      damagedQuantity?: number;
      discrepancyReason?: string;
      confirmationRef?: string;
    },
  ) {
    return this.request<{
      confirmation: ReceiptConfirmation;
      fpsBatch: InventoryBatch;
      movement: StockMovement;
    }>(`/inventory/confirmations/${encodeURIComponent(dispatchId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchStockReturns(
    fpsCode?: string,
    warehouseCode?: string,
    status?: string,
  ): Promise<StockReturn[]> {
    const params = new URLSearchParams();
    if (fpsCode) params.set('fpsCode', fpsCode);
    if (warehouseCode) params.set('warehouseCode', warehouseCode);
    if (status) params.set('status', status);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ returns: StockReturn[] }>(`/inventory/returns${q}`);
    return res.returns;
  }

  public async createStockReturn(payload: {
    sourceFpsCode: string;
    destinationWarehouseCode: string;
    commodityCode: string;
    batchNumber?: string;
    returnQuantity: number;
    reason: string;
    returnRef?: string;
  }) {
    return this.request<{
      stockReturn: StockReturn;
      updatedFpsBatch: InventoryBatch;
      movement: StockMovement;
    }>('/inventory/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async confirmStockReturn(
    returnId: string,
    payload: { status: 'CONFIRMED' | 'REJECTED'; remarks?: string },
  ) {
    return this.request<{
      stockReturn: StockReturn;
      whBatch?: InventoryBatch;
      movement?: StockMovement;
    }>(`/inventory/returns/${encodeURIComponent(returnId)}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchStockAdjustments(
    locationType?: 'WAREHOUSE' | 'FPS',
    locationCode?: string,
    commodityCode?: string,
  ): Promise<StockAdjustment[]> {
    const params = new URLSearchParams();
    if (locationType) params.set('locationType', locationType);
    if (locationCode) params.set('locationCode', locationCode);
    if (commodityCode) params.set('commodityCode', commodityCode);
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ adjustments: StockAdjustment[] }>(
      `/inventory/adjustments${q}`,
    );
    return res.adjustments;
  }

  public async createStockAdjustment(payload: {
    locationType: 'WAREHOUSE' | 'FPS';
    locationCode: string;
    commodityCode: string;
    batchNumber?: string;
    adjustmentType: 'INCREASE' | 'DECREASE';
    quantityChange: number;
    reasonCode: string;
    explanation: string;
    adjustmentRef?: string;
  }) {
    return this.request<{
      adjustment: StockAdjustment;
      batch: InventoryBatch;
      movement: StockMovement;
    }>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async fetchStockMovements(
    locationType?: 'WAREHOUSE' | 'FPS',
    locationCode?: string,
    commodityCode?: string,
    limit = 100,
  ): Promise<StockMovement[]> {
    const params = new URLSearchParams();
    if (locationType) params.set('locationType', locationType);
    if (locationCode) params.set('locationCode', locationCode);
    if (commodityCode) params.set('commodityCode', commodityCode);
    params.set('limit', String(limit));
    const q = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<{ movements: StockMovement[] }>(`/inventory/movements${q}`);
    return res.movements;
  }

  public async fetchStockReconciliation(
    locationType: 'WAREHOUSE' | 'FPS',
    locationCode: string,
    commodityCode?: string,
  ): Promise<ReconciliationReport> {
    const params = new URLSearchParams();
    params.set('locationType', locationType);
    params.set('locationCode', locationCode);
    if (commodityCode) params.set('commodityCode', commodityCode);
    const res = await this.request<{ report: ReconciliationReport }>(
      `/inventory/reconciliation?${params.toString()}`,
    );
    return res.report;
  }
}

export const apiClient = new ApiClient();
