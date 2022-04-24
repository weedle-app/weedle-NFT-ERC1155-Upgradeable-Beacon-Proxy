// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./interfaces/IWeedleNFTToken.sol";

contract WeedleNFTTokenV1 is
    IWeedleNFTToken,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;

    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private lastMintedId;

    function initialize(string calldata _uri, address _admin)
        public
        initializer
    {
        __ERC1155_init(_uri);
        __Ownable_init();
        __AccessControl_init();

        transferOwnership(_admin);
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

    /**
     * The function is designed to be used for all minting purposes
     *
     */
    function _mintTo(address to) private returns (uint256) {
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

    function safeTransferToOtherChains(
        uint256 tokenId,
        uint16 chainId,
        bytes calldata _destination
    ) public override returns (uint256) {}
}
