<a id="readme-top"></a>

<br />
<div align="center">
  <img src="./logo.png" alt="Logo" width="250" height="250">
  <h3 align="center">Cipher Lend</h3>
  <p align="center">
    The confidential DeFi layer that lets users interact with existing protocols without exposing their positions on-chain.
    <br />
    <em align="center">Built during <a href="https://ethglobal.com/events/hackmoney2026" title="HackMoney 2026">HackMoney 2026</a></em>
    <br />
    <br />
    <a href="https://github.com/RegisGraptin/CipherLend">Code</a>
    &middot;
    <a href="https://cipher-lend-five.vercel.app/">Website</a>
  </p>
</div>

## About Cipher Lend

Cipher Lend brings privacy to DeFi by enabling confidential swaps and lending **without exposing your position on-chain**.

Normally, each DeFi action such as swaps, liquidity deposits, or withdrawals publicly reveals who acted, how much, and when. Cipher Lend breaks this link by batching many users’ encrypted intents and executing them as a single aggregated transaction, making individual activity indistinguishable.

Cipher Lend operates using a round-based execution model. During each round, users submit encrypted intents to **swap, lend, or withdraw**. Once a predefined time window closes and a participation threshold is reached, the protocol executes a single aggregated transaction across supported protocols that applies only the net amounts. Because only aggregate values are visible on-chain, individual positions and amounts remain private.

Cipher Lend does not reinvent DeFi infrastructure. Instead, it provides the privacy primitives required to interact with battle-tested DeFi protocols while leveraging Fully Homomorphic Encryption (FHE) for confidential computation.

Welcome to privacy land.


## How It Works

The current implementation focuses on confidential swaps, but the same primitives extend to lending. Cipher Lend leverages confidential tokens using FHE (Fully Homomorphic Encryption) to encrypt user balances. This primitive is now available on Ethereum mainnet and allows confidential transfers, where transactions are visible on Etherscan but the transferred amounts are encrypted.

Cipher Lend has a round-based execution model where users submit encrypted intents to swap. Currently, we only support cUSDC to cUNI. Once the round closes (after a predefined time window) and a participation threshold is reached, the protocol executes a single aggregated transaction that swaps USDC to the UNI token. Because we are using confidential tokens, we first need to unshield cUSDC to get the native token and use Uniswap v4 to perform the swap. Notice that because we batch into a single transaction, individual user amounts cannot be deduced. 

Finally, once the swap is executed, we will shield the resulting UNI back to cUNI and distribute it to users based on their share of the total cUSDC submitted. This way, we can execute swaps using confidential primitives, allowing us to preserve user privacy while still interacting with existing DeFi protocols.

The smart contracts are deployed on Sepolia, and we use the Zama FHE SDK for the confidential token implementation. You can check the implementation details in the `protocol` folder. 

Client-side, the dapp is built with Next.js and uses Wagmi/AppKit for wallet connection. For encryption and decryption, we use the Zama Relayer SDK.

While the demo centers on swaps, the same primitives extend to aggregated lending. We have started the implementation for Aave, where users can submit encrypted intents to supply or withdraw, and then execute a single aggregated transaction that interacts with Aave on behalf of all users, keeping individual positions hidden while preserving composability. However, the lending part is still a work in progress.

To test the swap demo, you can use the deployed contracts on Sepolia by running a frontend instance. Alternatively, you can use the one deployed on Vercel.

### Roadmap: Confidential Lending

This round-based aggregation and encrypted intent model extends naturally to lending. We can apply the same logic to Aave, where people aggregate their intents to supply or withdraw, and then execute a single aggregated transaction that interacts with Aave on behalf of all users, keeping individual positions hidden while preserving composability.

## Getting Started

For the contract deployment and local testing, please refer to the `protocol` folder. For the dapp, please refer to the `dapp` folder.

## Contracts deployed on Sepolia

- Confidential Tokens
  - cUSDC: `0xb5a33983Abe09102D006b00d7bd7B424c038f809`
  - cUNI: `0xd190201eEEdcDFeCD1AC53c8E5f3B26ff0b2bB3B`
- Confidential Swap Protocol: `0x82c4Df3dBA639CE15c181A0880cA68e122e88E0e`

For more details on the contracts, please refer to the `protocol` folder.
