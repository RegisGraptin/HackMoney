// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
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
            currentNumberOfUsers += 1;
        }
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
            _mint(from, eAmount);
            _updateDistinctUsers(from);
            success = FHE.asEbool(true);
        } else {
            success = FHE.asEbool(false);
        }
        FHE.allow(success, msg.sender);
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

        // Reset for next round
        ++currentRound;
        lastUpdateTime = block.timestamp;
        currentNumberOfUsers = 0;
        nextRoundDelta = FHE.asEuint64(INT64_OFFSET);
        FHE.allowThis(nextRoundDelta);
    }

    /// Also computes and updates accumulated rewards for participants.

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

        // FIXME: Compute the reward of the previous round

        // Apply the round
        uint64 roundAmount = abi.decode(abiEncodedClearValues, (uint64));
        if (roundAmount < INT64_OFFSET) {
            // Withdraw from AAVE
            uint256 amountToWithdraw = INT64_OFFSET - roundAmount;
            uint256 withdrawnAmount = AaveAdapter.withdrawFromAave(asset, AAVE_POOL_ADDRESS, amountToWithdraw);

            // Wrap the withdrawn amount into confidential tokens
            IERC20(asset).approve(address(_confidentialWrapper), withdrawnAmount);
            _confidentialWrapper.wrap(address(this), withdrawnAmount);
        } else if (roundAmount > INT64_OFFSET) {
            // Supply to AAVE
            uint64 amountToLend = roundAmount - INT64_OFFSET;
            AaveAdapter.supplyToAave(asset, AAVE_POOL_ADDRESS, amountToLend);

            euint64 eAmount = FHE.asEuint64(amountToLend);
            FHE.allowTransient(eAmount, address(_confidentialWrapper));
            _confidentialWrapper.unwrap(address(this), address(this), eAmount);
        }
    }

    // FIXME: Check the finalized using `unwrapRequester(unwrapAmount);`
    // NOTE: anyone can call the finalizeUnwrap BUT we need to ensure it is done before the user call to finalize the withdraw
}
