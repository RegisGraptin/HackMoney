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
    &middot;
    <a href="#">Video Demo</a>
  </p>
</div>

## About Cipher Lend

Cipher Lend brings privacy to DeFi by enabling confidential swaps and lending **without exposing your position on-chain**.

Normally, each DeFi action such as swap, liquidity deposit or withdrawal publicly reveals who acted, how much, and when. Cipher Lend breaks this link by batching many users’ encrypted intents and executing them as a single aggregated transaction, making individual activity indistinguishable.

Cipher Lend operates using a round-based execution model. During each round, users submit encrypted intents to **swap, lend, or withdraw**. Once a predefined time window closes and a participation threshold is reached, the protocol executes a single aggregated transaction across supported protocols that applies only the net amounts. Because only aggregate values are visible on-chain, individual positions and amounts remain private.

Cipher Lend does not reinvent DeFi infrastructure. Instead, it provides the privacy primitives required to interact with battle-tested DeFi protocols while leveraging Fully Homomorphic Encryption (FHE) for confidential computation.

Welcome to the privacy land.

### Current Demo: Confidential Swaps

For the HackMoney demo, we showcase private swaps using the same round-based aggregation and encrypted intent model. This demonstrates the privacy primitives that will extend seamlessly to lending.

To interact with the demo, you can either run the `dapp` locally or use the deployed Vercel app. You will need to have USDC faucet on Sepolia. Then you will need to shield them to get confidential USDC (cUSDC) that you can use to submit your swap intent. At the moment, we only handle swaps from cUSDC to cUNI, but this design can be modified and adapted to handle the other direction. Once your intent is submitted by providing cUSDC, you can execute the round logic in the "Swap Status". (Note: If you need more users, you can take a look at the tasks in the `protocol` folder) To execute the round, you will need to wait for the round to close (after the predefined time window) and for the participation threshold to be reached (enough swap intents submitted). Here we have set it pretty low for easier testing. Once these conditions are met, you can execute the round logic, which will perform a single aggregated swap transaction on Uniswap using the net amounts from all submitted intents. For this swap, we will need to unshield the total amount of cUSDC submitted by all users to get the underlying USDC, perform the swap on Uniswap, and then shield the resulting UNI back to cUNI. Finally, once the round is executed, you can withdraw your share of cUNI swapped.

### Roadmap: Confidential Lending

This round-based aggregation and encrypted intent model extends naturally to lending. We can have the same logic applied for AAVE where people aggregate their intends to supply or withdraw, and then execute a single aggregated transaction that interacts with AAVE on behalf of all users, keeping individual positions hidden while preserving composability.

## Getting Started

For the contract deployment and local testing, please refer to the `protocol` folder. For the dapp, please refer to the `dapp` folder.

## Contracts deployed on Sepolia

- Confidential Tokens
  - cUSDC: `0xb5a33983Abe09102D006b00d7bd7B424c038f809`
  - cUNI: `0xd190201eEEdcDFeCD1AC53c8E5f3B26ff0b2bB3B`
- Confidential Swap Protocol: `0x82c4Df3dBA639CE15c181A0880cA68e122e88E0e`

For more details on the contracts, please refer to the `protocol` folder.
