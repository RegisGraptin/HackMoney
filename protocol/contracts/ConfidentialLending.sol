// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IERC7984, ERC7984} from "@openzeppelin/confidential-contracts/contracts/token/ERC7984/ERC7984.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/contracts/interfaces/IERC7984Receiver.sol";

import {
    ERC7984ERC20Wrapper
} from "@openzeppelin/confidential-contracts/contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";

import {ConfidentialLendingStorage} from "./ConfidentialLendingStorage.sol";
import {IConfidentialLending} from "./interfaces/IConfidentialLending.sol";

import {AaveAdapter} from "./AAVEAdapter.sol";

contract ConfidentialLending is
    IConfidentialLending,
    ConfidentialLendingStorage,
    ZamaEthereumConfig,
    ERC7984,
    IERC7984Receiver
{
    // TODO: Idea round mechanism where we are waiting enough time + users to submti the lending/witdraw
    // actions from AAVE

    /// @notice Minimum time required between rounds to prevent too frequent updates.
    /// @dev We set 2 minutes for testing purposes, but in production, this should be set to
    /// a higher value (e.g., 30 minutes).
    uint256 public constant MIN_TIME_BETWEEN_ROUNDS = 2 minutes;

    /// @notice Minimum distinct users required to proceed with the next round.
    /// @dev This is to ensure sufficient obfuscation of user actions.
    /// In production, this should be set to a higher value (e.g., 30 users).
    /// TODO: Can we think of an incentive mechanism?
    /// Maybe some users does not care about privacy and just want to lend/withdraw quickly?
    uint256 public constant MIN_DISTINCT_USERS = 2;

    constructor(
        address aavePoolAddress_,
        address wrapperAddress_,
        string memory name_,
        string memory symbol_
    ) ERC7984(name_, symbol_, "") {
        AAVE_POOL_ADDRESS = aavePoolAddress_;

        _confidentialWrapper = ERC7984ERC20Wrapper(wrapperAddress_);

        // FIXME: Check underlying is known for AAVE

        // TODO: Managed assets error
        // TODO: What happended when underlying/aToken not exists?
        asset = address(_confidentialWrapper.underlying());

        // Fetch the asset from AAEVE Pool
        aAsset = AaveAdapter.fetchAssets(AAVE_POOL_ADDRESS, asset);

        // Defined the state of the lending pool
        nextRoundDelta = FHE.asEuint64(INT64_OFFSET);
        FHE.allowThis(nextRoundDelta);
    }

    /**
     * @notice Update the distinct user count if the user is new for the current round
     * @param account The address of the user to update
     */
    function _updateDistinctUsers(address account) internal {
        if (_userLastRound[account] < currentRound) {
            _userLastRound[account] = currentRound;
            ++currentNumberOfUsers;
        }
    }

    /// @notice Updates a user's balance for a specific round by applying accumulated rewards.
    /// @dev Calculates the reward delta since the user's last update based on the user’s principal.
    /// @param user The address of the user whose state is being updated.
    /// @param roundId The round identifier for which the update is performed.

    function _updateUserRound(address user, uint256 roundId) internal {}

    // FIXME: problem reward calculation should be done before the supply/withdraw and only once
    // FIXME: Problem: Transferable tokens, which means impact user reward calculation??

    /**
     * @notice Updates the user's reward based on the global reward index.
     * @param account The address of the user whose reward is being updated.
     * @dev New lending should not be rewarded in the current round.
     * @dev Withdraw in the current round should not be rewarded in the current round.
     */
    function _updateUserReward(address account) internal {
        // Lazy update on lending position
        uint256 lastCompletedRound = currentRound - 1;
        if (_userLastUpdatedRound[account] < lastCompletedRound) {
            uint64 deltaIndex = _globalRewards[lastCompletedRound] - _userRewardIndex[account];
            if (deltaIndex > 0) {
                // Compute the reward using user contribution
                euint64 userPrincipal = confidentialBalanceOf(account);
                euint64 reward = FHE.div(FHE.mul(userPrincipal, deltaIndex), PRECISION_FACTOR);

                // Update user reward index and mint the reward
                _userRewardIndex[account] = _globalRewards[lastCompletedRound];
                _mint(account, reward);
            }

            _userLastUpdatedRound[account] = lastCompletedRound;
        }
    }

    /**
     * @notice Override the _update function to include user reward updates on transfers
     * @param from The address of the sender
     * @param to The address of the recipient
     * @param amount The encrypted amount to transfer
     * @return transferred The encrypted amount actually transferred
     */
    function _update(address from, address to, euint64 amount) internal virtual override returns (euint64 transferred) {
        _updateUserReward(from);
        _updateUserReward(to);
        transferred = super._update(from, to, amount);
    }

    /**
     * @notice Deposit confidential liquidity into the lending pool
     * @param operator Confidential token address. (Expected to be the wrapper)
     * @param from User address providing the liquidity
     * @param eAmount Encrypted amount to deposit
     * @param data Additional data (not used)
     * @return success indicating successful receipt
     */
    function onConfidentialTransferReceived(
        address operator,
        address from,
        euint64 eAmount,
        bytes calldata data
    ) external returns (ebool success) {
        // Ensure that the call is coming from the recognized ERC7984 wrapper contract
        if (msg.sender == address(_confidentialWrapper)) {
            // Increment the recipient's encrypted balance
            _updateUserReward(from);
            _mint(from, eAmount);
            _updateDistinctUsers(from);

            // Update the next round delta
            nextRoundDelta = FHE.add(nextRoundDelta, eAmount);
            FHE.allowThis(nextRoundDelta);

            success = FHE.asEbool(true);
        } else {
            success = FHE.asEbool(false);
        }
        FHE.allow(success, msg.sender);
    }

    /**
     * @notice Request to withdraw confidential liquidity from the lending pool
     * @param eAmount_ Encrypted amount to withdraw (external representation)
     * @param inputProof_ Proof of correct encryption provided by the user
     */
    function requestWithdraw(externalEuint64 eAmount_, bytes calldata inputProof_) external {
        euint64 eAmount = FHE.fromExternal(eAmount_, inputProof_);

        // Burn the user's confidential tokens
        _updateUserReward(msg.sender);
        _burn(msg.sender, eAmount);
        _updateDistinctUsers(msg.sender);

        // Update the next round delta
        nextRoundDelta = FHE.sub(nextRoundDelta, eAmount);
        FHE.allowThis(nextRoundDelta);
    }

    /**
     * @notice Finalizes the current round and initiates execution of aggregated operations.
     * @dev Calls the Gateway to request decryption of the net amount (supply or withdraw) to be executed on AAVE,
     * based on all user requests collected during the round.
     */
    function callNextRound() external {
        require(block.timestamp > lastUpdateTime + MIN_TIME_BETWEEN_ROUNDS, TooEarlyForNextRound());
        require(currentNumberOfUsers >= MIN_DISTINCT_USERS, MissingDistinctUsers());

        // Allow the decryption of the current round to execute it after
        FHE.makePubliclyDecryptable(nextRoundDelta);
        roundDelta[currentRound] = nextRoundDelta;

        emit LendingRoundUpdated(currentRound, nextRoundDelta);
    }

    /**
     * @notice Executes the current round by performing the net operation on AAVE and updating rewards.
     * @dev Based on the decrypted net amount, either supplies or withdraws funds from AAVE.
     * @param abiEncodedClearValues Encoded clear values containing the decrypted net amount for the round
     * @param decryptionProof Proof of correct decryption provided by the Gateway
     */
    function executeRound(bytes memory abiEncodedClearValues, bytes memory decryptionProof) external {
        /// Verify the input proof
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(nextRoundDelta);
        FHE.checkSignatures(cts, abiEncodedClearValues, decryptionProof);

        // Decrypt the round amount
        uint64 roundAmount = abi.decode(abiEncodedClearValues, (uint64));

        // Compute and assigned all the rewards
        uint256 newReward = IERC20(aAsset).balanceOf(address(this)) - totalLendedAmount;
        uint256 deltaIndex = totalLendedAmount > 0 ? (newReward * PRECISION_FACTOR) / totalLendedAmount : 0;
        _globalRewards[currentRound] = _globalRewards[currentRound - 1] + uint64(deltaIndex);

        // Apply the round
        if (roundAmount < INT64_OFFSET) {
            // Withdraw from AAVE
            uint256 amountToWithdraw = INT64_OFFSET - roundAmount;
            uint256 withdrawnAmount = AaveAdapter.withdrawFromAave(asset, AAVE_POOL_ADDRESS, amountToWithdraw);

            // Wrap the withdrawn amount into confidential tokens
            IERC20(asset).approve(address(_confidentialWrapper), withdrawnAmount);
            _confidentialWrapper.wrap(address(this), withdrawnAmount);

            totalLendedAmount -= withdrawnAmount;
        } else if (roundAmount > INT64_OFFSET) {
            // Supply to AAVE
            uint64 amountToLend = roundAmount - INT64_OFFSET;
            AaveAdapter.supplyToAave(asset, AAVE_POOL_ADDRESS, amountToLend);

            euint64 eAmount = FHE.asEuint64(amountToLend);
            FHE.allowTransient(eAmount, address(_confidentialWrapper));
            _confidentialWrapper.unwrap(address(this), address(this), eAmount);

            totalLendedAmount += amountToLend;
        }

        // Reset for next round
        ++currentRound;
        lastUpdateTime = block.timestamp;
        currentNumberOfUsers = 0;
        nextRoundDelta = FHE.asEuint64(INT64_OFFSET);
        FHE.allowThis(nextRoundDelta);
    }

    // FIXME: Check the finalized using `unwrapRequester(unwrapAmount);`
    // NOTE: anyone can call the finalizeUnwrap BUT we need to ensure it is done before the user call to finalize the withdraw
}
