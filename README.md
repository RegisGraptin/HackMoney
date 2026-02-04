<a id="readme-top"></a>

<br />
<div align="center">
  <img src="./logo.png" alt="Logo" width="250" height="250">
  <h3 align="center">Cipher Lend</h3>
  <p align="center">
    The confidential lending layer that lets users lend to Aave without exposing their positions on-chain.
    <br />
    <em align="center">Built during <a href="https://ethglobal.com/events/hackmoney2026" title="HackMoney 2026">HackMoney 2026</a></em>
    <br />
    <br />
    <a href="https://github.com/RegisGraptin/CipherLend">Code</a>
    &middot;
    <a href="#">Website</a>
    &middot;
    <a href="#">Video Demo</a>
  </p>
</div>

## About Cipher Lend

Cipher Lend lets you lend to Aave **without exposing your position on-chain**.

Normally, every Aave deposit or withdrawal publicly reveals who acted, how much, and when. Cipher Lend breaks this link by batching many users’ actions together and executing them in a single transaction, making individual activity indistinguishable.

Cipher Lend operates using a round-based execution model. During each round, users submit encrypted intents to lend or withdraw. Once a predefined time window closes and a participation threshold is reached, the protocol executes a single aggregated transaction on Aave, supplying or withdrawing only the net amount. Because only the aggregate value is visible on-chain, individual user positions and amounts remain private.

Cipher Lend does not reinvent lending infrastructure. Instead, it provides the privacy primitives required to interact with battle-tested DeFi protocols while leveraging Fully Homomorphic Encryption (FHE) for confidential computation.

Welcome to the privacy land.

## Getting Started

TODO:

Sepolia environment
