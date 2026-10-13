import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { apiClient } from '../src/lib/api-client';
import { AuthenticatedPrincipal } from '../src/types/auth';

const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const mockAdminUser: AuthenticatedPrincipal = {
  userId: 'usr-admin-001',
  sessionId: 'sess-admin-001',
  email: 'admin@pdschain.local',
  fullName: 'Administrator',
  status: 'ACTIVE',
  emailVerified: true,
  emailVerifiedAt: '2026-10-13T00:00:00.000Z',
  roles: ['ADMIN'],
  assignments: [],
};

const mockWarehouseManager: AuthenticatedPrincipal = {
  userId: 'usr-wh-001',
  sessionId: 'sess-wh-001',
  email: 'wh.manager@pdschain.local',
  fullName: 'Ramesh Patel',
  status: 'ACTIVE',
  emailVerified: true,
  emailVerifiedAt: '2026-10-13T00:00:00.000Z',
  roles: ['WAREHOUSE_MANAGER'],
  assignments: [
    {
      assignmentId: 'asgn-wh-1',
      role: 'WAREHOUSE_MANAGER',
      warehouseCode: 'WH-KA-BLR-01',
      districtCode: 'DIST-BLR-URBAN',
      shopCode: null,
      grantedAt: '2026-10-13T00:00:00.000Z',
    },
  ],
};

const sampleDistricts = [
  {
    id: 'dist-1',
    code: 'DIST-BLR-URBAN',
    name: 'Bangalore Urban',
    state: 'Karnataka',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    _count: { warehouses: 1, shops: 1 },
  },
  {
    id: 'dist-2',
    code: 'DIST-PATNA',
    name: 'Patna Central',
    state: 'Bihar',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    _count: { warehouses: 0, shops: 0 },
  },
];

const sampleWarehouses = [
  {
    id: 'wh-1',
    code: 'WH-KA-BLR-01',
    name: 'Central Warehouse Bangalore 01',
    districtId: 'dist-1',
    districtCode: 'DIST-BLR-URBAN',
    address: 'Plot 14, Yeshwanthpur',
    capacityMtl: 5000,
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    district: { code: 'DIST-BLR-URBAN', name: 'Bangalore Urban' },
    _count: { servicedShops: 1, batches: 2 },
  },
];

const sampleShops = [
  {
    id: 'fps-1',
    code: 'FPS-KA-BLR-042',
    name: 'Fair Price Shop 42 Indiranagar',
    districtId: 'dist-1',
    districtCode: 'DIST-BLR-URBAN',
    warehouseId: 'wh-1',
    warehouseCode: 'WH-KA-BLR-01',
    address: '12th Main Indiranagar',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
    district: { code: 'DIST-BLR-URBAN', name: 'Bangalore Urban' },
    designatedWarehouse: { code: 'WH-KA-BLR-01', name: 'Central Warehouse Bangalore 01' },
    _count: { batches: 1 },
  },
];

