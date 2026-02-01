// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPool} from "lib/aave-v3-origin/src/contracts/interfaces/IPool.sol";
import {DataTypes} from "lib/aave-v3-origin/src/contracts/protocol/libraries/types/DataTypes.sol";

/**
 * @title AaveAdapter
 * @dev AAVE Documentation https://github.com/aave-dao/aave-v3-origin
 */
library AaveAdapter {
    using SafeERC20 for IERC20;

    /**
     * @notice Emitted when liquidity is supplied to AAVE
     * @param amount Amount supplied
     */
    event LiquiditySupplied(uint256 amount);

    /**
     * @notice Emitted when liquidity is withdrawn from AAVE
     * @param amount Amount withdrawn
     */
    event LiquidityWithdrawn(uint256 amount);

    /**
     * @notice Fetch the aToken address for a given underlying asset from AAVE pool
     * @param pool AAVE pool address
     * @param underlying Underlying asset address
     * @return aToken address
     */
    function fetchAssets(address pool, address underlying) public view returns (address) {
        DataTypes.ReserveDataLegacy memory reserve = IPool(pool).getReserveData(underlying);
        return reserve.aTokenAddress;
    }

    /**
     * @notice Supply assets to AAVE pool
     * @param asset Address of the ERC20 asset
     * @param pool AAVE pool address
     * @param amount Amount to supply
     * @dev We expect the amount to not be zero
     */
    function supplyToAave(address asset, address pool, uint256 amount) internal {
        IERC20(asset).approve(pool, amount);
        IPool(pool).supply(address(asset), amount, address(this), 0);
        emit LiquiditySupplied(amount);
    }

    /**
     * @notice Withdraw assets from AAVE pool
     * @param asset Address of the ERC20 asset
     * @param pool AAVE pool address
     * @param requestedAmount Amount to withdraw
     * @dev We expect the amount to not be zero
     */
    function withdrawFromAave(
        address asset,
        address pool,
        uint256 requestedAmount
    ) internal returns (uint256 withdrawnAmount) {
        // TODO: Case to be handle later on
        // How can we manage the case where AAVE does not have enough liquidity?

        // DataTypes.ReserveData memory reserve = POOL.getReserveData(asset);
        // uint256 availableLiquidity = IERC20(asset).balanceOf(reserve.aTokenAddress);
        // withdrawn = requestedAmount > availableLiquidity ? availableLiquidity : requestedAmount;
        // if (withdrawn > 0) {
        //     POOL.withdraw(asset, withdrawn, address(this));
        // }

        withdrawnAmount = IPool(pool).withdraw(address(asset), requestedAmount, address(this));
        emit LiquidityWithdrawn(withdrawnAmount);
    }
}
