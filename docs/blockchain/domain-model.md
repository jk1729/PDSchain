# PDSChain v2 — Phase 3: Domain Model & Architecture

## 1. Hybrid On-Chain / Off-Chain Architecture

PDSChain v2 implements a production-grade dual architecture:

- **On-Chain (Authoritative Truth)**: The smart contract `PDSChainDistribution` is strictly authoritative for commodity definitions, beneficiary active states, monthly quota allocations, physical inventory balances (warehouse & FPS), and replay-protected distribution receipts.
- **Off-Chain (Queryable Cache & Identity Boundary)**: PostgreSQL 16 stores user identities, Argon2id credentials, staff assignments, and indexes all on-chain transactions via the `BlockchainTransaction` table for fast search, audit trails, and reporting.

```
       [ React + Vite Client (Web) ]
                     │
         HTTPS / HttpOnly Cookie
                     │
                     ▼
          [ NestJS Backend API ]
        ┌────────────┴────────────┐
        ▼                         ▼
 [ PostgreSQL 16 ]     [ Local Hardhat Node ]
 (Users, Sessions,     (PDSChainDistribution.sol)
  Transactions Cache)  (Balances, Quotas, Claims)
```

---

## 2. On-Chain vs Off-Chain Data Separation

| Data Element               | Primary Location       | Representation                             | Privacy / Security Rationale                                                           |
| :------------------------- | :--------------------- | :----------------------------------------- | :------------------------------------------------------------------------------------- |
| **Citizen Name / Aadhaar** | Off-Chain (Not stored) | Never uploaded                             | PII privacy; GDPR/DPDP Act compliance. Ledger is public/immutable.                     |
| **Beneficiary Reference**  | On-Chain & Off-Chain   | `bytes32` keccak hash                      | Opaque string reference (e.g. `BENEFICIARY:RC-2026-0001`) prevents identification.     |
| **Commodity Balances**     | On-Chain               | `uint256` kg / Liters                      | Mathematically prevents double-spending or unauthorized inventory inflation.           |
| **Monthly Entitlement**    | On-Chain               | `allocatedQuantity`, `distributedQuantity` | Authoritative ceiling enforced by contract code before grains are physically released. |
| **Claim Reference**        | On-Chain               | `bytes32` hash                             | Cryptographic deduplication and double-dipping prevention.                             |
| **User Roles / Sessions**  | Off-Chain              | Argon2id + PostgreSQL                      | High performance auth, immediate revocation, CSRF token rotation.                      |
| **Tx Ledger Cache**        | Off-Chain              | `BlockchainTransaction` table              | Fast pagination, metadata association, and relational auditing.                        |

---

## 3. Prisma Schema Additions (Phase 3)

```prisma
enum BlockchainTxType {
  COMMODITY_REGISTERED
  BENEFICIARY_REGISTERED
  ENTITLEMENT_ALLOCATED
  STOCK_RECEIVED
  STOCK_TRANSFERRED
  RATION_DISTRIBUTED
}

enum BlockchainTxStatus {
  PENDING
  CONFIRMED
  FAILED
}

model BlockchainTransaction {
  id              String             @id @default(uuid())
  txHash          String             @unique
  txType          BlockchainTxType
  status          BlockchainTxStatus @default(CONFIRMED)
  blockNumber     Int?
  contractAddress String
  fromAddress     String
  actorUserId     String?
  entityId        String?
  beneficiaryRef  String?
  commodityId     String?
  quantity        Decimal?           @db.Decimal(12, 3)
  claimRef        String?
  metadata        Json?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  actorUser       User?              @relation("UserBlockchainTxs", fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([txType])
  @@index([status])
  @@index([entityId])
  @@index([beneficiaryRef])
  @@index([createdAt])
  @@map("blockchain_transactions")
}
```

---

## 4. End-to-End Distribution Workflow

```
1. District Officer / Admin:
   └─ Register Beneficiary (Opaque Ref) ──► On-Chain Contract (enrolled)
   └─ Set Monthly Quota (e.g. 40 kg Rice) ──► On-Chain Contract (entitlement set)

2. Warehouse Manager / Admin:
   └─ Receive Inward Stock (e.g. 500 kg) ──► On-Chain Contract (whInventory += 500)
   └─ Dispatch to FPS (e.g. 150 kg) ───────► On-Chain Contract (whInventory -= 150, fpsInventory += 150)

3. FPS Operator / Admin:
   └─ Verify Citizen Reference & Remaining Quota (e.g. 40 kg available)
   └─ Dispense Ration (e.g. 15 kg with unique ClaimRef)
        ├─ Assert beneficiary isActive == true
        ├─ Assert claimRef NOT in executedClaims
        ├─ Assert fpsInventory >= 15 kg
        ├─ Assert remainingQuota >= 15 kg
        ├─ fpsInventory -= 15 kg
        ├─ distributedQuantity += 15 kg
        ├─ executedClaims[claimRef] = true
        └─ Emit RationDistributed event & record PostgreSQL transaction
```
