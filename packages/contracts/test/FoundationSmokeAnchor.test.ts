import { expect } from 'chai';
import { ethers } from 'hardhat';
import { validateExternalDeploymentEnv } from '../src/env';

describe('FoundationSmokeAnchor (Phase 1 Blockchain Foundation)', () => {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('FoundationSmokeAnchor');
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return { contract, owner, otherAccount };
  }

  it('compiles, deploys to local Hardhat network, and exposes expected metadata', async () => {
    const { contract, owner } = await deployFixture();
    const network = await ethers.provider.getNetwork();

    expect(Number(network.chainId)).to.equal(31337);
    expect(await contract.getAddress()).to.match(/^0x[0-9a-fA-F]{40}$/);
    expect(await contract.owner()).to.equal(owner.address);
    expect(await contract.FOUNDATION_PHASE()).to.equal('PHASE_1_FOUNDATION');
    expect(await contract.checkCount()).to.equal(0n);
  });

  it('records a smoke-check transaction, emits an event, and returns a valid receipt', async () => {
    const { contract, owner } = await deployFixture();
    const digest = ethers.keccak256(ethers.toUtf8Bytes('phase-1-smoke-test'));
    const note = 'Verify local Hardhat state transition and receipt';

    const tx = await contract.recordSmokeCheck(digest, note);
    const receipt = await tx.wait();

    expect(receipt).to.not.equal(null);
    expect(receipt?.status).to.equal(1);
    expect(receipt?.hash).to.match(/^0x[0-9a-fA-F]{64}$/);
    expect(receipt?.blockNumber).to.be.greaterThan(0);

    expect(await contract.checkCount()).to.equal(1n);

    const stored = await contract.getSmokeRecord(1n);
    expect(stored.sequence).to.equal(1n);
    expect(stored.checkHash).to.equal(digest);
    expect(stored.recordedBy).to.equal(owner.address);
    expect(stored.note).to.equal(note);
    expect(stored.recordedAt).to.be.greaterThan(0n);
  });

  it('rejects invalid parameters and unauthorized callers', async () => {
    const { contract, otherAccount } = await deployFixture();
    const digest = ethers.keccak256(ethers.toUtf8Bytes('phase-1-auth-check'));

    await expect(
      contract.recordSmokeCheck(ethers.ZeroHash, 'invalid hash'),
    ).to.be.revertedWithCustomError(contract, 'InvalidCheckHash');

    await expect(contract.recordSmokeCheck(digest, '')).to.be.revertedWithCustomError(
      contract,
      'EmptySmokeNote',
    );

    await expect(contract.getSmokeRecord(99n)).to.be.revertedWithCustomError(
      contract,
      'SmokeSequenceNotFound',
    );

    await expect(
      contract.connect(otherAccount).recordSmokeCheck(digest, 'unauthorized attempt'),
    ).to.be.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount');
  });

  it('validates external network deployment environment variables strictly', () => {
    expect(() =>
      validateExternalDeploymentEnv({
        NODE_ENV: 'test',
        SEPOLIA_RPC_URL: '',
        DEPLOYER_PRIVATE_KEY: '',
      }),
    ).to.throw(/Invalid external blockchain deployment configuration/);

    const valid = validateExternalDeploymentEnv({
      NODE_ENV: 'test',
      SEPOLIA_RPC_URL: 'https://rpc.sepolia.example.org',
      SEPOLIA_CHAIN_ID: '11155111',
      DEPLOYER_PRIVATE_KEY: '0x' + '11'.repeat(32),
    });
    expect(valid.SEPOLIA_CHAIN_ID).to.equal(11155111);
  });
});
