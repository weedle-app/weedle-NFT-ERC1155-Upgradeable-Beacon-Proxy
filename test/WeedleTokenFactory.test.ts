import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import {
  WeedleNFTTokenV1,
  WeedleTokenFactory,
  // eslint-disable-next-line camelcase
  WeedleNFTTokenV1__factory,
} from "../typechain";

describe("WeedleTokenFactory", async () => {
  let weedleNFTToken: WeedleNFTTokenV1;
  let weedleTokenFactory: WeedleTokenFactory;
  let contractOwner: SignerWithAddress;
  let otherUsers: SignerWithAddress[];
  let snapshotId: number;
  // eslint-disable-next-line camelcase
  let WeedleNFTTokenV1: WeedleNFTTokenV1__factory;
  const nftBaseUri = "https://joinweedle.com/{id}.json";
  const maxSupply = 10000;

  // The before all is used as a test for deployment here
  beforeEach(async () => {
    const [owner, ...rest] = await ethers.getSigners();
    otherUsers = rest;
    contractOwner = owner;
    WeedleNFTTokenV1 = await ethers.getContractFactory(
      "WeedleNFTTokenV1",
      contractOwner
    );

    const beacon = await upgrades.deployBeacon(WeedleNFTTokenV1);
    await beacon.deployed();

    const WeedleTokenFactory = await ethers.getContractFactory(
      "WeedleTokenFactory",
      contractOwner
    );

    weedleTokenFactory = await WeedleTokenFactory.deploy(beacon.address);
    await weedleTokenFactory.deployed();

    await (
      await weedleTokenFactory.createNFTContract({
        uri: nftBaseUri,
        maxSupply,
        name: "WDL",
        price: ethers.utils.parseEther("1"),
        maxMintsAllowed: 1,
      })
    ).wait();
    const tokenV1Addr = await weedleTokenFactory.getContractByIndex(1);
    weedleNFTToken = await WeedleNFTTokenV1.attach(tokenV1Addr);

    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });
  describe("Deployments", () => {
    it("should deploy correctly and assign the correct uri", async () => {
      const tokenId = 1;
      const rawUri = await weedleNFTToken.uri(tokenId);

      expect(rawUri).to.equal(nftBaseUri);
    });
    it("should create a new token from factory different from the initial one", async () => {
      const newBaseUri = "https://new-token.com/{id}.json";
      const tokenId = 2;

      await (
        await weedleTokenFactory.createNFTContract({
          uri: newBaseUri,
          maxSupply,
          name: "WDL1",
          price: ethers.utils.parseEther("1"),
          maxMintsAllowed: 1,
        })
      ).wait();
      const newTokenV1Addr = await weedleTokenFactory.getContractByIndex(
        tokenId
      );
      const newWeedleNFTToken = await WeedleNFTTokenV1.attach(newTokenV1Addr);
      const rawUri = await newWeedleNFTToken.uri(tokenId);

      expect(rawUri).to.equal(newBaseUri);
    });
  });

  describe("Pause", () => {
    it("should not allow creating a new NFT token when factory is paused", async () => {
      await (await weedleTokenFactory.pauseFactory()).wait();
      const newBaseUri = "https://new-token.com/{id}.json";

      await expect(
        weedleTokenFactory.createNFTContract({
          uri: newBaseUri,
          maxSupply,
          name: "WDL2",
          price: ethers.utils.parseEther("1"),
          maxMintsAllowed: 1,
        })
      ).to.be.reverted;
    });

    it("should not allow getting existing NFT token information when factory is paused", async () => {
      await (await weedleTokenFactory.pauseFactory()).wait();

      await expect(weedleTokenFactory.getContractByIndex(1)).to.be.reverted;
    });

    it("should not allow pausing factory when factory already paused", async () => {
      await (await weedleTokenFactory.pauseFactory()).wait();

      await expect(weedleTokenFactory.pauseFactory()).to.be.reverted;
    });

    it("should not allow unpausing factory when factory already unpaused", async () => {
      await expect(weedleTokenFactory.unpauseFactory()).to.be.reverted;
    });

    it("should not allow pausing factory when request is not made by owner", async () => {
      const instance = weedleTokenFactory.connect(otherUsers[0]);
      await expect(instance.pauseFactory()).to.be.reverted;
    });

    it("should not allow unpausing factory when request is not made by owner", async () => {
      const instance = weedleTokenFactory.connect(otherUsers[0]);
      await expect(instance.unpauseFactory()).to.be.reverted;
    });
  });
});
