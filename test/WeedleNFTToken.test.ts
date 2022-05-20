import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Wallet } from "ethers";
import { ethers, upgrades } from "hardhat";

import {
  WeedleNFTTokenV1,
  WeedleTokenFactory,
  // eslint-disable-next-line camelcase
  WeedleNFTTokenV1__factory,
} from "../typechain";

const getMintingSignature = async (
  contractOwner: SignerWithAddress | Wallet,
  typesToSign: string[],
  dataToSign: string[]
): Promise<{ hash: string; signature: string }> => {
  const message = ethers.utils.defaultAbiCoder.encode(typesToSign, dataToSign);

  const hash = ethers.utils.keccak256(message);
  const signature = await contractOwner.signMessage(
    ethers.utils.arrayify(hash)
  );

  return { hash, signature };
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
      await weedleTokenFactory.createNFTContract({
        uri: nftBaseUri,
        maxSupply,
        name: "WDL",
        price: ethers.utils.parseEther("1"),
        maxMintsAllowed: 2,
      })
    ).wait();
    const tokenV1Addr = await weedleTokenFactory.getContractByIndex(1);
    weedleNFTToken = await WeedleNFTTokenV1.attach(tokenV1Addr);

    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("Admin Functions", () => {
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
    it("should revert transaction if any other user but owner tries to update price", async () => {
      const instance = weedleNFTToken.connect(otherUsers[2]);

      await expect(
        instance.updatePrice(ethers.utils.parseEther("2.0"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("should allow owner successfully change price", async () => {
      await expect(weedleNFTToken.updatePrice(ethers.utils.parseEther("2.0")))
        .to.emit(weedleNFTToken, "PriceUpdate")
        .withArgs(ethers.utils.parseEther("2.0"));
    });
    it("should disallow minting at old price", async () => {
      const _user = otherUsers[1];
      await (
        await weedleNFTToken.updatePrice(ethers.utils.parseEther("2.0"))
      ).wait();

      const { hash, signature } = await getMintingSignature(
        contractOwner,
        ["address", "address", "address"],
        [_user.address, contractOwner.address, weedleNFTToken.address]
      );

      const options = { value: ethers.utils.parseEther("1.0") };

      await expect(
        weedleNFTToken.connect(_user).reedemAndMint(hash, signature, options)
      ).to.revertedWith("Insufficient amount sent for NFT");
    });

    it("should only allow minting at new price", async () => {
      const user = otherUsers[1];
      await (
        await weedleNFTToken.updatePrice(ethers.utils.parseEther("2.0"))
      ).wait();

      const { hash, signature } = await getMintingSignature(
        contractOwner,
        ["address", "address", "address"],
        [user.address, contractOwner.address, weedleNFTToken.address]
      );

      const options = { value: ethers.utils.parseEther("2.0") };

      await expect(
        weedleNFTToken.connect(user).reedemAndMint(hash, signature, options)
      )
        .to.emit(weedleNFTToken, "NFTMinted")
        .withArgs(1, user.address, 1);
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

      await (
        await weedleTokenFactory.createNFTContract({
          uri: newBaseUri,
          maxSupply: 1,
          name: "WDL",
          price: ethers.utils.parseEther("1"),
          maxMintsAllowed: 3,
        })
      ).wait();
      const newTokenV1Addr = await weedleTokenFactory.getContractByIndex(
        tokenId
      );
      const newWeedleNFTToken = await WeedleNFTTokenV1.attach(newTokenV1Addr);
      await (await newWeedleNFTToken.mint()).wait();

      await expect(newWeedleNFTToken.mint()).to.be.reverted;
    });

    it("should only allow owner mint NFTs using .mint function", async () => {
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
      const _user = otherUsers[0];

      await (
        await weedleNFTToken.grantRole(
          await weedleNFTToken.MINTER_ROLE(),
          contractOwner.address
        )
      ).wait();

      const { hash, signature } = await getMintingSignature(
        contractOwner,
        ["address", "address", "address"],
        [_user.address, contractOwner.address, weedleNFTToken.address]
      );

      const options = { value: ethers.utils.parseEther("1.0") };

      await expect(
        weedleNFTToken.connect(_user).reedemAndMint(hash, signature, options)
      )
        .to.emit(weedleNFTToken, "NFTMinted")
        .withArgs(1, _user.address, 1);
    });

    it("should not allow non-admin user mint more than maximum allowed per user", async () => {
      const minter = otherUsers[1];
      const _user = otherUsers[0];

      await (
        await weedleNFTToken.grantRole(
          await weedleNFTToken.MINTER_ROLE(),
          minter.address
        )
      ).wait();

      const { hash, signature } = await getMintingSignature(
        contractOwner,
        ["address", "address", "address"],
        [_user.address, contractOwner.address, weedleNFTToken.address]
      );

      const options = { value: ethers.utils.parseEther("1.0") };

      await (
        await weedleNFTToken
          .connect(_user)
          .reedemAndMint(hash, signature, options)
      ).wait();

      await (
        await weedleNFTToken
          .connect(_user)
          .reedemAndMint(hash, signature, options)
      ).wait();

      await expect(
        weedleNFTToken.connect(_user).reedemAndMint(hash, signature, options)
      ).to.be.revertedWith("You have exceeded the allowed number of mints");
    });
  });

  describe("Funds withdrawal", () => {
    it("should transfer payments for minting to owner", async () => {
      const _user = otherUsers[0];

      await (
        await weedleNFTToken.grantRole(
          await weedleNFTToken.MINTER_ROLE(),
          contractOwner.address
        )
      ).wait();

      const { hash, signature } = await getMintingSignature(
        contractOwner,
        ["address", "address", "address"],
        [_user.address, contractOwner.address, weedleNFTToken.address]
      );

      const balanceBefore = await weedleNFTToken.provider.getBalance(
        contractOwner.address
      );

      expect(
        Number.parseFloat(ethers.utils.formatEther(balanceBefore))
      ).to.lessThan(
        Number.parseFloat(
          ethers.utils.formatEther(ethers.utils.parseEther("10000"))
        )
      );

      const options = { value: ethers.utils.parseEther("1.0") };

      await expect(
        weedleNFTToken.connect(_user).reedemAndMint(hash, signature, options)
      )
        .to.emit(weedleNFTToken, "NFTMinted")
        .withArgs(1, _user.address, 1)
        .to.emit(weedleNFTToken, "FundsTransfer")
        .withArgs(contractOwner.address, ethers.utils.parseEther("1.0"));

      const balanceAfter = await weedleNFTToken.provider.getBalance(
        contractOwner.address
      );

      expect(
        Number.parseFloat(ethers.utils.formatEther(balanceAfter))
      ).to.greaterThanOrEqual(
        Number.parseFloat(
          ethers.utils.formatEther(ethers.utils.parseEther("10000"))
        )
      );
    });
  });
});
