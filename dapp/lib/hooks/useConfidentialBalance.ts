import { Address } from "viem";
import { useReadContract } from "wagmi";
import { PROTOCOL } from "../protocol";

export function useConfidentialBalance(userAddress: Address | undefined) {
  return useReadContract({
    address: PROTOCOL.address.cUSDC,
    abi: PROTOCOL.abi.cUSDC,
    functionName: "confidentialBalanceOf",
    args: [userAddress!],
    query: {
      enabled: !!userAddress,
      refetchInterval: 5000,
    },
  });

}
