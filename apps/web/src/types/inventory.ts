export interface District {
  id: string;
  code: string;
  name: string;
  state: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    warehouses: number;
    shops: number;
  };
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  districtId: string;
  districtCode: string;
  address?: string | null;
  capacityMtl?: string | number | null;
  isActive: boolean;
  createdAt: string;
  district?: {
    code: string;
    name: string;
  };
  _count?: {
    servicedShops: number;
    batches: number;
  };
}

export interface FairPriceShop {
  id: string;
  code: string;
  name: string;
  districtId: string;
  districtCode: string;
  warehouseId?: string | null;
  warehouseCode?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  district?: {
    code: string;
    name: string;
  };
  designatedWarehouse?: {
    code: string;
    name: string;
  } | null;
  _count?: {
    batches: number;
  };
}

export interface Commodity {
  id: string;
  code: string;
  name: string;
  unit: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    batches: number;
    movements: number;
  };
}

export interface InventoryBatch {
  id: string;
  batchNumber: string;
  commodityId: string;
  commodityCode: string;
  locationType: 'WAREHOUSE' | 'FPS';
  locationCode: string;
  warehouseId?: string | null;
  fpsId?: string | null;
  initialQuantity: string | number;
  currentQuantity: string | number;
  unit: string;
  receiptRef?: string | null;
  status: string;
  createdAt: string;
  commodity?: Commodity;
}

export interface StockAllocation {
  id: string;
  allocationRef: string;
  sourceWarehouseId: string;
  sourceWarehouseCode: string;
  destinationFpsId: string;
  destinationFpsCode: string;
  commodityId: string;
  commodityCode: string;
  allocatedQuantity: string | number;
  dispatchedQuantity: string | number;
  remainingQuantity: string | number;
  period?: number | null;
  status: 'PENDING' | 'PARTIALLY_DISPATCHED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  commodity?: Commodity;
  sourceWarehouse?: { code: string; name: string };
  destinationFps?: { code: string; name: string };
}

export interface StockDispatch {
  id: string;
  dispatchRef: string;
  allocationId?: string | null;
  sourceWarehouseId: string;
  sourceWarehouseCode: string;
  destinationFpsId: string;
  destinationFpsCode: string;
  commodityId: string;
  commodityCode: string;
  batchNumber?: string | null;
  dispatchedQuantity: string | number;
  receivedQuantity: string | number;
  status: 'DISPATCHED' | 'PARTIALLY_RECEIVED' | 'DELIVERED' | 'CANCELLED';
  dispatchedAt: string;
  createdAt: string;
  commodity?: Commodity;
  sourceWarehouse?: { code: string; name: string };
  destinationFps?: { code: string; name: string };
  confirmations?: ReceiptConfirmation[];
}

export interface ReceiptConfirmation {
  id: string;
  confirmationRef: string;
  dispatchId: string;
  dispatchRef: string;
  destinationFpsId: string;
  destinationFpsCode: string;
  commodityId: string;
  commodityCode: string;
  batchNumber?: string | null;
  receivedQuantity: string | number;
  shortageQuantity: string | number;
  excessQuantity: string | number;
  damagedQuantity: string | number;
  discrepancyReason?: string | null;
  status: 'CONFIRMED' | 'DISCREPANCY_FLAGGED';
  confirmedAt: string;
  destinationFps?: { code: string; name: string };
  dispatch?: StockDispatch;
}

export interface StockReturn {
  id: string;
  returnRef: string;
  sourceFpsId: string;
  sourceFpsCode: string;
  destinationWarehouseId: string;
  destinationWarehouseCode: string;
  commodityId: string;
  commodityCode: string;
  batchNumber?: string | null;
  returnQuantity: string | number;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
  commodity?: Commodity;
  sourceFps?: { code: string; name: string };
  destinationWarehouse?: { code: string; name: string };
}

export interface StockAdjustment {
  id: string;
  adjustmentRef: string;
  locationType: 'WAREHOUSE' | 'FPS';
  locationCode: string;
  commodityId: string;
  commodityCode: string;
  batchNumber?: string | null;
  adjustmentType: 'INCREASE' | 'DECREASE';
  quantityChange: string | number;
  previousBalance: string | number;
  resultingBalance: string | number;
  reasonCode: string;
  explanation: string;
  createdAt: string;
  commodity?: Commodity;
}

export interface StockMovement {
  id: string;
  movementRef: string;
  movementType: string;
  locationType: 'WAREHOUSE' | 'FPS';
  locationCode: string;
  commodityId: string;
  commodityCode: string;
  batchNumber?: string | null;
  quantity: string | number;
  direction: 'IN' | 'OUT';
  balanceAfter: string | number;
  sourceDocumentRef: string;
  createdAt: string;
  commodity?: Commodity;
}

export interface ReconciliationCommodityBreakdown {
  commodityCode: string;
  inbound: string | number;
  outbound: string | number;
  adjustmentsAdd: string | number;
  adjustmentsSubtract: string | number;
  expectedBalance: string | number;
  actualBalance: string | number;
  drift: string | number;
  isReconciled: boolean;
  movementCount: number;
}

export interface ReconciliationReport {
  locationType: 'WAREHOUSE' | 'FPS';
  locationCode: string;
  status: 'RECONCILED' | 'DISCREPANCY_DETECTED';
  totalCommoditiesTracked: number;
  timestamp: string;
  formula: string;
  commodities: ReconciliationCommodityBreakdown[];
  batchesCount: number;
  movementsCount: number;
}
