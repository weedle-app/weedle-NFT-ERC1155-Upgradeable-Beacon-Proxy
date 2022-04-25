// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.6;

library SharedStructs {
    struct Settings {
        string uri;
        string name;
        uint256 price;
        uint256 maxSupply;
    }
}
