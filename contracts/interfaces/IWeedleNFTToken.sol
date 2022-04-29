// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";

interface IWeedleNFTToken is IERC1155Upgradeable {
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed mintedFor,
        uint256 amount
    );

    event FundsTransfer(address indexed payee, uint256 indexed amount);

    function mint() external returns (uint256);

    function safeTransferToOtherChains(
        uint256 tokenId,
        uint16 chainId,
        bytes calldata _destination
    ) external returns (uint256);

    function ownerOf(uint256 tokenId) external view returns (address);

    function reedemAndMint(bytes32 hash, bytes calldata signature)
        external
        payable;
}
