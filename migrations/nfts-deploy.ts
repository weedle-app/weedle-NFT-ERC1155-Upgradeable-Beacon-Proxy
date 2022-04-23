import * as dotenv from "dotenv";
import { ethers } from "ethers";

import { ethers as hardHatEthers, upgrades } from "hardhat";
// import { TransactionResponse } from "@ethersproject/abstract-provider";
import "@nomiclabs/hardhat-waffle";

dotenv.config();
type ProviderType = "local" | "staging";

export function getProvider(
  provider?: ProviderType
): ethers.providers.Provider {
  if (provider === "staging") {
    return ethers.getDefaultProvider("ropsten", {
      alchemy: process.env.ALCHEMY_API_KEY,
    });
  }
  return new ethers.providers.JsonRpcProvider();
}

export const getWallet = (envName: ProviderType = "local"): ethers.Wallet => {
  const envKey = envName.toUpperCase();
  const privateKey = process.env[`${envKey}_PRIVATE_KEY`];
  if (!privateKey) throw new Error("Invalid private key");
  return new ethers.Wallet(privateKey, getProvider(envName));
};

(async () => {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  try {
    const WeedleNFTTokenV1 = await hardHatEthers.getContractFactory(
      "WeedleNFTTokenV1",
      getWallet()
    );

    const weedleNFTTokenV1 = await upgrades.deployProxy(
      WeedleNFTTokenV1,
      [process.env.NFT_BASE_URI],
      {
        kind: "uups",
      }
    );

    await weedleNFTTokenV1.deployed();

    console.log("Weedle NFT deployed to:", weedleNFTTokenV1.address);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