const sampleCommodities = [
  {
    id: 'comm-1',
    code: 'COMMODITY:RICE',
    name: 'Common Sona Masoori Rice',
    unit: 'KG',
    description: 'FCI Grade A Common Rice',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
  {
    id: 'comm-2',
    code: 'COMMODITY:WHEAT',
    name: 'Atta Whole Wheat',
    unit: 'KG',
    description: 'Standard milling flour',
    isActive: true,
    createdAt: '2026-10-13T00:00:00.000Z',
  },
];

const sampleBatches = [
  {
    id: 'batch-1',
    batchNumber: 'BATCH-RICE-2026-01',
    commodityId: 'comm-1',
    commodityCode: 'COMMODITY:RICE',
    locationType: 'WAREHOUSE' as const,
    locationCode: 'WH-KA-BLR-01',
    initialQuantity: 5000,
    currentQuantity: 4600,
    unit: 'KG',
    status: 'ACTIVE',
    createdAt: '2026-10-13T00:00:00.000Z',
  },
];

describe('PDSChain v2 Phase 4 Inventory & Registry Frontend Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders Districts page and displays list of administrative jurisdictions', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockAdminUser,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchDistricts').mockResolvedValue(sampleDistricts);

    render(
      <MemoryRouter initialEntries={['/districts']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Districts Registry')).toBeInTheDocument();
      expect(screen.getByText('Bangalore Urban')).toBeInTheDocument();
      expect(screen.getByText('DIST-BLR-URBAN')).toBeInTheDocument();
      expect(screen.getByText('Patna Central')).toBeInTheDocument();
    });
  });

  it('renders Warehouses page and displays warehouses with capacity and district', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockAdminUser,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchDistricts').mockResolvedValue(sampleDistricts);
    vi.spyOn(apiClient, 'fetchWarehouses').mockResolvedValue(sampleWarehouses);

    render(
      <MemoryRouter initialEntries={['/warehouses']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Warehouses Registry')).toBeInTheDocument();
      expect(screen.getByText('Central Warehouse Bangalore 01')).toBeInTheDocument();
      expect(screen.getByText('WH-KA-BLR-01')).toBeInTheDocument();
      expect(screen.getByText('5000 MT')).toBeInTheDocument();
    });
  });

  it('renders Fair Price Shops page and displays retail shops', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockAdminUser,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchDistricts').mockResolvedValue(sampleDistricts);
    vi.spyOn(apiClient, 'fetchWarehouses').mockResolvedValue(sampleWarehouses);
    vi.spyOn(apiClient, 'fetchFairPriceShops').mockResolvedValue(sampleShops);

    render(
      <MemoryRouter initialEntries={['/fair-price-shops']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Fair Price Shops (FPS) Registry')).toBeInTheDocument();
      expect(screen.getByText('Fair Price Shop 42 Indiranagar')).toBeInTheDocument();
      expect(screen.getByText('FPS-KA-BLR-042')).toBeInTheDocument();
    });
  });

  it('renders Commodities page and displays registered articles', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockAdminUser,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchCommoditiesRegistry').mockResolvedValue(sampleCommodities);

    render(
      <MemoryRouter initialEntries={['/commodities']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Commodities Registry')).toBeInTheDocument();
      expect(screen.getByText('Common Sona Masoori Rice')).toBeInTheDocument();
      expect(screen.getByText('COMMODITY:RICE')).toBeInTheDocument();
      expect(screen.getByText('Atta Whole Wheat')).toBeInTheDocument();
    });
  });

  it('renders Inventory Hub and executes live mathematical stock reconciliation', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockWarehouseManager,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchCommoditiesRegistry').mockResolvedValue(sampleCommodities);
    vi.spyOn(apiClient, 'fetchInventoryBatches').mockResolvedValue(sampleBatches);
    vi.spyOn(apiClient, 'fetchStockAllocations').mockResolvedValue([]);
    vi.spyOn(apiClient, 'fetchStockDispatches').mockResolvedValue([]);
    vi.spyOn(apiClient, 'fetchReceiptConfirmations').mockResolvedValue([]);
    vi.spyOn(apiClient, 'fetchStockReturns').mockResolvedValue([]);
    vi.spyOn(apiClient, 'fetchStockAdjustments').mockResolvedValue([]);
    vi.spyOn(apiClient, 'fetchStockMovements').mockResolvedValue([]);

    vi.spyOn(apiClient, 'fetchStockReconciliation').mockResolvedValue({
      locationType: 'WAREHOUSE',
      locationCode: 'WH-KA-BLR-01',
      status: 'RECONCILED',
      totalCommoditiesTracked: 1,
      timestamp: '2026-10-13T00:00:00.000Z',
      formula: 'Expected balance = Inbound - Outbound + Adjustments',
      batchesCount: 1,
      movementsCount: 3,
      commodities: [
        {
          commodityCode: 'COMMODITY:RICE',
          inbound: 5000,
          outbound: 400,
          adjustmentsAdd: 0,
          adjustmentsSubtract: 0,
          expectedBalance: 4600,
          actualBalance: 4600,
          drift: 0,
          isReconciled: true,
          movementCount: 2,
        },
      ],
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/inventory']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    // Initial Batches view
    await waitFor(() => {
      expect(screen.getByText('Inventory & Logistics Operations')).toBeInTheDocument();
      expect(screen.getByText('BATCH-RICE-2026-01')).toBeInTheDocument();
      expect(screen.getByText('4600 KG')).toBeInTheDocument();
    });

    // Switch to Reconciliation Tab
    const reconTabBtn = screen.getByRole('button', { name: /Reconciliation Engine/i });
    await user.click(reconTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Mathematical Stock Reconciliation Engine')).toBeInTheDocument();
    });

    // Click Run Reconciliation Probe
    const probeBtn = screen.getByRole('button', { name: /Run Reconciliation Probe/i });
    await user.click(probeBtn);

    // Verify Audit Report and RECONCILED status
    await waitFor(() => {
      expect(screen.getByText('RECONCILED')).toBeInTheDocument();
      expect(screen.getByText('BALANCED')).toBeInTheDocument();
      expect(screen.getByText('+5000')).toBeInTheDocument();
      expect(screen.getByText('-400')).toBeInTheDocument();
      expect(screen.getByText('0.0000')).toBeInTheDocument(); // 0 drift
    });
  });
});
