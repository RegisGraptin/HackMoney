// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

interface IConfidentialLending {
    // TODO: Structs
    // TODO: Getters
    // TODO: Events

    event LendingRoundUpdated(uint256 indexed roundId, euint64 roundDelta);

    // TODO: Errors

    error TooEarlyForNextRound();
    error MissingDistinctUsers();
    error RoundNotFinalized();
    error UnfinalizedUnwrapRequest();
    error UndefinedUnwrapRequest();

    // TODO: Functions
}
