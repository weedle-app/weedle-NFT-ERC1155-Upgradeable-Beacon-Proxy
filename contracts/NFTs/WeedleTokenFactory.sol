// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./WeedleNFTTokenV1.sol";

contract WeedleTokenFactory is Pausable, Ownable {
    uint256 public createdTokenCount;
    address private immutable weedleTokenBeacon;
    // mapping of id to token created
    mapping(uint256 => address) private tokensList;

    event OnTokenDeployed(address tokenAddress, uint256 createdTokenCount);

    constructor(address _beacon) {
        weedleTokenBeacon = address(_beacon);
    }

    function createToken(string calldata _uri)
        external
        whenNotPaused
        returns (address)
    {
        BeaconProxy proxy = new BeaconProxy(
            weedleTokenBeacon,
            abi.encodeWithSelector(
                WeedleNFTTokenV1.initialize.selector,
                _uri,
                owner()
            )
        );

        createdTokenCount++;
        tokensList[createdTokenCount] = address(proxy);
        emit OnTokenDeployed(address(proxy), createdTokenCount);
        return address(proxy);
    }

    function getTokenByIndex(uint32 index)
        external
        view
        whenNotPaused
        returns (address)
    {
        return tokensList[index];
    }

    function pauseFactory() external onlyOwner {
        _pause();
    }

    function unpauseFactory() external onlyOwner {
        _unpause();
    }
}
