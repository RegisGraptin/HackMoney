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

contract ConfidentialLending is
    IConfidentialLending,
    ConfidentialLendingStorage,
    ZamaEthereumConfig,
    ERC7984,
    IERC7984Receiver
{
    // TODO: Idea round mechanism where we are waiting enough time + users to submti the lending/witdraw
    // actions from AAVE

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

        // TODO: Fetch the asset from AAEVE Pool

        // Defined the state of the lending pool
        nextRoundDelta = FHE.asEuint64(INT64_OFFSET);
        FHE.allowThis(nextRoundDelta);
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
            success = FHE.asEbool(true);
        } else {
            success = FHE.asEbool(false);
        }
        FHE.allow(success, msg.sender);
    }
}
