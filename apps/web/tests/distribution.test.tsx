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

const mockFpsOperator: AuthenticatedPrincipal = {
  userId: 'usr-fps-001',
  sessionId: 'sess-fps-001',
  email: 'fps.dealer@pdschain.local',
  fullName: 'Lakshmi Devi',
  status: 'ACTIVE',
  emailVerified: true,
  emailVerifiedAt: '2026-10-13T00:00:00.000Z',
  roles: ['FPS_OPERATOR'],
  assignments: [
    {
      assignmentId: 'asgn-fps-1',
      role: 'FPS_OPERATOR',
      warehouseCode: null,
      districtCode: 'DIST-BLR-URBAN',
      shopCode: 'FPS-KA-BLR-042',
      grantedAt: '2026-10-13T00:00:00.000Z',
    },
  ],
};

const sampleCommodities = [
  {
    id: 'COMMODITY:RICE',
    idHash: '0x1',
    name: 'Fortified Rice Grade A',
    unit: 'kg',
    isActive: true,
  },
  { id: 'COMMODITY:WHEAT', idHash: '0x2', name: 'Whole Wheat Grain', unit: 'kg', isActive: true },
];

describe('PDSChain v2 Phase 3 Distribution & Smart Contract Frontend Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders Warehouse Inventory page and displays commodity balances', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockWarehouseManager,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchCommodities').mockResolvedValue(sampleCommodities);
    vi.spyOn(apiClient, 'fetchWarehouseStock').mockImplementation(async (_wh, comm) => {
      if (comm === 'COMMODITY:RICE') return 10000;
      return 5000;
    });

    render(
      <MemoryRouter initialEntries={['/warehouse-inventory']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Warehouse Inventory & Custody Transfers')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Fortified Rice Grade A')).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();
    });
  });

  it('allows warehouse manager to record inward stock receipt', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockWarehouseManager,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchCommodities').mockResolvedValue(sampleCommodities);
    vi.spyOn(apiClient, 'fetchWarehouseStock').mockResolvedValue(10000);
    const receiveSpy = vi.spyOn(apiClient, 'receiveWarehouseStock').mockResolvedValue({
      success: true,
      txHash: '0xmockreceivedtxhash123456789',
      blockNumber: 104,
      action: 'WAREHOUSE_STOCK_RECEIVED',
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/warehouse-inventory']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Record Incoming Stock Batch')).toBeInTheDocument();
    });

    const qtyInput = screen.getByPlaceholderText('e.g. 5000');
    const batchInput = screen.getByPlaceholderText('e.g. BATCH-2026-FCI-001');

    await user.type(qtyInput, '2500');
    await user.type(batchInput, 'BATCH-TEST-001');

    const submitBtn = screen.getByRole('button', { name: /Commit Inward Stock to Ledger/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(receiveSpy).toHaveBeenCalledWith({
        warehouseId: 'WH-KA-BLR-01',
        commodityId: 'COMMODITY:RICE',
        quantity: 2500,
        batchReference: 'BATCH-TEST-001',
      });
      expect(screen.getByText(/Successfully received 2500 kg into warehouse/i)).toBeInTheDocument();
    });
  });

  it('renders FPS Distribution page, verifies beneficiary, and checks quota', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockFpsOperator,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchCommodities').mockResolvedValue(sampleCommodities);
    vi.spyOn(apiClient, 'fetchFpsStock').mockResolvedValue(2500);

    vi.spyOn(apiClient, 'fetchBeneficiary').mockResolvedValue({
      beneficiaryRef: 'BENEFICIARY:RC-2026-0001',
      refHash: '0xbenhash',
      districtCode: 'DIST-BLR-URBAN',
      isActive: true,
      registeredAt: Date.now(),
    });

    vi.spyOn(apiClient, 'fetchEntitlement').mockResolvedValue({
      beneficiaryRef: 'BENEFICIARY:RC-2026-0001',
      period: 202610,
      commodityId: 'COMMODITY:RICE',
      allocatedQuantity: 35,
      distributedQuantity: 10,
      remainingQuantity: 25,
      isSet: true,
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/fps-distribution']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Fair Price Shop — Ration Disbursement')).toBeInTheDocument();
      expect(screen.getByText('Fortified Rice Grade A')).toBeInTheDocument();
    });

    const verifyBtn = screen.getByRole('button', { name: /Verify Beneficiary & Quota/i });
    await user.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Step 2: Dispense Ration Quota to Beneficiary')).toBeInTheDocument();
      expect(screen.getAllByText(/25\s*kg/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders On-Chain Ledger page with confirmed transactions', async () => {
    localStorage.setItem('pdschain_auth_active', 'true');
    vi.spyOn(apiClient, 'getCurrentUser').mockResolvedValue({
      status: 'authenticated',
      user: mockFpsOperator,
      csrfToken: 'mock-csrf-token',
    });
    vi.spyOn(apiClient, 'fetchDistributionTransactions').mockResolvedValue([
      {
        id: 'tx-001',
        txHash: '0x9abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
        txType: 'RATION_DISTRIBUTED',
        status: 'CONFIRMED',
        blockNumber: 108,
        contractAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        fromAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        actorUserId: 'usr-fps-001',
        entityId: 'FPS-KA-BLR-042',
        beneficiaryRef: 'BENEFICIARY:RC-2026-0001',
        commodityId: 'COMMODITY:RICE',
        quantity: 20,
        claimRef: 'CLAIM-TEST-001',
        createdAt: '2026-10-13T12:00:00.000Z',
        actorUser: {
          id: 'usr-fps-001',
          email: 'fps@pdschain.local',
          fullName: 'Lakshmi Devi',
        },
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/distribution-ledger']} future={routerFutureFlags}>
        <App />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('On-Chain Custody & Distribution Ledger')).toBeInTheDocument();
      expect(screen.getByText('RATION_DISTRIBUTED')).toBeInTheDocument();
      expect(screen.getByText('#108')).toBeInTheDocument();
      expect(screen.getByText('20 kg')).toBeInTheDocument();
    });
  });
});
