import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

// eslint-disable-next-line node/no-missing-import
import {
  WeedleNFTTokenV1,
  WeedleTokenFactory,
  // eslint-disable-next-line camelcase
  WeedleNFTTokenV1__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";

interface DomainInfo {
  name: string;
  version: string;
  verifyingContract: string;
}

interface NFT {
  name: string;
  type: string;
}

const getMintingSignature = async (
  address: SignerWithAddress,
  domainInfo: DomainInfo,
  nftArgs: NFT[],
  args: Record<string, unknown>
) => {
  const { chainId } = await ethers.provider.getNetwork();

  return address._signTypedData(
    {
      chainId,
      ...domainInfo,
    },
    {
      NFT: nftArgs,
    },
    args
  );
};

describe("WeedleNFTTokenV1", async () => {
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
      await weedleTokenFactory.createToken({
        uri: nftBaseUri,
        maxSupply,
        name: "WDL",
        price: ethers.utils.parseEther("1"),
      })
    ).wait();
    const tokenV1Addr = await weedleTokenFactory.getTokenByIndex(1);
    weedleNFTToken = await WeedleNFTTokenV1.attach(tokenV1Addr);

    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
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
      const instance = weedleNFTToken.connect(contractOwner);

      await (await instance.mint()).wait();

      expect(await instance.ownerOf(1)).to.equal(contractOwner.address);
    });

    it("should not allow minting above maxSupply", async () => {
      const newBaseUri = "https://new-token.com/{id}.json";
      const tokenId = 2;

      // newBaseUri, 1
      await (
        await weedleTokenFactory.createToken({
          uri: newBaseUri,
          maxSupply: 1,
          name: "WDL",
          price: ethers.utils.parseEther("1"),
        })
      ).wait();
      const newTokenV1Addr = await weedleTokenFactory.getTokenByIndex(tokenId);
      const newWeedleNFTToken = await WeedleNFTTokenV1.attach(newTokenV1Addr);
      await (await newWeedleNFTToken.mint()).wait();

      await expect(newWeedleNFTToken.mint()).to.be.reverted;
    });

    it("should not allow non-owner to mint", async () => {
      const instance = weedleNFTToken.connect(otherUsers[0]);
      await expect(instance.mint()).to.be.reverted;
    });

    it("should verify all events are fired with the right arguments", async () => {
      const instance = weedleNFTToken.connect(contractOwner);

      const response = await (await instance.mint()).wait();
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

    it("should verify signature and allow user mint", async () => {
      /* 

      await (await instance.mint()).wait();

      expect(await instance.ownerOf(1)).to.equal(contractOwner.address); */
      const _user = otherUsers[0];
      const instance = weedleNFTToken.connect(contractOwner);

      const signature = await getMintingSignature(
        _user,
        {
          name: "WDL",
          verifyingContract: weedleNFTToken.address,
          version: "1.0.0",
        },
        [{ name: "account", type: "address" }],
        { account: _user.address }
      );

      await expect(
        instance.reedemAndMint(_user.address, _user.address, signature)
      ).to.emit(weedleNFTToken, "NFTMinted");
    });
  });
});
