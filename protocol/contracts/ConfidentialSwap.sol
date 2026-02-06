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
    uint256 public constant MIN_DISTINCT_USERS = 1;

    uint256 public currentRound;

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
    mapping(uint256 round => bool) public executed;

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
    address public cUSDC;
    address public cUNI;

    // Swap USDC --> UNI
    constructor(
        address router_,
        address poolManager_,
        address permit2_,
        address quoter_,
        address cUSDC_,
        address cUNI_
    ) {
        // Create confidential wrapper for USDC and UNI tokens
        // FIXME: Mock name is not right here
        cUSDC = cUSDC_;
        cUNI = cUNI_;

        router = IUniversalRouter(router_);
        poolManager = IPoolManager(poolManager_);
        permit2 = IPermit2(permit2_);
        quoter = IV4Quoter(quoter_);

        // Initialize the round tracking
        currentRound = 1;
        lastUpdateTime = block.timestamp;
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

        // Unshield the current token 
        FHE.allowTransient(nextRoundDelta, cUSDC);
        ERC7984ERC20Wrapper(cUSDC).unwrap(address(this), address(this), nextRoundDelta);

        currentRound++;

        // Reset the threshold for the next round
        currentNumberOfUsers = 0;
        lastUpdateTime = block.timestamp;

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

        require(!executed[currentRound - 1], 'Already executed');
        executed[currentRound - 1] = true;

        // Decrypt the round amount and save it
        uint64 swapUsdcAmount = abi.decode(abiEncodedClearValues, (uint64));

        // Determine swap direction: true if swapping currency0 for currency1
        bool zeroForOne = USDC < UNI; // USDC is currency0, so swap USDC->UNI is zeroForOne=true

        // Sort currencies: currency0 must be < currency1
        (Currency currency0, Currency currency1) = zeroForOne 
            ? (Currency.wrap(USDC), Currency.wrap(UNI))
            : (Currency.wrap(UNI), Currency.wrap(USDC));
        
        PoolKey memory key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000, // 0.3% fee tier
            tickSpacing: 60, // Tick spacing for the pool
            hooks: IHooks(address(0)) // No hooks needed for this swap
        });

        IV4Quoter.QuoteExactSingleParams memory quoteParams = IV4Quoter.QuoteExactSingleParams({
            poolKey: key,
            zeroForOne: zeroForOne,
            exactAmount: swapUsdcAmount,
            hookData: bytes('')
        });

        (uint256 expectedAmountOut, uint256 gasEstimate) = quoter.quoteExactInputSingle(quoteParams);
        uint128 minAmountOut = uint128((expectedAmountOut * 99) / 100);
        // FIXME: Maybe add a check here on the output value

        uint256 amountOut = _swapExactInputSingle(key, zeroForOne, swapUsdcAmount, minAmountOut, block.timestamp + 15 minutes);

        // Wrap the received UNI into the confidential wrapper
        // FIXME: Production use SafeERC20 and check return values
        IERC20(UNI).approve(cUNI, amountOut);
        ERC7984ERC20Wrapper(cUNI).wrap(address(this), amountOut);

        // Save the round amounts transferred
        // UNI has 18 decimals, convert to 6 decimals to match cUNI (6 decimals)
        totalRequestedAmount[currentRound - 1] = swapUsdcAmount;
        totalReceivedAmount[currentRound - 1] = uint64(amountOut / 1e12);
    }

    function _swapExactInputSingle(
        PoolKey memory key, // PoolKey struct that identifies the v4 pool
        bool zeroForOne, // Swap direction
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

        // Determine input/output currencies based on swap direction
        Currency inputCurrency = zeroForOne ? key.currency0 : key.currency1;
        Currency outputCurrency = zeroForOne ? key.currency1 : key.currency0;

        // First parameter: swap configuration
        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne,
                amountIn: amountIn, // amount of tokens we're swapping
                amountOutMinimum: minAmountOut, // minimum amount we expect to receive
                hookData: bytes('') // no hook data needed
            })
        );
        params[1] = abi.encode(inputCurrency, amountIn);
        params[2] = abi.encode(outputCurrency, minAmountOut);

        // Combine actions and params into inputs
        inputs[0] = abi.encode(actions, params);

        // Execute the swap with deadline protection
        // First approve Permit2 to spend USDC
        IERC20(USDC).approve(address(permit2), type(uint256).max);
        
        // Then use Permit2 to approve the router with expiration
        permit2.approve(USDC, address(router), uint160(amountIn), uint48(deadline));
        
        router.execute(commands, inputs, deadline);

        // // Verify the swap amount
        amountOut = IERC20(
            zeroForOne ? 
            Currency.unwrap(key.currency1) :
            Currency.unwrap(key.currency0)
        ).balanceOf(address(this));
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
        require(executed[roundId], "Round not executed yet");
        euint64 eInputAmount = userAmounts[roundId][msg.sender];
        require(FHE.isInitialized(eInputAmount), "Invalid user amount");

        // Reset the user balance
        userAmounts[roundId][msg.sender] = euint64.wrap(0);

        // Compute the user share: (userInput * totalOutput) / totalInput
        euint64 eUserAmount = FHE.div(
            FHE.mul(eInputAmount, totalReceivedAmount[roundId]),
            totalRequestedAmount[roundId]
        );

        // Transfer the share of the user
        FHE.allowTransient(eUserAmount, cUNI);
        ERC7984ERC20Wrapper(cUNI).confidentialTransfer(msg.sender, eUserAmount);
    }
}
