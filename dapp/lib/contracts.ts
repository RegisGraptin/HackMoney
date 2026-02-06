export const CHAIN = {
  sepolia: 11155111,
} as const;

export const contracts = {
  USDC: {
    [CHAIN.sepolia]: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  },
  cUSDC: {
    [CHAIN.sepolia]: "0x022521db54b0BfC74d8F76a8838a63494DD00d01",
  },
  ConfidentialLending: {
    [CHAIN.sepolia]: "0x4c6faABbDD81B1c8A8d6204BA3A511467e081205",
  },
  ConfidentialSwap: {
    [CHAIN.sepolia]: "0x8c4fc00C69EBaE258f394bd7c7788Db6F2761E63",
  },
  AAVEPool: {
    [CHAIN.sepolia]: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  },
  Uniswap: {
    // Clear version
    USDC: {
      [CHAIN.sepolia]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    },
    UNI: {
      [CHAIN.sepolia]: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    },
    // Confidential version
    cUSDC: {
      [CHAIN.sepolia]: "0xb5a33983Abe09102D006b00d7bd7B424c038f809",
    },
    cUNI: {
      [CHAIN.sepolia]: "0xd190201eEEdcDFeCD1AC53c8E5f3B26ff0b2bB3B",
    },
  },
} as const;
