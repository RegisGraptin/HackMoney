# Confidential Lending Protocol using FHEVN

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm or yarn/pnpm**: Package manager

### Installation

1. **Install dependencies**

```bash
npm install

git submodule update --init --recursive lib/aave-v3-origin
```

2. **Set up environment variables**

Copy/Paste the `.env.example` file.

3. **Compile and test**

```bash
npm run compile
npm run test
```

4. **Deploy to Sepolia Testnet**

```bash
# Deploy to Sepolia
npx hardhat deploy --network sepolia
# Deploy USDC Wrapper specifically
npx hardhat deploy --tags USDCWrapper --network sepolia
# Deploy ConfidentialLending (depends on USDCWrapper)
npx hardhat deploy --tags ConfidentialLending --network sepolia
# Verify contract on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## Deployed Contracts on Sepolia

- cUSDC: `0x022521db54b0BfC74d8F76a8838a63494DD00d01`

## 📜 Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

## AAVE Protocol Addresses

https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Sepolia.sol

Pool address: `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951`

https://sepolia.etherscan.io/address/0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8

USDC address: `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`

Faucet for USDC: https://gho.aave.com/faucet/

Confidential Lending Protocol: `0x4c6faABbDD81B1c8A8d6204BA3A511467e081205`

## Hardhat Tasks (Sepolia)

- Prerequisites: set environment variables in `.env`:
  - `RPC_URL_SEPOLIA`: Sepolia RPC URL
  - `ACCOUNT_1_PRIVATE_KEY`: primary signer (funds, wrap, supply)
  - `ACCOUNT_2_PRIVATE_KEY`: secondary signer (receiver for funding)

### Fund ETH and transfer USDC

- Sends a small amount of ETH and transfers USDC from `ACCOUNT_1` to `ACCOUNT_2`.

```bash
npx hardhat --network sepolia task:fund-eth-usdc
```

### Shield USDC (wrap to confidential cUSDC)

- Approves USDC to the wrapper and mints cUSDC to the target address.

```bash
npx hardhat --network sepolia task:shield-usdc
```

### Supply liquidity via ConfidentialLending - Lending

- Encrypts the amount and sends cUSDC using `confidentialTransferAndCall` to `ConfidentialLending`.

```bash
npx hardhat --network sepolia task:lend
```

Notes:

- Ensure deployments exist on Sepolia (wrapper `ERC7984Mock` and `ConfidentialLending`).
- You must hold enough USDC (for wrap) and cUSDC (if directly supplying without wrapping here first).
