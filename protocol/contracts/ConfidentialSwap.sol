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

import {ERC7984Mock} from "./mocks/ERC7984Mock.sol";

import {IUniversalRouter} from "@uniswap/universal-router/contracts/interfaces/IUniversalRouter.sol";
import {Commands} from "@uniswap/universal-router/contracts/libraries/Commands.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IV4Router} from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {IV4Quoter} from "@uniswap/v4-periphery/src/interfaces/IV4Quoter.sol";
import {IPermit2} from "@uniswap/permit2/src/interfaces/IPermit2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {PoolKey, IHooks} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

/// FIXME: Can't we create a single base contract that abstracts all the round logic.
/// Too much similarity with the lending contract, we can have a base contract that handle all the round logic
/// and then have the swap and lending contract inheriting from it.
/// See depending of hackathon time available
contract ConfidentialSwap is ZamaEthereumConfig, IERC7984Receiver {
    using StateLibrary for IPoolManager;

    IUniversalRouter public immutable router;
    IPoolManager public immutable poolManager;
    IPermit2 public immutable permit2;
    IV4Quoter public immutable quoter;

    uint256 public constant MIN_TIME_BETWEEN_ROUNDS = 2 minutes;
    uint256 public constant MIN_DISTINCT_USERS = 2;

    uint256 currentRound;

    euint64 public nextRoundDelta;

    /// @notice Last round timestamps.
    uint256 public lastUpdateTime;

    /// @notice Current number of distinct users in the lending pool.
    uint256 public currentNumberOfUsers;

    /// @notice Track the user next round balance
    mapping(address account => uint256 lastRound) internal _userLastRound;

    mapping(uint256 => mapping(address => euint64)) public userAmounts;

    /// @notice Track per round the encrypted liquidity delta
    mapping(uint256 round => euint64 roundDelta) public roundDelta;

    // Save the transfer values
    mapping(uint256 round => uint64 amount) public totalRequestedAmount;
    mapping(uint256 round => uint64 amount) public totalReceivedAmount;

    event RoundUpdated(uint256 indexed round, euint64 netAmount);

    error TooEarlyForNextRound();
    error MissingDistinctUsers();
    error RoundNotFinalized();

    /// Addresses defined by uniswap on sepolia
    address public constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address public constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;

    /// Addresses of the confidential wrapper for the underlying asset
    address cUSDC;
    address cUNI;

    // Swap USDC --> UNI
    constructor(address router_, address poolManager_, address permit2_, address quoter_) {
        // Create confidential wrapper for USDC and UNI tokens
        // FIXME: Mock name is not right here
        cUSDC = address(new ERC7984Mock(USDC));
        cUNI = address(new ERC7984Mock(UNI));

        router = IUniversalRouter(router_);
        poolManager = IPoolManager(poolManager_);
        permit2 = IPermit2(permit2_);
        quoter = IV4Quoter(quoter_);
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

        currentRound++;

        emit RoundUpdated(currentRound, nextRoundDelta);
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
        cts[0] = FHE.toBytes32(roundDelta[currentRound - 1]);
        FHE.checkSignatures(cts, abiEncodedClearValues, decryptionProof);

        // Decrypt the round amount and save it
        uint64 swapUsdcAmount = abi.decode(abiEncodedClearValues, (uint64));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(UNI),
            fee: 3000, // 0.3% fee tier
            tickSpacing: 60, // Tick spacing for the pool
            hooks: IHooks(address(0)) // No hooks needed for this swap
        });

        IV4Quoter.QuoteExactSingleParams memory quoteParams = IV4Quoter.QuoteExactSingleParams({
            poolKey: key,
            zeroForOne: true, // true if we're swapping token0 for token1
            exactAmount: swapUsdcAmount,
            hookData: bytes("")
        });

        (uint256 expectedAmountOut, uint256 gasEstimate) = quoter.quoteExactInputSingle(quoteParams);
        uint128 minAmountOut = uint128((expectedAmountOut * 99) / 100);
        // FIXME: Maybe add a check here on the output value

        uint256 amountOut = _swapExactInputSingle(key, swapUsdcAmount, minAmountOut, block.timestamp + 15 minutes);

        // Wrap the received UNI into the confidential wrapper
        // FIXME: Production use SafeERC20 and check return values
        IERC20(UNI).approve(cUNI, amountOut);
        ERC7984ERC20Wrapper(cUNI).wrap(address(this), amountOut);

        // Save the round amounts transferred
        totalRequestedAmount[currentRound - 1] = swapUsdcAmount;
        totalReceivedAmount[currentRound - 1] = uint64(amountOut);
    }

    function _swapExactInputSingle(
        PoolKey memory key, // PoolKey struct that identifies the v4 pool
        uint128 amountIn, // Exact amount of tokens to swap
        uint128 minAmountOut, // Minimum amount of output tokens expected
        uint256 deadline // Timestamp after which the transaction will revert
    ) internal returns (uint256 amountOut) {
        bytes memory commands = abi.encodePacked(uint8(Commands.V4_SWAP));
        bytes[] memory params = new bytes[](3);
        bytes[] memory inputs = new bytes[](1);

        // Encode V4Router actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_IN_SINGLE),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );

        // First parameter: swap configuration
        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: true, // true if we're swapping token0 for token1  // FIXME:
                amountIn: amountIn, // amount of tokens we're swapping
                amountOutMinimum: minAmountOut, // minimum amount we expect to receive
                hookData: bytes("") // no hook data needed
            })
        );
        params[1] = abi.encode(key.currency0, amountIn);
        params[2] = abi.encode(key.currency1, minAmountOut);

        // Combine actions and params into inputs
        inputs[0] = abi.encode(actions, params);

        // Execute the swap with deadline protection
        router.execute(commands, inputs, deadline);

        // Verify the swap amount
        amountOut = IERC20(Currency.unwrap(key.currency1)).balanceOf(address(this));
        require(amountOut >= minAmountOut, "Insufficient output amount");

        return amountOut;
    }

    /**
     * @notice Deposit confidential liquidity into the contract
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
        if (msg.sender == cUSDC) {
            userAmounts[currentRound][from] = FHE.add(userAmounts[currentRound][from], eAmount);
            FHE.allowThis(userAmounts[currentRound][from]);
            FHE.allow(userAmounts[currentRound][from], msg.sender);

            // Update the next round delta
            nextRoundDelta = FHE.add(nextRoundDelta, eAmount);
            FHE.allowThis(nextRoundDelta);

            _updateDistinctUsers(from);

            success = FHE.asEbool(true);
        } else {
            success = FHE.asEbool(false);
        }
        FHE.allow(success, msg.sender);
    }

    function withdraw(uint256 roundId) external {
        require(roundId < currentRound, "Invalid round ID");
        euint64 eInputAmount = userAmounts[roundId][msg.sender];
        require(FHE.isInitialized(eInputAmount), "Invalid user amount");

        // Reset the suer balance
        userAmounts[roundId][msg.sender] = euint64.wrap(0);

        // Compute the user share
        euint64 eUserAmount = FHE.div(
            eInputAmount,
            totalRequestedAmount[currentRound - 1] * totalReceivedAmount[currentRound - 1]
        );

        // Transfer the share of the user
        FHE.allowTransient(eUserAmount, cUNI);
        ERC7984ERC20Wrapper(cUNI).confidentialTransfer(msg.sender, eUserAmount);
    }
}
