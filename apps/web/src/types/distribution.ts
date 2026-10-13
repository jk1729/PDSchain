export interface CommodityItem {
  id: string;
  idHash: string;
  name: string;
  unit: string;
  isActive: boolean;
}

export interface BeneficiaryItem {
  beneficiaryRef: string;
  refHash: string;
  districtCode: string;
  isActive: boolean;
  registeredAt: number;
}

export interface EntitlementItem {
  beneficiaryRef: string;
  period: number;
  commodityId: string;
  allocatedQuantity: number;
  distributedQuantity: number;
  remainingQuantity: number;
  isSet: boolean;
}

export interface BlockchainTxItem {
  id: string;
  txHash: string;
  txType: string;
  status: string;
  blockNumber: number | null;
  contractAddress: string;
  fromAddress: string;
  actorUserId: string | null;
  entityId: string | null;
  beneficiaryRef: string | null;
  commodityId: string | null;
  quantity: string | number | null;
  claimRef: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  actorUser?: {
    id: string;
    email: string;
    fullName: string;
  } | null;
}

export interface WarehouseReceiptPayload {
  warehouseId: string;
  commodityId: string;
  quantity: number;
  batchReference: string;
}

export interface WarehouseTransferPayload {
  warehouseId: string;
  fpsId: string;
  commodityId: string;
  quantity: number;
  transferReference: string;
}

export interface RecordDistributionPayload {
  fpsId: string;
  beneficiaryRef: string;
  period: number;
  commodityId: string;
  quantity: number;
  claimRef: string;
}

export interface BlockchainActionResponse {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  action?: string;
  remainingQuota?: number;
}
