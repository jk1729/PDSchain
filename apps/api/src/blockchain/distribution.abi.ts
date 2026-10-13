export const PDSCHAIN_DISTRIBUTION_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'initialAdmin',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'AccessControlBadConfirmation',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'neededRole',
        type: 'bytes32',
      },
    ],
    name: 'AccessControlUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
    ],
    name: 'BeneficiaryAlreadyExists',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
    ],
    name: 'BeneficiaryInactive',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
    ],
    name: 'BeneficiaryNotFound',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
    ],
    name: 'CommodityAlreadyExists',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
    ],
    name: 'CommodityInactive',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
    ],
    name: 'CommodityNotFound',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'claimRef',
        type: 'bytes32',
      },
    ],
    name: 'DuplicateClaim',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        internalType: 'uint32',
        name: 'period',
        type: 'uint32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
    ],
    name: 'EntitlementNotConfigured',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        internalType: 'uint32',
        name: 'period',
        type: 'uint32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'remaining',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'requested',
        type: 'uint256',
      },
    ],
    name: 'ExceedsEntitlement',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'requested',
        type: 'uint256',
      },
    ],
    name: 'InsufficientFpsStock',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'available',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'requested',
        type: 'uint256',
      },
    ],
    name: 'InsufficientWarehouseStock',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidIdentifier',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'entityId',
        type: 'bytes32',
      },
    ],
    name: 'OperatorNotAuthorizedForEntity',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ZeroAddress',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ZeroQuantity',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'districtCode',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint64',
        name: 'registeredAt',
        type: 'uint64',
      },
    ],
    name: 'BeneficiaryRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isActive',
        type: 'bool',
      },
    ],
    name: 'BeneficiaryStatusUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'unit',
        type: 'string',
      },
    ],
    name: 'CommodityRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isActive',
        type: 'bool',
      },
    ],
    name: 'CommodityStatusUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'uint32',
        name: 'period',
        type: 'uint32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'allocatedQuantity',
        type: 'uint256',
      },
    ],
    name: 'MonthlyEntitlementConfigured',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'entityId',
        type: 'bytes32',
      },
    ],
    name: 'OperatorAuthorized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'entityId',
        type: 'bytes32',
      },
    ],
    name: 'OperatorRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'claimRef',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint32',
        name: 'period',
        type: 'uint32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'dispensedBy',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint64',
        name: 'timestamp',
        type: 'uint64',
      },
    ],
    name: 'RationDistributed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'previousAdminRole',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'newAdminRole',
        type: 'bytes32',
      },
    ],
    name: 'RoleAdminChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleGranted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'RoleRevoked',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'transferReference',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'transferredBy',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint64',
        name: 'timestamp',
        type: 'uint64',
      },
    ],
    name: 'StockTransferredToFps',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'batchReference',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'recordedBy',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint64',
        name: 'timestamp',
        type: 'uint64',
      },
    ],
    name: 'WarehouseStockReceived',
    type: 'event',
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DISTRICT_OFFICER_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'FPS_OPERATOR_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'WAREHOUSE_OPERATOR_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
    ],
    name: 'authorizeFpsOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
    ],
    name: 'authorizeWarehouseOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllCommodityIds',
    outputs: [
      {
        internalType: 'bytes32[]',
        name: '',
        type: 'bytes32[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
    ],
    name: 'getBeneficiary',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'beneficiaryRef',
            type: 'bytes32',
          },
          {
            internalType: 'string',
            name: 'districtCode',
            type: 'string',
          },
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool',
          },
          {
            internalType: 'uint64',
            name: 'registeredAt',
            type: 'uint64',
          },
        ],
        internalType: 'struct PDSChainDistribution.Beneficiary',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
    ],
    name: 'getCommodity',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'id',
            type: 'bytes32',
          },
          {
            internalType: 'string',
            name: 'name',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'unit',
            type: 'string',
          },
          {
            internalType: 'bool',
            name: 'isActive',
            type: 'bool',
          },
        ],
        internalType: 'struct PDSChainDistribution.Commodity',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'claimRef',
        type: 'bytes32',
      },
    ],
    name: 'getDistributionRecord',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'claimRef',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'fpsId',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'beneficiaryRef',
            type: 'bytes32',
          },
          {
            internalType: 'uint32',
            name: 'period',
            type: 'uint32',
          },
          {
            internalType: 'bytes32',
            name: 'commodityId',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'quantity',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'dispensedBy',
            type: 'address',
          },
          {
            internalType: 'uint64',
            name: 'timestamp',
            type: 'uint64',
          },
        ],
        internalType: 'struct PDSChainDistribution.DistributionRecord',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        internalType: 'uint32',
        name: 'period',
        type: 'uint32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
    ],
    name: 'getEntitlement',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'allocatedQuantity',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'distributedQuantity',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'isSet',
            type: 'bool',
          },
        ],
        internalType: 'struct PDSChainDistribution.Entitlement',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
    ],
    name: 'getFpsStock',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
    ],
    name: 'getRoleAdmin',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'index',
        type: 'uint256',
      },
    ],
    name: 'getRoleMember',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
    ],
    name: 'getRoleMemberCount',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
    ],
    name: 'getRoleMembers',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
    ],
    name: 'getWarehouseStock',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'hasRole',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'claimRef',
        type: 'bytes32',
      },
    ],
    name: 'isClaimProcessed',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
    ],
    name: 'isFpsAuthorized',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
    ],
    name: 'isWarehouseAuthorized',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'batchReference',
        type: 'string',
      },
    ],
    name: 'receiveWarehouseStock',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        internalType: 'uint32',
        name: 'period',
        type: 'uint32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'claimRef',
        type: 'bytes32',
      },
    ],
    name: 'recordDistribution',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'districtCode',
        type: 'string',
      },
    ],
    name: 'registerBeneficiary',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'name',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'unit',
        type: 'string',
      },
    ],
    name: 'registerCommodity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'callerConfirmation',
        type: 'address',
      },
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
    ],
    name: 'revokeFpsOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
    ],
    name: 'revokeWarehouseOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        internalType: 'bool',
        name: 'isActive',
        type: 'bool',
      },
    ],
    name: 'setBeneficiaryStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'id',
        type: 'bytes32',
      },
      {
        internalType: 'bool',
        name: 'isActive',
        type: 'bool',
      },
    ],
    name: 'setCommodityStatus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'beneficiaryRef',
        type: 'bytes32',
      },
      {
        internalType: 'uint32',
        name: 'period',
        type: 'uint32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'allocatedQuantity',
        type: 'uint256',
      },
    ],
    name: 'setMonthlyEntitlement',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'warehouseId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'fpsId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'commodityId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'quantity',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'transferReference',
        type: 'string',
      },
    ],
    name: 'transferStockToFps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
