import { CHAIN, contracts } from "./contracts";
import cUSDC from "./abis/ERC7984Mock.json" assert { type: "json" };
import ConfidentialLending from "./abis/ConfidentialLending.json" assert { type: "json" };
import ConfidentialSwap from "./abis/ConfidentialSwap.json" assert { type: "json" };

export const PROTOCOL = {
  chainId: CHAIN.sepolia,
  address: {
    // Tokens
    USDC: contracts.USDC[CHAIN.sepolia] as `0x${string}`,
    cUSDC: contracts.cUSDC[CHAIN.sepolia] as `0x${string}`,

    // Uniswap specific tokens (note different USDC addresses)
    UniswapUSDC: contracts.Uniswap.USDC[CHAIN.sepolia] as `0x${string}`,
    UniswapUNI: contracts.Uniswap.UNI[CHAIN.sepolia] as `0x${string}`,

    // Confidential versions of Uniswap tokens (note these are different from the protocol's cUSDC)
    UniswapCUsdc: contracts.Uniswap.cUSDC[CHAIN.sepolia] as `0x${string}`,
    UniswapCUni: contracts.Uniswap.cUNI[CHAIN.sepolia] as `0x${string}`,

    // Protocol
    ConfidentialSwap: contracts.ConfidentialSwap[CHAIN.sepolia] as `0x${string}`,
    
    ConfidentialLending: contracts.ConfidentialLending[CHAIN.sepolia] as `0x${string}`,
    AAVEPool: contracts.AAVEPool[CHAIN.sepolia] as `0x${string}`,

    UNISWAP_QUOTER: {
      [CHAIN.sepolia]: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227" as `0x${string}`,
    },
  },
  abi: {
    cToken: cUSDC.abi,
    ConfidentialLending: ConfidentialLending.abi,
    ConfidentialSwap: ConfidentialSwap.abi,
  },
  decimals: {
    USDC: 6,
    cUSDC: 6,
  }
} as const;

export type ContractKey = keyof typeof PROTOCOL.address;