// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

import {
    ERC7984ERC20Wrapper
} from "@openzeppelin/confidential-contracts/contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

abstract contract ConfidentialLendingStorage {
    /// @notice Precision factor for reward computation
    uint64 internal constant PRECISION_FACTOR = 1e8;

    /// @notice Offset used to simulate signed integers with uint64 (euint64)
    /// to handle lending update position.
    // value > INT64_OFFSET represent a supply action
    uint64 internal constant INT64_OFFSET = 2 ** 63;

    /// @notice Address of the AAVE Pool Address
    address public immutable AAVE_POOL_ADDRESS;

    /// @notice ERC20 assets used in lending.
    address public immutable asset;
    address public immutable aAsset;

    /// @notice Index of the current round.
    uint256 public currentRound;

    /// @notice Net liquidity change (supply/withdraw) scheduled for the next round.
    /// Scaled to INT64_OFFSET to handle supply or withdraw operation.
    euint64 public nextRoundDelta;

    /// @notice Last round timestamps.
    uint256 public lastUpdateTime;

    /// @notice Current number of distinct users in the lending pool.
    uint256 public currentNumberOfUsers;

    /// @notice Defined the total amount currently lended in the protocol.
    uint256 totalLendedAmount; // TODO: Can we remove it?

    /// @notice Wrapper of the ERC20 underlying asset.
    ERC7984ERC20Wrapper internal _confidentialWrapper;

    /// @notice Track the user next round balance
    mapping(address account => uint256 lastRound) internal _userLastRound;

    /// @notice Track per round the encrypted liquidity delta
    mapping(uint256 round => euint64 roundDelta) public roundDelta;

    /// @notice Track the user next round balance
    mapping(address account => uint256 lastRound) internal _userLastUpdatedRound;

    /// @notice Cumulative reward index to tracks global rewards per unit of principal over time.
    mapping(uint256 round => uint64 globalReward) internal _globalRewards;

    /// @notice User reward index to compute lending reward.
    mapping(address account => uint64 index) internal _userRewardIndex;

    mapping(address account => mapping(uint256 roundIndex => euint64 eAmount)) public eAmountToWithdraw;

    mapping(uint256 round => euint64 unwrapAmount) internal _unwrapRequests;

    mapping(uint256 round => uint64 position) public positions;
}
