// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ERC7984} from "@openzeppelin/confidential-contracts/contracts/token/ERC7984/ERC7984.sol";
// solhint-disable-next-line max-line-length
import {
    ERC7984ERC20Wrapper
} from "@openzeppelin/confidential-contracts/contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Confidential ERC20 Wrapper Contract
contract ERC7984Mock is ZamaEthereumConfig, ERC7984ERC20Wrapper {
    /// @notice Constructor to initialize the confidential ERC20 wrapper
    /// @param _assetAddress The address of the underlying ERC20 asset
    constructor(
        address _assetAddress
    )
        ERC7984(
            string.concat("c", IERC20Metadata(_assetAddress).name()),
            string.concat("c", IERC20Metadata(_assetAddress).symbol()),
            ""
        )
        ERC7984ERC20Wrapper(IERC20(_assetAddress))
    {}
}
