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

  const factory = await ethers.getContractFactory('FoundationSmokeAnchor');
  const contract = await factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  if (!deployTx) {
    throw new Error('Deployment transaction was not returned by provider.');
  }
  const deployReceipt = await deployTx.wait();
  if (!deployReceipt || deployReceipt.status !== 1) {
    throw new Error('Contract deployment transaction did not succeed.');
  }

  const smokeCheckHash = ethers.keccak256(
    ethers.toUtf8Bytes('pdschain-v2:phase-1:local-smoke-verification'),
  );
  const smokeNote = 'Phase 1 local deployment & state interaction verification';

  const smokeTx = await contract.recordSmokeCheck(smokeCheckHash, smokeNote);
  const smokeReceipt = await smokeTx.wait();
  if (!smokeReceipt || smokeReceipt.status !== 1) {
    throw new Error('Smoke-check state interaction transaction failed.');
  }

  const count = await contract.checkCount();
  const record = await contract.getSmokeRecord(1n);

  const manifest: LocalDeploymentManifest = {
    project: 'pdschain-v2',
    phase: 1,
    networkName: network.name,
    chainId,
    contractName: 'FoundationSmokeAnchor',
    contractAddress,
    deployerAddress: deployer.address,
    deploymentTxHash: deployReceipt.hash,
    deploymentBlockNumber: deployReceipt.blockNumber,
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

  console.log('=== PDSChain v2 Phase 1 Local Contract Deployment ===');
  console.log(`Network:            ${manifest.networkName} (chainId: ${manifest.chainId})`);
  console.log(`Contract:           ${manifest.contractName}`);
  console.log(`Contract Address:   ${manifest.contractAddress}`);
  console.log(`Deployer Address:   ${manifest.deployerAddress}`);
  console.log(
    `Deployment Tx:      ${manifest.deploymentTxHash} (block ${manifest.deploymentBlockNumber})`,
  );
  console.log(
    `Smoke-Check Tx:     ${manifest.smokeCheckTxHash} (block ${manifest.smokeCheckBlockNumber})`,
  );
  console.log(`Verified Count:     ${manifest.recordedSequence}`);
  console.log(`Manifest Written:   ${manifestPath}`);
}

main().catch((error: unknown) => {
  console.error('Local deployment failed:', error);
  process.exitCode = 1;
});
