// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ERC20 Mock Contract
contract ERC20Mock is ERC20 {
    /// @notice Decimals value used in the MockERC20
    uint8 internal _decimals;

    /// @notice Constructor to initialize the mock ERC20 token
    /// @param name_ The name of the token
    /// @param symbol_ The symbol of the token
    /// @param decimals_ Decimals value used for this token
    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    /// @notice Mint new tokens
    /// @param account The address to mint tokens to
    /// @param amount The amount of tokens to mint
    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    /// @inheritdoc ERC20
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
