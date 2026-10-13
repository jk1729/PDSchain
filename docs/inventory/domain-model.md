# PDSChain V2 — Phase 4 Domain Model & Inventory Architecture

## 1. Executive Summary

Phase 4 of PDSChain V2 establishes the authoritative logistics, facility hierarchy, and commodity inventory system for the Public Distribution System (PDS). It implements an end-to-end multi-tiered tracking architecture spanning **Districts**, **Warehouses**, **Fair Price Shops (FPS)**, and **Standardized Commodities**, governed by an immutable double-entry stock movement ledger and a continuous mathematical reconciliation engine.

---

## 2. Relational Entity Domain Model

```
+--------------------------------------------------------------------------------------------------+
|                                    DISTRICT (Administrative)                                     |
+--------------------------------------------------------------------------------------------------+
          | 1:N                                                              1:N |
          v                                                                      v
+-----------------------------+        Allocation (Quota)        +---------------------------------+
|          WAREHOUSE          | -------------------------------> |         FAIR PRICE SHOP         |
|   (Buffer & Hub Storage)    | <------------------------------- |     (Ration Delivery Center)    |
+-----------------------------+           Stock Return           +---------------------------------+
          |                                                                      |
          +-------------------------------+--------------------------------------+
                                          |
                                          v
                              +-----------------------+
                              |    INVENTORY BATCH    |
                              |   (Location-Scoped)   |
                              +-----------------------+
                                          |
                                          v
                              +-----------------------+
                              |     STOCK MOVEMENT    |
                              |   (Authoritative Log) |
                              +-----------------------+
```

### 2.1 Facility Hierarchy

- **`District`**: State-level administrative jurisdiction governing food security operations, regional allocations, and shop oversight.
- **`Warehouse`**: Storage depots (FCI central buffer nodes, state civil supplies depots) receiving grain consignments and holding bulk inventory.
- **`Fair Price Shop (FPS)`**: Licensed local ration shops serving enrolled citizen beneficiaries with authorized monthly entitlements.

### 2.2 Commodities & Lot Tracking

- **`Commodity`**: Standardized foodgrain / essential commodities (e.g., `COMMODITY:RICE`, `COMMODITY:WHEAT`, `COMMODITY:SUGAR`, `COMMODITY:KEROSENE`) specifying units (`KG`, `L`, `QUINTAL`, `PKT`).
- **`InventoryBatch`**: Location-scoped lot tracking batch instances maintaining:
  - `initialQuantity`: Opening inward receipt amount.
  - `currentQuantity`: Live available non-negative balance protected by database-level constraints (`currentQuantity >= 0`).
  - `locationType`: `WAREHOUSE` or `FPS`.
  - `locationCode`: Unique identifier of the holding facility.

---

## 3. Inventory Logistics State Machines

### 3.1 Allocation Lifecycle

District Officers allocate monthly grain quotas from warehouses to Fair Price Shops:

```
           +-----------+
           |  PENDING  | (Initial state upon allocation creation)
           +-----------+
                 |
                 | (Dispatches generated against allocation)
                 v
   +-----------------------------+
   |    PARTIALLY_DISPATCHED     | (0 < dispatchedQuantity < allocatedQuantity)
   +-----------------------------+
                 |
                 | (dispatchedQuantity == allocatedQuantity)
                 v
           +-----------+
           | COMPLETED |
           +-----------+
```

### 3.2 Dispatch & Consignment Confirmation Lifecycle

Warehouse managers generate dispatches against batch lots; FPS operators verify physical delivery upon arrival:

```
  [Warehouse Batch]
          |
          | (Deduct balance, generate dispatch)
          v
   +--------------+      In-Transit Transport
   |  DISPATCHED  | -----------------------------> +-----------------------+
   +--------------+                                | FPS Weigh-In & Verify |
                                                   +-----------------------+
                                                               |
                                          +--------------------+--------------------+
                                          | (Received == Dispatched)                | (Shortage or Damaged > 0)
                                          v                                         v
                                  +---------------+                         +-----------------------+
                                  |   DELIVERED   |                         |  DISCREPANCY_FLAGGED  |
                                  |  (CONFIRMED)  |                         |  (Shortage Recorded)  |
                                  +---------------+                         +-----------------------+
```

### 3.3 Stock Return Lifecycle

Defective, moisture-damaged, or expired commodities are returned from Fair Price Shops back to supply warehouses:

```
  [FPS Shop]
      |
      | (Deduct balance, create return request)
      v
  +-----------+
  |  PENDING  |
  +-----------+
      |
      +---------------------------------+
      |                                 |
      | (Warehouse accepts)             | (Warehouse rejects)
      v                                 v
+-----------+                     +-----------+
| CONFIRMED |                     |  REJECTED |
+-----------+                     +-----------+
 (Stock added back to warehouse)   (Stock remains recorded as rejected)
```

---

## 4. Authoritative Stock Movement Ledger

Every physical or logical balance transition produces an append-only row in `StockMovement`:

| Direction    | Movement Type          | Description                                                                          |
| :----------- | :--------------------- | :----------------------------------------------------------------------------------- |
| `IN`         | `RECEIPT`              | Inward receipt from FCI or external suppliers into warehouse batch.                  |
| `OUT`        | `DISPATCH`             | Outward dispatch from warehouse batch in transit to FPS.                             |
| `IN`         | `RECEIPT_CONFIRMATION` | Inward receipt recorded into FPS batch following consignment delivery.               |
| `OUT`        | `RETURN_OUTWARD`       | Outward return deduction from FPS batch back to warehouse.                           |
| `IN`         | `RETURN_INWARD`        | Inward receipt confirmation into warehouse batch for accepted return.                |
| `IN` / `OUT` | `ADJUSTMENT`           | Approved audit adjustment for physical spoilage, moisture loss, or count correction. |

Each entry immutably captures:

- `movementRef`: Unique cryptographic or sequential reference (e.g., `MOV-RCP-123456`).
- `quantity`: Exact `Decimal` quantity moved.
- `balanceAfter`: The exact resulting balance of the affected facility batch immediately after the atomic transaction.
- `sourceDocumentRef`: Traceable delivery note, dispatch manifest, return reference, or adjustment warrant.
- `actorUserId`: Authenticated user executing the transaction.

---

## 5. Mathematical Stock Reconciliation Engine

The reconciliation engine audits facilities to prove mathematical conservation of inventory mass without relying on trusting stored batch numbers:

$$\text{Expected Balance} = \text{Opening Balance} + \sum \text{Inbound} - \sum \text{Outbound} + \sum \text{Adjustments}_{\text{ADD}} - \sum \text{Adjustments}_{\text{SUB}}$$

$$\text{Drift} = |\text{Actual Physical Batch Total} - \text{Expected Balance}|$$

### Verification Rules

1. **Zero Drift Guarantee**: $\text{Drift} < 0.0001 \implies \text{Status} = \mathbf{RECONCILED}$ (Green badge).
2. **Drift Anomaly**: $\text{Drift} \ge 0.0001 \implies \text{Status} = \mathbf{DRIFT\_DETECTED}$ (Red alert with discrepancy magnitude).
3. **Floating-point Safety**: All backend calculations use `Prisma.Decimal` arbitrary-precision arithmetic to eliminate IEEE-754 binary floating-point drift.
