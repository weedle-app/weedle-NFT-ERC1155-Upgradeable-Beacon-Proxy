import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

// eslint-disable-next-line node/no-missing-import
import { WeedleNFTTokenV1 } from "../typechain";

describe("WeedleNFTTokenV1", async () => {
  let weedleNFTToken: WeedleNFTTokenV1;
  let contractOwner: SignerWithAddress;
  let otherUsers: SignerWithAddress[];
  let snapshotId: number;
  const nftBaseUri = "https://joinweedle.com/{id}.json";

  // The before all is used as a test for deployment here
  before(async () => {
    const [owner, ...rest] = await ethers.getSigners();
    otherUsers = rest;
    contractOwner = owner;
    const WeedleNFTTokenV1 = await ethers.getContractFactory(
      "WeedleNFTTokenV1",
      contractOwner
    );

    weedleNFTToken = (await upgrades.deployProxy(
      WeedleNFTTokenV1,
      [nftBaseUri],
      {
        kind: "uups", // uups is more optimal than other upgrade methods
      }
    )) as WeedleNFTTokenV1;

    await weedleNFTToken.deployed();
  });

  beforeEach(async () => {
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
  });

  describe("Uri", () => {
    it("should get correct uri and format it correctly", async () => {
      const tokenId = 2;
      const rawUri = await weedleNFTToken.uri(tokenId);

      const formatedUri = rawUri.replace(
        "{id}",
        tokenId.toString(16).padStart(64, "0")
      );
      const expectedUri = `https://joinweedle.com/${tokenId
        .toString(16)
        .padStart(64, "0")}.json`;
      expect(expectedUri).to.equal(formatedUri);
    });
  });

  describe("Minting", () => {
    it("should verify that contract owner gets nft on minting", async () => {
      await (await weedleNFTToken.mint()).wait();

      expect(await weedleNFTToken.ownerOf(1)).to.equal(contractOwner.address);
    });

    it("should not allow non-owner to mint", async () => {
      const instance = weedleNFTToken.connect(otherUsers[0]);
      await expect(instance.mint()).to.be.reverted;
    });

    it("should all events are fired with the right arguments", async () => {
      const response = await (await weedleNFTToken.mint()).wait();
      const [transferSingleEvent, nftMintedEvent] = response.events || [];

      expect(transferSingleEvent.event).to.equal("TransferSingle");
      expect(transferSingleEvent.args?.operator).to.equal(
        contractOwner.address
      );
      expect(transferSingleEvent.args?.from).to.equal(
        ethers.constants.AddressZero
      );
      expect(transferSingleEvent.args?.to).to.equal(contractOwner.address);
      expect(transferSingleEvent.args?.id).to.equal(1);
      expect(transferSingleEvent.args?.value).to.equal(1);

      expect(nftMintedEvent.event).to.equal("NFTMinted");
      expect(nftMintedEvent.args?.tokenId).to.equal(1);
      expect(nftMintedEvent.args?.mintedFor).to.equal(contractOwner.address);
      expect(nftMintedEvent.args?.amount).to.equal(1);
    });
  });
});
