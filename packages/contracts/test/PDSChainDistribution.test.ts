import { expect } from 'chai';
import { ethers } from 'hardhat';
import { PDSChainDistribution } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('PDSChainDistribution (Phase 3 Smart Contract Business Logic)', () => {
  let contract: PDSChainDistribution;
  let admin: HardhatEthersSigner;
  let districtOfficer: HardhatEthersSigner;
  let warehouseOperator: HardhatEthersSigner;
  let unauthorizedWarehouseOperator: HardhatEthersSigner;
  let fpsOperator: HardhatEthersSigner;
  let unauthorizedFpsOperator: HardhatEthersSigner;
  let citizenWallet: HardhatEthersSigner;

  // Sample domain IDs (opaque bytes32)
  const COMMODITY_RICE = ethers.id('COMMODITY:RICE');
  const COMMODITY_WHEAT = ethers.id('COMMODITY:WHEAT');
  const COMMODITY_SUGAR = ethers.id('COMMODITY:SUGAR');

  const WAREHOUSE_1 = ethers.id('WH-KA-BLR-01');
  const WAREHOUSE_2 = ethers.id('WH-KA-MYS-02');
  const FPS_SHOP_1 = ethers.id('FPS-KA-BLR-042');

  const BENEFICIARY_A = ethers.id('BENEFICIARY:RC-2026-0001');

  const PERIOD_OCT_2026 = 202610;
  const PERIOD_NOV_2026 = 202611;

  beforeEach(async () => {
    [
      admin,
      districtOfficer,
      warehouseOperator,
      unauthorizedWarehouseOperator,
      fpsOperator,
      unauthorizedFpsOperator,
      citizenWallet,
    ] = await ethers.getSigners();

    const factory = await ethers.getContractFactory('PDSChainDistribution');
    contract = await factory.deploy(admin.address);
    await contract.waitForDeployment();

    // Assign district officer role
    const districtRole = await contract.DISTRICT_OFFICER_ROLE();
    await contract.connect(admin).grantRole(districtRole, districtOfficer.address);

    // Authorize warehouse operator for WAREHOUSE_1
    await contract
      .connect(admin)
      .authorizeWarehouseOperator(warehouseOperator.address, WAREHOUSE_1);

    // Authorize FPS operator for FPS_SHOP_1
    await contract.connect(admin).authorizeFpsOperator(fpsOperator.address, FPS_SHOP_1);
  });

  describe('1. Deployment & Role Governance', () => {
    it('initializes admin role and denies deployment with zero address', async () => {
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(adminRole, admin.address)).to.equal(true);

      const factory = await ethers.getContractFactory('PDSChainDistribution');
      await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        contract,
        'ZeroAddress',
      );
    });

    it('allows admin to authorize and immediately revoke warehouse operator', async () => {
      expect(await contract.isWarehouseAuthorized(warehouseOperator.address, WAREHOUSE_1)).to.equal(
        true,
      );

      await contract.connect(admin).revokeWarehouseOperator(warehouseOperator.address, WAREHOUSE_1);
      expect(await contract.isWarehouseAuthorized(warehouseOperator.address, WAREHOUSE_1)).to.equal(
        false,
      );
    });

    it('allows admin to authorize and immediately revoke FPS operator', async () => {
      expect(await contract.isFpsAuthorized(fpsOperator.address, FPS_SHOP_1)).to.equal(true);

      await contract.connect(admin).revokeFpsOperator(fpsOperator.address, FPS_SHOP_1);
      expect(await contract.isFpsAuthorized(fpsOperator.address, FPS_SHOP_1)).to.equal(false);
    });

    it('rejects authorization by unauthorized caller', async () => {
      await expect(
        contract
          .connect(citizenWallet)
          .authorizeWarehouseOperator(citizenWallet.address, WAREHOUSE_1),
      ).to.be.revertedWithCustomError(contract, 'AccessControlUnauthorizedAccount');
    });
  });

  describe('2. Commodity Lifecycle', () => {
    it('registers commodities with valid metadata and emits CommodityRegistered', async () => {
      const tx = await contract
        .connect(admin)
        .registerCommodity(COMMODITY_RICE, 'Fortified Rice Grade A', 'kg');
      await expect(tx)
        .to.emit(contract, 'CommodityRegistered')
        .withArgs(COMMODITY_RICE, 'Fortified Rice Grade A', 'kg');

      const comm = await contract.getCommodity(COMMODITY_RICE);
      expect(comm.name).to.equal('Fortified Rice Grade A');
      expect(comm.unit).to.equal('kg');
      expect(comm.isActive).to.equal(true);

      const list = await contract.getAllCommodityIds();
      expect(list).to.include(COMMODITY_RICE);
    });

    it('rejects duplicate commodity registration', async () => {
      await contract.connect(admin).registerCommodity(COMMODITY_RICE, 'Rice', 'kg');
      await expect(
        contract.connect(admin).registerCommodity(COMMODITY_RICE, 'Duplicate Rice', 'kg'),
      ).to.be.revertedWithCustomError(contract, 'CommodityAlreadyExists');
    });

    it('rejects empty commodity name, unit, or zero ID', async () => {
      await expect(
        contract.connect(admin).registerCommodity(ethers.ZeroHash, 'Rice', 'kg'),
      ).to.be.revertedWithCustomError(contract, 'InvalidIdentifier');

      await expect(
        contract.connect(admin).registerCommodity(COMMODITY_WHEAT, '', 'kg'),
      ).to.be.revertedWithCustomError(contract, 'InvalidIdentifier');

      await expect(
        contract.connect(admin).registerCommodity(COMMODITY_WHEAT, 'Wheat', ''),
      ).to.be.revertedWithCustomError(contract, 'InvalidIdentifier');
    });

    it('allows admin to toggle commodity active status', async () => {
      await contract.connect(admin).registerCommodity(COMMODITY_SUGAR, 'Sugar', 'kg');

      await expect(contract.connect(admin).setCommodityStatus(COMMODITY_SUGAR, false))
        .to.emit(contract, 'CommodityStatusUpdated')
        .withArgs(COMMODITY_SUGAR, false);

      const comm = await contract.getCommodity(COMMODITY_SUGAR);
      expect(comm.isActive).to.equal(false);
    });
  });

  describe('3. Beneficiary Management', () => {
    it('allows district officer to register a beneficiary', async () => {
      const tx = await contract
        .connect(districtOfficer)
        .registerBeneficiary(BENEFICIARY_A, 'DIST-BLR-URBAN');
      await expect(tx).to.emit(contract, 'BeneficiaryRegistered');

      const b = await contract.getBeneficiary(BENEFICIARY_A);
      expect(b.beneficiaryRef).to.equal(BENEFICIARY_A);
      expect(b.districtCode).to.equal('DIST-BLR-URBAN');
      expect(b.isActive).to.equal(true);
    });

    it('rejects duplicate beneficiary registration', async () => {
      await contract.connect(districtOfficer).registerBeneficiary(BENEFICIARY_A, 'DIST-BLR-URBAN');
      await expect(
        contract.connect(districtOfficer).registerBeneficiary(BENEFICIARY_A, 'DIST-BLR-URBAN'),
      ).to.be.revertedWithCustomError(contract, 'BeneficiaryAlreadyExists');
    });

    it('allows suspension and reactivation of a beneficiary', async () => {
      await contract.connect(districtOfficer).registerBeneficiary(BENEFICIARY_A, 'DIST-BLR-URBAN');

      await expect(contract.connect(districtOfficer).setBeneficiaryStatus(BENEFICIARY_A, false))
        .to.emit(contract, 'BeneficiaryStatusUpdated')
        .withArgs(BENEFICIARY_A, false);

      expect((await contract.getBeneficiary(BENEFICIARY_A)).isActive).to.equal(false);

      await contract.connect(districtOfficer).setBeneficiaryStatus(BENEFICIARY_A, true);
      expect((await contract.getBeneficiary(BENEFICIARY_A)).isActive).to.equal(true);
    });

    it('rejects beneficiary registration by unauthorized callers', async () => {
      await expect(
        contract.connect(citizenWallet).registerBeneficiary(BENEFICIARY_A, 'DIST-BLR-URBAN'),
      ).to.be.revertedWithCustomError(contract, 'AccessControlUnauthorizedAccount');
    });
  });

  describe('4. Entitlement Quota Management', () => {
    beforeEach(async () => {
      await contract.connect(admin).registerCommodity(COMMODITY_RICE, 'Rice', 'kg');
      await contract.connect(districtOfficer).registerBeneficiary(BENEFICIARY_A, 'DIST-BLR-URBAN');
    });

    it('sets monthly entitlement and retrieves balance', async () => {
      const tx = await contract
        .connect(districtOfficer)
        .setMonthlyEntitlement(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE, 35);

      await expect(tx)
        .to.emit(contract, 'MonthlyEntitlementConfigured')
        .withArgs(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE, 35);

      const ent = await contract.getEntitlement(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE);
      expect(ent.allocatedQuantity).to.equal(35);
      expect(ent.distributedQuantity).to.equal(0);
      expect(ent.isSet).to.equal(true);
    });

    it('rejects entitlement for unverified beneficiary or inactive commodity', async () => {
      const UNKNOWN_REF = ethers.id('BENEFICIARY:UNKNOWN');
      await expect(
        contract
          .connect(districtOfficer)
          .setMonthlyEntitlement(UNKNOWN_REF, PERIOD_OCT_2026, COMMODITY_RICE, 35),
      ).to.be.revertedWithCustomError(contract, 'BeneficiaryNotFound');

      await contract.connect(admin).setCommodityStatus(COMMODITY_RICE, false);
      await expect(
        contract
          .connect(districtOfficer)
          .setMonthlyEntitlement(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE, 35),
      ).to.be.revertedWithCustomError(contract, 'CommodityInactive');
    });
  });

  describe('5. Warehouse Stock Receipt & Inventory Accounting', () => {
    beforeEach(async () => {
      await contract.connect(admin).registerCommodity(COMMODITY_RICE, 'Rice', 'kg');
    });

    it('records incoming warehouse stock and increments balance', async () => {
      const tx = await contract
        .connect(warehouseOperator)
        .receiveWarehouseStock(WAREHOUSE_1, COMMODITY_RICE, 10000, 'BATCH-2026-WH1-001');

      await expect(tx)
        .to.emit(contract, 'WarehouseStockReceived')
        .withArgs(
          WAREHOUSE_1,
          COMMODITY_RICE,
          10000,
          'BATCH-2026-WH1-001',
          warehouseOperator.address,
          (val: bigint) => val > 0n,
        );

      expect(await contract.getWarehouseStock(WAREHOUSE_1, COMMODITY_RICE)).to.equal(10000);
    });

    it('rejects stock receipt with zero quantity or empty batch reference', async () => {
      await expect(
        contract
          .connect(warehouseOperator)
          .receiveWarehouseStock(WAREHOUSE_1, COMMODITY_RICE, 0, 'BATCH-001'),
      ).to.be.revertedWithCustomError(contract, 'ZeroQuantity');

      await expect(
        contract
          .connect(warehouseOperator)
          .receiveWarehouseStock(WAREHOUSE_1, COMMODITY_RICE, 1000, ''),
      ).to.be.revertedWithCustomError(contract, 'InvalidIdentifier');
    });

    it('rejects operator attempting to manage an unassigned warehouse', async () => {
      await expect(
        contract
          .connect(warehouseOperator)
          .receiveWarehouseStock(WAREHOUSE_2, COMMODITY_RICE, 1000, 'BATCH-001'),
      ).to.be.revertedWithCustomError(contract, 'OperatorNotAuthorizedForEntity');
    });
  });

  describe('6. Warehouse to FPS Stock Transfer', () => {
    beforeEach(async () => {
      await contract.connect(admin).registerCommodity(COMMODITY_RICE, 'Rice', 'kg');
      await contract
        .connect(warehouseOperator)
        .receiveWarehouseStock(WAREHOUSE_1, COMMODITY_RICE, 5000, 'BATCH-001');
    });

    it('transfers stock atomically from warehouse to FPS', async () => {
      const tx = await contract
        .connect(warehouseOperator)
        .transferStockToFps(WAREHOUSE_1, FPS_SHOP_1, COMMODITY_RICE, 1500, 'TRANS-001');

      await expect(tx)
        .to.emit(contract, 'StockTransferredToFps')
        .withArgs(
          WAREHOUSE_1,
          FPS_SHOP_1,
          COMMODITY_RICE,
          1500,
          'TRANS-001',
          warehouseOperator.address,
          (val: bigint) => val > 0n,
        );

      expect(await contract.getWarehouseStock(WAREHOUSE_1, COMMODITY_RICE)).to.equal(3500);
      expect(await contract.getFpsStock(FPS_SHOP_1, COMMODITY_RICE)).to.equal(1500);
    });

    it('rejects transfer exceeding available warehouse inventory', async () => {
      await expect(
        contract
          .connect(warehouseOperator)
          .transferStockToFps(WAREHOUSE_1, FPS_SHOP_1, COMMODITY_RICE, 6000, 'TRANS-OVERFLOW'),
      ).to.be.revertedWithCustomError(contract, 'InsufficientWarehouseStock');

      // State is preserved
      expect(await contract.getWarehouseStock(WAREHOUSE_1, COMMODITY_RICE)).to.equal(5000);
      expect(await contract.getFpsStock(FPS_SHOP_1, COMMODITY_RICE)).to.equal(0);
    });

    it('rejects transfer by operator without authorization for that warehouse', async () => {
      await expect(
        contract
          .connect(unauthorizedWarehouseOperator)
          .transferStockToFps(WAREHOUSE_1, FPS_SHOP_1, COMMODITY_RICE, 100, 'TRANS-UNAUTH'),
      ).to.be.revertedWithCustomError(contract, 'AccessControlUnauthorizedAccount');
    });
  });

  describe('7. End-to-End Ration Distribution Workflow & Replay Protection', () => {
    const CLAIM_1 = ethers.id('CLAIM-TX-000001');
    const CLAIM_2 = ethers.id('CLAIM-TX-000002');

    beforeEach(async () => {
      // 1. Setup Commodity
      await contract.connect(admin).registerCommodity(COMMODITY_RICE, 'Rice', 'kg');

      // 2. Setup Warehouse Stock & Transfer to FPS
      await contract
        .connect(warehouseOperator)
        .receiveWarehouseStock(WAREHOUSE_1, COMMODITY_RICE, 1000, 'BATCH-001');
      await contract
        .connect(warehouseOperator)
        .transferStockToFps(WAREHOUSE_1, FPS_SHOP_1, COMMODITY_RICE, 500, 'TRANS-001');

      // 3. Register Beneficiary & Set Entitlement
      await contract.connect(districtOfficer).registerBeneficiary(BENEFICIARY_A, 'DIST-BLR');
      await contract
        .connect(districtOfficer)
        .setMonthlyEntitlement(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE, 35);
    });

    it('successfully dispenses partial and subsequent ration quota atomically', async () => {
      // First distribution: 20 kg
      const tx1 = await contract
        .connect(fpsOperator)
        .recordDistribution(
          FPS_SHOP_1,
          BENEFICIARY_A,
          PERIOD_OCT_2026,
          COMMODITY_RICE,
          20,
          CLAIM_1,
        );

      await expect(tx1)
        .to.emit(contract, 'RationDistributed')
        .withArgs(
          CLAIM_1,
          FPS_SHOP_1,
          BENEFICIARY_A,
          PERIOD_OCT_2026,
          COMMODITY_RICE,
          20,
          fpsOperator.address,
          (val: bigint) => val > 0n,
        );

      expect(await contract.getFpsStock(FPS_SHOP_1, COMMODITY_RICE)).to.equal(480);
      let ent = await contract.getEntitlement(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE);
      expect(ent.distributedQuantity).to.equal(20);
      expect(await contract.isClaimProcessed(CLAIM_1)).to.equal(true);

      const record = await contract.getDistributionRecord(CLAIM_1);
      expect(record.dispensedBy).to.equal(fpsOperator.address);
      expect(record.quantity).to.equal(20);

      // Second distribution: remaining 15 kg
      await contract
        .connect(fpsOperator)
        .recordDistribution(
          FPS_SHOP_1,
          BENEFICIARY_A,
          PERIOD_OCT_2026,
          COMMODITY_RICE,
          15,
          CLAIM_2,
        );

      expect(await contract.getFpsStock(FPS_SHOP_1, COMMODITY_RICE)).to.equal(465);
      ent = await contract.getEntitlement(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE);
      expect(ent.distributedQuantity).to.equal(35);
    });

    it('rejects duplicate claim reference replay', async () => {
      await contract
        .connect(fpsOperator)
        .recordDistribution(
          FPS_SHOP_1,
          BENEFICIARY_A,
          PERIOD_OCT_2026,
          COMMODITY_RICE,
          10,
          CLAIM_1,
        );

      await expect(
        contract
          .connect(fpsOperator)
          .recordDistribution(
            FPS_SHOP_1,
            BENEFICIARY_A,
            PERIOD_OCT_2026,
            COMMODITY_RICE,
            10,
            CLAIM_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'DuplicateClaim');
    });

    it('rejects distribution exceeding remaining monthly entitlement quota', async () => {
      // Beneficiary quota is 35 kg; attempt 36 kg
      await expect(
        contract
          .connect(fpsOperator)
          .recordDistribution(
            FPS_SHOP_1,
            BENEFICIARY_A,
            PERIOD_OCT_2026,
            COMMODITY_RICE,
            36,
            CLAIM_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'ExceedsEntitlement');

      // State is completely preserved
      expect(await contract.getFpsStock(FPS_SHOP_1, COMMODITY_RICE)).to.equal(500);
      const ent = await contract.getEntitlement(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE);
      expect(ent.distributedQuantity).to.equal(0);
    });

    it('rejects distribution exceeding available FPS physical stock', async () => {
      // Transfer almost all stock back or register large entitlement
      await contract
        .connect(districtOfficer)
        .setMonthlyEntitlement(BENEFICIARY_A, PERIOD_OCT_2026, COMMODITY_RICE, 1000);

      // FPS only has 500 kg in stock; attempt 501 kg
      await expect(
        contract
          .connect(fpsOperator)
          .recordDistribution(
            FPS_SHOP_1,
            BENEFICIARY_A,
            PERIOD_OCT_2026,
            COMMODITY_RICE,
            501,
            CLAIM_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'InsufficientFpsStock');
    });

    it('rejects distribution to a suspended or inactive beneficiary', async () => {
      await contract.connect(districtOfficer).setBeneficiaryStatus(BENEFICIARY_A, false);

      await expect(
        contract
          .connect(fpsOperator)
          .recordDistribution(
            FPS_SHOP_1,
            BENEFICIARY_A,
            PERIOD_OCT_2026,
            COMMODITY_RICE,
            10,
            CLAIM_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'BeneficiaryInactive');
    });

    it('rejects distribution by operator unauthorized for that FPS shop', async () => {
      await expect(
        contract
          .connect(unauthorizedFpsOperator)
          .recordDistribution(
            FPS_SHOP_1,
            BENEFICIARY_A,
            PERIOD_OCT_2026,
            COMMODITY_RICE,
            10,
            CLAIM_1,
          ),
      ).to.be.revertedWithCustomError(contract, 'AccessControlUnauthorizedAccount');
    });

    it('isolates monthly entitlement periods without cross-period quota leakage', async () => {
      // Entitlement for Nov 2026
      await contract
        .connect(districtOfficer)
        .setMonthlyEntitlement(BENEFICIARY_A, PERIOD_NOV_2026, COMMODITY_RICE, 35);

      // Dispense full Oct quota (35 kg)
      await contract
        .connect(fpsOperator)
        .recordDistribution(
          FPS_SHOP_1,
          BENEFICIARY_A,
          PERIOD_OCT_2026,
          COMMODITY_RICE,
          35,
          CLAIM_1,
        );

      // Oct quota is exhausted
      await expect(
        contract
          .connect(fpsOperator)
          .recordDistribution(
            FPS_SHOP_1,
            BENEFICIARY_A,
            PERIOD_OCT_2026,
            COMMODITY_RICE,
            1,
            CLAIM_2,
          ),
      ).to.be.revertedWithCustomError(contract, 'ExceedsEntitlement');

      // Nov quota is still fully available
      const claimNov = ethers.id('CLAIM-TX-NOV-001');
      await contract
        .connect(fpsOperator)
        .recordDistribution(
          FPS_SHOP_1,
          BENEFICIARY_A,
          PERIOD_NOV_2026,
          COMMODITY_RICE,
          35,
          claimNov,
        );

      const entNov = await contract.getEntitlement(BENEFICIARY_A, PERIOD_NOV_2026, COMMODITY_RICE);
      expect(entNov.distributedQuantity).to.equal(35);
    });
  });
});
