import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';
import '@typechain/hardhat';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const localChainId = Number(process.env.HARDHAT_CHAIN_ID ?? 31337);
const localRpcUrl = process.env.HARDHAT_RPC_URL ?? 'http://127.0.0.1:8545';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'cancun',
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      chainId: localChainId,
    },
    localhost: {
      url: localRpcUrl,
      chainId: localChainId,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
};

export default config;
