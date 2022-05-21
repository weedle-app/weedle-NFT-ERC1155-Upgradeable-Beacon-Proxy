import config from "config";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const hardHatConfig: HardhatUserConfig = {
  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: { loggingEnabled: false },
    // Create config and uncomment to use
    /* ropsten: {
      url: config.get("RPC_URL"),
      accounts: [config.get("PRIVATE_KEY") as string],
    },
    local: {
      url: config.get("RPC_URL"),
      accounts: [config.get("PRIVATE_KEY") as string],
    }, */
  },
  gasReporter: {
    enabled: config.has("REPORT_GAS") && config.get("REPORT_GAS") == true,
    currency: "USD",
    coinmarketcap: config.get("COINMARKET_API_KEY") || "",
    token: "MATIC",
  },
  etherscan: {
    apiKey: config.get("ETHERSCAN_API_KEY"),
  },
  paths: {
    artifacts: "./src/artifacts",
  },
  mocha: {
    timeout: 100000,
  },
};

export default hardHatConfig;
