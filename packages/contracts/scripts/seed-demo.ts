import * as fs from 'node:fs';
import * as path from 'node:path';
import { ethers, network } from 'hardhat';
import { PDSChainDistribution } from '../typechain-types';

async function main(): Promise<void> {
  const deploymentsPath = path.resolve(__dirname, '../deployments/local.json');
  let contractAddress: string;

  const [deployer, warehouseSigner, fpsSigner] = await ethers.getSigners();

  if (fs.existsSync(deploymentsPath) && network.name !== 'hardhat') {
    const raw = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));
    contractAddress = raw.distributionContractAddress;
  } else {
    // If running in in-memory hardhat network, deploy fresh instance
    const factory = await ethers.getContractFactory('PDSChainDistribution');
    const instance = await factory.deploy(deployer.address);
    await instance.waitForDeployment();
    contractAddress = await instance.getAddress();
  }

  const contract = (await ethers.getContractAt(
    'PDSChainDistribution',
    contractAddress,
    deployer,
  )) as unknown as PDSChainDistribution;

  console.log(`Seeding demo data to PDSChainDistribution at: ${contractAddress}`);

  // 1. Commodities
  const RICE = ethers.id('COMMODITY:RICE');
  const WHEAT = ethers.id('COMMODITY:WHEAT');
  const SUGAR = ethers.id('COMMODITY:SUGAR');

  const commodities = [
    { id: RICE, name: 'Fortified Rice Grade A', unit: 'kg' },
    { id: WHEAT, name: 'Whole Wheat Grain', unit: 'kg' },
    { id: SUGAR, name: 'Refined Sugar', unit: 'kg' },
  ];

  for (const c of commodities) {
    const existing = await contract.getCommodity(c.id);
    if (existing.id === ethers.ZeroHash) {
      const tx = await contract.registerCommodity(c.id, c.name, c.unit);
      await tx.wait();
      console.log(`  + Registered Commodity: ${c.name} (${c.id})`);
    }
  }

  // 2. Authorize Operators
  const WAREHOUSE_1 = ethers.id('WH-KA-BLR-01');
  const FPS_1 = ethers.id('FPS-KA-BLR-042');

  const whOpTx = await contract.authorizeWarehouseOperator(warehouseSigner.address, WAREHOUSE_1);
  await whOpTx.wait();
  console.log(`  + Authorized Warehouse Operator ${warehouseSigner.address} for ${WAREHOUSE_1}`);

  const fpsOpTx = await contract.authorizeFpsOperator(fpsSigner.address, FPS_1);
  await fpsOpTx.wait();
  console.log(`  + Authorized FPS Operator ${fpsSigner.address} for ${FPS_1}`);

  // 3. Register Beneficiaries
  const BEN_1 = ethers.id('BENEFICIARY:RC-2026-0001');
  const BEN_2 = ethers.id('BENEFICIARY:RC-2026-0002');

  const beneficiaries = [
    { ref: BEN_1, district: 'DIST-BLR-URBAN' },
    { ref: BEN_2, district: 'DIST-BLR-RURAL' },
  ];

  for (const b of beneficiaries) {
    const existing = await contract.getBeneficiary(b.ref);
    if (existing.beneficiaryRef === ethers.ZeroHash) {
      const tx = await contract.registerBeneficiary(b.ref, b.district);
      await tx.wait();
      console.log(`  + Registered Beneficiary: ${b.ref} (${b.district})`);
    }
  }

  // 4. Warehouse Stock Receipt
  const currentRiceStock = await contract.getWarehouseStock(WAREHOUSE_1, RICE);
  if (currentRiceStock === 0n) {
    const r1 = await contract
      .connect(warehouseSigner)
      .receiveWarehouseStock(WAREHOUSE_1, RICE, 10000, 'BATCH-2026-RICE-01');
    await r1.wait();

    const r2 = await contract
      .connect(warehouseSigner)
      .receiveWarehouseStock(WAREHOUSE_1, WHEAT, 5000, 'BATCH-2026-WHEAT-01');
    await r2.wait();

    const r3 = await contract
      .connect(warehouseSigner)
      .receiveWarehouseStock(WAREHOUSE_1, SUGAR, 2000, 'BATCH-2026-SUGAR-01');
    await r3.wait();

    console.log(
      '  + Stock received at Warehouse WH-KA-BLR-01 (10,000kg Rice, 5,000kg Wheat, 2,000kg Sugar)',
    );
  }

  // 5. Transfer to FPS
  const currentFpsRice = await contract.getFpsStock(FPS_1, RICE);
  if (currentFpsRice === 0n) {
    const t1 = await contract
      .connect(warehouseSigner)
      .transferStockToFps(WAREHOUSE_1, FPS_1, RICE, 3000, 'DISPATCH-2026-001');
    await t1.wait();

    const t2 = await contract
      .connect(warehouseSigner)
      .transferStockToFps(WAREHOUSE_1, FPS_1, WHEAT, 1500, 'DISPATCH-2026-002');
    await t2.wait();

    const t3 = await contract
      .connect(warehouseSigner)
      .transferStockToFps(WAREHOUSE_1, FPS_1, SUGAR, 600, 'DISPATCH-2026-003');
    await t3.wait();

    console.log(
      '  + Transferred Stock to FPS FPS-KA-BLR-042 (3,000kg Rice, 1,500kg Wheat, 600kg Sugar)',
    );
  }

  // 6. Entitlements for 202610
  const PERIOD = 202610;
  await (await contract.setMonthlyEntitlement(BEN_1, PERIOD, RICE, 35)).wait();
  await (await contract.setMonthlyEntitlement(BEN_1, PERIOD, WHEAT, 10)).wait();
  await (await contract.setMonthlyEntitlement(BEN_1, PERIOD, SUGAR, 2)).wait();

  await (await contract.setMonthlyEntitlement(BEN_2, PERIOD, RICE, 30)).wait();
  await (await contract.setMonthlyEntitlement(BEN_2, PERIOD, WHEAT, 8)).wait();
  await (await contract.setMonthlyEntitlement(BEN_2, PERIOD, SUGAR, 2)).wait();

  console.log(`  + Configured Monthly Entitlements for Period ${PERIOD} for Beneficiaries 1 and 2`);
  console.log('=== Demo Seeding Complete ===');
}

main().catch((err) => {
  console.error('Demo seeding failed:', err);
  process.exitCode = 1;
});
