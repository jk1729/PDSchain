# PDSChain v2 — Phase 3: Smart Contract Specifications

## 1. Overview

The PDSChain v2 distribution smart contract (`PDSChainDistribution.sol`) provides the cryptographic anchor for physical grain custody transfers, monthly entitlement verification, and atomic replay-protected ration disbursements across the Public Distribution System (PDS).

### Core Properties

- **Solidity Version**: `0.8.24`
- **EVM Target**: `cancun` (leveraging optimized `mcopy` assembly instructions from OpenZeppelin 5.2.0)
- **Security Primitives**:
  - OpenZeppelin `AccessControlEnumerable` for auditable role enumeration
  - OpenZeppelin `ReentrancyGuard` on all state-mutating balance transitions
  - Custom Solidity errors for minimal gas overhead and precise revert diagnosis
  - Zero PII ledger design: Beneficiaries and shops are referenced exclusively by opaque identifiers (`bytes32` hashes)

---

## 2. Roles & Authorization Governance

| Role Identifier           | Byte Hash (`keccak256`)                | Description & Permitted Operations                                                            |
| :------------------------ | :------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `DEFAULT_ADMIN_ROLE`      | `0x00...00`                            | Contract administration, commodity catalog definition, operator authorization grant/revoke    |
| `DISTRICT_OFFICER_ROLE`   | `keccak256("DISTRICT_OFFICER_ROLE")`   | Beneficiary registration, status toggles (suspension/reactivation), monthly quota allocations |
| `WAREHOUSE_OPERATOR_ROLE` | `keccak256("WAREHOUSE_OPERATOR_ROLE")` | Warehouse inward batch receipts, custody transfer dispatches to Fair Price Shops              |
| `FPS_OPERATOR_ROLE`       | `keccak256("FPS_OPERATOR_ROLE")`       | Atomic ration disbursement to citizens with claim reference replay protection                 |

### Entity-Scoped Operators

In addition to global contract roles, operators are assigned to specific physical facilities:

- `isWarehouseOperatorAuthorized(operator, warehouseId)`
- `isFpsOperatorAuthorized(operator, fpsId)`

This prevents cross-facility unauthorized dispatches even if an address possesses operator roles.

---

## 3. Data Structures & On-Chain State

```solidity
struct Commodity {
    bytes32 id;           // Unique identifier hash
    string name;          // Display name (e.g., Fortified Rice Grade A)
    string unit;          // Measurement unit (e.g., kg, L)
    bool isActive;        // Catalog status flag
}

struct Beneficiary {
    bytes32 refHash;      // keccak256(opaque beneficiary ref, e.g. "BENEFICIARY:RC-2026-0001")
    bytes32 districtCode; // District code hash
    bool isActive;        // Active/suspended status
    uint256 registeredAt; // Timestamp of enrollment
}

struct Entitlement {
    uint256 allocatedQuantity;   // Total monthly quota allocated
    uint256 distributedQuantity; // Total quota claimed so far in the period
    bool isSet;                  // Entitlement configuration flag
}
```

### Storage Mappings

```solidity
mapping(bytes32 => Commodity) public commodities;
mapping(bytes32 => Beneficiary) public beneficiaries;
// period => beneficiaryRefHash => commodityId => Entitlement
mapping(uint256 => mapping(bytes32 => mapping(bytes32 => Entitlement))) public monthlyEntitlements;
// warehouseId => commodityId => balance
mapping(bytes32 => mapping(bytes32 => uint256)) public warehouseInventory;
// fpsId => commodityId => balance
mapping(bytes32 => mapping(bytes32 => uint256)) public fpsInventory;
// claimRefHash => bool
mapping(bytes32 => bool) public executedClaims;
```

---

## 4. Key Functions

### `receiveWarehouseStock`

- **Caller**: Authorized Warehouse Operator for `warehouseId`.
- **Preconditions**: Commodity exists and active; quantity > 0; non-empty batch reference.
- **Postconditions**: `warehouseInventory[warehouseId][commodityId] += quantity`.
- **Emitted Event**: `WarehouseStockReceived(warehouseId, commodityId, quantity, batchRefHash, operator, timestamp)`.

### `transferStockToFps`

- **Caller**: Authorized Warehouse Operator for `warehouseId`.
- **Preconditions**: Commodity active; `warehouseInventory >= quantity`; quantity > 0; non-empty transfer reference.
- **Postconditions**:
  - `warehouseInventory[warehouseId][commodityId] -= quantity`
  - `fpsInventory[fpsId][commodityId] += quantity`
- **Emitted Event**: `StockTransferredToFps(warehouseId, fpsId, commodityId, quantity, transferRefHash, operator, timestamp)`.

### `distributeRation`

- **Caller**: Authorized FPS Operator for `fpsId`.
- **Preconditions**:
  - Beneficiary exists and `isActive == true`.
  - Monthly entitlement configured for `period` and `commodityId`.
  - `entitlement.allocatedQuantity - entitlement.distributedQuantity >= quantity`.
  - `fpsInventory[fpsId][commodityId] >= quantity`.
  - `executedClaims[claimRefHash] == false` (strict replay protection).
- **Postconditions**:
  - `fpsInventory[fpsId][commodityId] -= quantity`
  - `entitlement.distributedQuantity += quantity`
  - `executedClaims[claimRefHash] = true`
- **Emitted Event**: `RationDistributed(fpsId, beneficiaryRefHash, period, commodityId, quantity, claimRefHash, operator, timestamp)`.

---

## 5. Security & Privacy Guarantees

1. **Zero PII on Ledger**: Citizen names, addresses, Aadhaar numbers, phone numbers, and ration card details are strictly excluded from all contract methods and events. Only cryptographically opaque hashes (`bytes32`) appear on-chain.
2. **Replay Protection**: Every ration distribution requires a non-empty `claimRef`. Once processed, `executedClaims[claimRefHash]` is set to `true`. Any re-execution of the same claim immediately reverts with `ClaimAlreadyExecuted()`.
3. **Period Isolation**: Entitlements are keyed by `period` (YYYYMM). Distributions in period `202610` cannot decrement or affect entitlements in period `202611`.
4. **Reentrancy Immunity**: All state transitions use OpenZeppelin's `ReentrancyGuard` `nonReentrant` modifier, adhering strictly to the checks-effects-interactions pattern.
