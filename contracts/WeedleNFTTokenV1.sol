// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

import "./interfaces/IWeedleNFTToken.sol";
import "./helpers/SharedStructs.sol";

contract WeedleNFTTokenV1 is
    IWeedleNFTToken,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public maxSupply;
    uint256 public price;

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;

    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private lastMintedId;

    SharedStructs.Settings private settings;

    function initialize(
        SharedStructs.Settings calldata _settings,
        address _admin
    ) public initializer {
        __ERC1155_init(_settings.uri);
        __Ownable_init();
        __AccessControl_init();
        __EIP712_init(_settings.name, "1.0.0");

        transferOwnership(_admin);
        maxSupply = _settings.maxSupply;
        settings = _settings;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier isMintingOngoing() {
        require(
            lastMintedId.current() + 1 <= maxSupply,
            "Minting Error: Minting has ended!"
        );
        _;
    }

    /**
     * We need to override this because both listed parent contracts implement supportsInterface
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(
            ERC1155Upgradeable,
            IERC165Upgradeable,
            AccessControlUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function mint() public override onlyOwner returns (uint256) {
        return _mintTo(msg.sender);
    }

    function reedemAndMint(
        address account,
        address signer,
        bytes calldata signature
    ) external payable override {
        require(
            _verifySignature(
                signer,
                _hash(account, owner(), settings.uri),
                signature
            ),
            "Invalid signature"
        );

        require(
            msg.value == settings.price,
            "Insufficient amount sent for NFT"
        );
        _mintTo(account);
    }

    /**
     * The function is designed to be used for all minting purposes
     *
     */
    function _mintTo(address to) private isMintingOngoing returns (uint256) {
        lastMintedId.increment();

        uint256 tokenId = lastMintedId.current();

        _owners[lastMintedId.current()] = to;

        _mint(to, tokenId, 1, "");

        emit NFTMinted(tokenId, to, 1);

        return tokenId;
    }

    /**
     * @dev See {ownerOf}.
     *
     * tokenId - Id of token to get owner of
     */
    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _owners[tokenId];

        require(owner != address(0), "Query for nonexistent token!");
        return owner;
    }

    function _verifySignature(
        address signer,
        bytes32 digest,
        bytes memory signature
    ) internal view returns (bool) {
        return
            SignatureCheckerUpgradeable.isValidSignatureNow(
                signer,
                digest,
                signature
            );
    }

    function _hash(
        address account,
        address owner,
        string storage tokenUri
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "NFT(address account, address owner, string tokenUri)"
                        ),
                        account,
                        owner,
                        tokenUri
                    )
                )
            );
    }

    function safeTransferToOtherChains(
        uint256 tokenId,
        uint16 chainId,
        bytes calldata _destination
    ) public override returns (uint256) {}
}
