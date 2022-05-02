// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";

import "./interfaces/IWeedleNFTToken.sol";
import "./helpers/SharedStructs.sol";

contract WeedleNFTTokenV1 is
    IWeedleNFTToken,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Mapping from token ID to owner address
    mapping(address => uint256) private _totalMintedPerUser;

    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.UintToAddressMap;
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter private lastMintedId;
    EnumerableMapUpgradeable.UintToAddressMap private _owners;

    SharedStructs.Settings private settings;

    function initialize(
        SharedStructs.Settings calldata _settings,
        address _admin
    ) public initializer {
        __ERC1155_init(_settings.uri);
        __Ownable_init();
        __AccessControl_init();
        __EIP712_init(_settings.name, "1.0.0");
        __ReentrancyGuard_init();

        transferOwnership(_admin);
        settings = _settings;

        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier isMintingOngoing() {
        require(
            lastMintedId.current() + 1 <= settings.maxSupply,
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

    function updatePrice(uint256 _newPrice) external override onlyOwner {
        settings.price = _newPrice;
        emit PriceUpdate(_newPrice);
    }

    /**
     * @dev See {ownerOf}.
     *
     * tokenId - Id of token to get owner of
     */
    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _owners.get(tokenId);

        require(owner != address(0), "Query for nonexistent token!");
        return owner;
    }

    function reedemAndMint(bytes32 hash, bytes calldata signature)
        external
        payable
        override
    {
        require(_owners.length() <= settings.maxSupply, "Minting has ended!");

        require(
            _totalMintedPerUser[msg.sender] < settings.maxMintsAllowed,
            "You have exceeded the allowed number of mints"
        );

        require(
            hash == keccak256(abi.encode(msg.sender, owner(), address(this))),
            "Invalid hash"
        );
        require(
            ECDSAUpgradeable.recover(
                ECDSAUpgradeable.toEthSignedMessageHash(hash),
                signature
            ) == owner(),
            "Invalid signature"
        );

        require(
            msg.value == settings.price,
            "Insufficient amount sent for NFT"
        );

        _mintTo(msg.sender);

        // PullPayment pattern can also be used here to store funds in an escrow
        _safeTransfer(payable(owner()), msg.value);
    }

    function _safeTransfer(address payable payee, uint256 amount)
        internal
        nonReentrant
    {
        (bool sent, ) = payee.call{value: amount}("");
        require(sent, "Failed to send Ether");
        emit FundsTransfer(payee, amount);
    }

    /**
     * The function is designed to be used for all minting purposes
     *
     */
    function _mintTo(address to) private isMintingOngoing returns (uint256) {
        lastMintedId.increment();

        uint256 tokenId = lastMintedId.current();

        require(!_owners.contains(tokenId), "Token already minted");

        ++_totalMintedPerUser[msg.sender];

        _owners.set(lastMintedId.current(), to);

        _mint(to, tokenId, 1, "");

        emit NFTMinted(tokenId, to, 1);

        return tokenId;
    }
}
