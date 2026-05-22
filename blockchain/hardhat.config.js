require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY || process.env.BLOCKCHAIN_PRIVATE_KEY || "";
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || "";

const sepoliaAccounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "http://127.0.0.1:8545",
      chainId: 11155111,
      accounts: sepoliaAccounts
    }
  }
};
