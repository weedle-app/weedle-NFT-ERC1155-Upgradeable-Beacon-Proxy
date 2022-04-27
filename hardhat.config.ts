import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const { API_URL, PRIVATE_KEY, LOCAL_API_URL, LOCAL_PRIVATE_KEY } = process.env;
const config: HardhatUserConfig = {
  solidity: "0.8.6",
  defaultNetwork: "hardhat",
  networks: {
    /* hardhat: {
      chainId: 31337,
    }, */
    ropsten: {
      url: API_URL || process.env.ROPSTEN_URL || "",
      accounts: PRIVATE_KEY !== undefined ? [`0x${PRIVATE_KEY}`] : [],
    },
    local: {
      url: LOCAL_API_URL,
      accounts:
        LOCAL_PRIVATE_KEY !== undefined ? [`0x${LOCAL_PRIVATE_KEY}`] : [],
    },
  },
  gasReporter: {
    enabled:
      process.env.REPORT_GAS !== undefined && process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.COINMARKET_API_KEY || "",
    token: "MATIC",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  paths: {
    artifacts: "./src/artifacts",
  },
  mocha: {
    timeout: 100000,
  },
};

export default config;
