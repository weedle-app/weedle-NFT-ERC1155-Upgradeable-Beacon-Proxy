// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./WeedleNFTTokenV1.sol";
import "./common/SharedStructs.sol";

contract WeedleTokenFactory is Pausable, Ownable {
    uint256 public createdTokenCount;
    address private immutable weedleTokenBeacon;

    // mapping of id to contract created
    mapping(uint256 => address) private nftContracts;

    event OnTokenDeployed(address tokenAddress, uint256 createdTokenCount);

    constructor(address _beacon) {
        weedleTokenBeacon = address(_beacon);
    }

    function createNFTContract(SharedStructs.Settings memory _settings)
        external
        whenNotPaused
        returns (address)
    {
        BeaconProxy proxy = new BeaconProxy(
            weedleTokenBeacon,
            abi.encodeWithSelector(
                WeedleNFTTokenV1.initialize.selector,
                _settings,
                owner()
            )
        );

        ++createdTokenCount;
        nftContracts[createdTokenCount] = address(proxy);
        emit OnTokenDeployed(address(proxy), createdTokenCount);
        return address(proxy);
    }

    function getContractByIndex(uint32 index)
        external
        view
        whenNotPaused
        returns (address)
    {
        return nftContracts[index];
    }

    function pauseFactory() external whenNotPaused onlyOwner {
        _pause();
    }

    function unpauseFactory() external whenPaused onlyOwner {
        _unpause();
    }
}
