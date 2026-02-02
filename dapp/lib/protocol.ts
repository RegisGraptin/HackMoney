import { CHAIN, contracts } from "./contracts";
import cUSDC from "./abis/ERC7984Mock.json" assert { type: "json" };

export const PROTOCOL = {
  chainId: CHAIN.sepolia,
  address: {
    USDC: contracts.USDC[CHAIN.sepolia] as `0x${string}`,
    cUSDC: contracts.cUSDC[CHAIN.sepolia] as `0x${string}`,
    ConfidentialLending: contracts.ConfidentialLending[CHAIN.sepolia] as `0x${string}`,
    AAVEPool: contracts.AAVEPool[CHAIN.sepolia] as `0x${string}`
  },
  abi: {
    cUSDC: cUSDC.abi,
  },
  decimals: {
    USDC: 6,
    cUSDC: 6,
  }
} as const;

export type ContractKey = keyof typeof PROTOCOL.address;