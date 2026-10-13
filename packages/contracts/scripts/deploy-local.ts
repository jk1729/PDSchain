import * as fs from 'node:fs';
import * as path from 'node:path';
import { ethers, network } from 'hardhat';
import { validateExternalDeploymentEnv } from '../src/env';

export interface LocalDeploymentManifest {
  project: string;
  phase: number;
  networkName: string;
  chainId: number;
  contractName: string;
  contractAddress: string;
  distributionContractName: string;
  distributionContractAddress: string;
  distributionDeploymentTxHash: string;
  deployerAddress: string;
  deploymentTxHash: string;
  deploymentBlockNumber: number;
  smokeCheckTxHash: string;
  smokeCheckBlockNumber: number;
  smokeCheckHash: string;
  recordedSequence: number;
  deployedAt: string;
}

async function main(): Promise<void> {
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    validateExternalDeploymentEnv(process.env);
  }

  const [deployer] = await ethers.getSigners();
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);

  // 1. Deploy FoundationSmokeAnchor (Phase 1 baseline)
  const smokeFactory = await ethers.getContractFactory('FoundationSmokeAnchor');
  const smokeContract = await smokeFactory.deploy(deployer.address);
  await smokeContract.waitForDeployment();

  const smokeAddress = await smokeContract.getAddress();
  const smokeDeployTx = smokeContract.deploymentTransaction();
  if (!smokeDeployTx) {
    throw new Error('Smoke deployment transaction was not returned by provider.');
  }
  const smokeDeployReceipt = await smokeDeployTx.wait();
  if (!smokeDeployReceipt || smokeDeployReceipt.status !== 1) {
    throw new Error('Smoke contract deployment transaction did not succeed.');
  }

  const smokeCheckHash = ethers.keccak256(
    ethers.toUtf8Bytes('pdschain-v2:phase-1:local-smoke-verification'),
  );
  const smokeNote = 'Phase 1 local deployment & state interaction verification';

  const smokeTx = await smokeContract.recordSmokeCheck(smokeCheckHash, smokeNote);
  const smokeReceipt = await smokeTx.wait();
  if (!smokeReceipt || smokeReceipt.status !== 1) {
    throw new Error('Smoke-check state interaction transaction failed.');
  }

  const count = await smokeContract.checkCount();
  const record = await smokeContract.getSmokeRecord(1n);

  // 2. Deploy PDSChainDistribution (Phase 3 Core Domain)
  const distFactory = await ethers.getContractFactory('PDSChainDistribution');
  const distContract = await distFactory.deploy(deployer.address);
  await distContract.waitForDeployment();

  const distAddress = await distContract.getAddress();
  const distDeployTx = distContract.deploymentTransaction();
  if (!distDeployTx) {
    throw new Error('Distribution deployment transaction was not returned by provider.');
  }
  const distDeployReceipt = await distDeployTx.wait();
  if (!distDeployReceipt || distDeployReceipt.status !== 1) {
    throw new Error('Distribution contract deployment transaction did not succeed.');
  }

  const manifest: LocalDeploymentManifest = {
    project: 'pdschain-v2',
    phase: 3,
    networkName: network.name,
    chainId,
    contractName: 'FoundationSmokeAnchor',
    contractAddress: smokeAddress,
    distributionContractName: 'PDSChainDistribution',
    distributionContractAddress: distAddress,
    distributionDeploymentTxHash: distDeployReceipt.hash,
    deployerAddress: deployer.address,
    deploymentTxHash: smokeDeployReceipt.hash,
    deploymentBlockNumber: smokeDeployReceipt.blockNumber,
    smokeCheckTxHash: smokeReceipt.hash,
    smokeCheckBlockNumber: smokeReceipt.blockNumber,
    smokeCheckHash: record.checkHash,
    recordedSequence: Number(count),
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.resolve(__dirname, '../deployments');
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const manifestPath = path.join(deploymentsDir, 'local.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  console.log('=== PDSChain v2 Local Contract Deployment (Phase 3) ===');
  console.log(
    `Network:                         ${manifest.networkName} (chainId: ${manifest.chainId})`,
  );
  console.log(`Deployer Address:                ${manifest.deployerAddress}`);
  console.log(`FoundationSmokeAnchor Address:   ${manifest.contractAddress}`);
  console.log(`PDSChainDistribution Address:    ${manifest.distributionContractAddress}`);
  console.log(`Distribution Deployment Tx:      ${manifest.distributionDeploymentTxHash}`);
  console.log(`Manifest Written:                ${manifestPath}`);
}

main().catch((error: unknown) => {
  console.error('Local deployment failed:', error);
  process.exitCode = 1;
});
