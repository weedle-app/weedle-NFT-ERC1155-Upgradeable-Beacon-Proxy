import config from "config";
import { ethers } from "ethers";

import { ethers as hardHatEthers, upgrades } from "hardhat";
import "@nomiclabs/hardhat-waffle";
import { getCurrentProvider } from "./migration-helper";

export const getWallet = (): ethers.Wallet => {
  const privateKey = config.get("PRIVATE_KEY") as string;
  if (!privateKey) throw new Error("Invalid private key");
  return new ethers.Wallet(privateKey, getCurrentProvider());
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
    const nftBaseUri = config.get("NFT_BASE_URI") as string;
    const maxSupply = Number.parseInt(config.get("NFT_MAX_SUPPLY") as string);

    const weedleTokenV1 = await hardHatEthers.getContractFactory(
      "WeedleNFTTokenV1",
      getWallet()
    );

    const beacon = await upgrades.deployBeacon(weedleTokenV1);
    await beacon.deployed();
    console.log("beacon deployed", beacon.address);

    const WeedleTokenFactory = await hardHatEthers.getContractFactory(
      "WeedleTokenFactory",
      getWallet()
    );

    const weedleTokenFactory = await WeedleTokenFactory.deploy(beacon.address);
    await weedleTokenFactory.deployed();
    console.log("factory deployed", weedleTokenFactory.address);

    await (
      await weedleTokenFactory.createNFTContract({
        uri: nftBaseUri,
        maxSupply,
        name: "WDL",
        price: ethers.utils.parseEther("1"),
        maxMintsAllowed: 2,
      })
    ).wait();
    const tokenV1Addr = await weedleTokenFactory.getContractByIndex(1);
    console.log("new nft contract created", tokenV1Addr);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})();
