import { useReadContracts } from "wagmi";
import { PROTOCOL } from "@/lib/protocol";
import ConfidentialSwapAbi from "@/lib/abis/ConfidentialSwap.json" assert { type: "json" };
import { Address } from "viem";

export function useConfidentialSwapStatus(userAddress?: Address) {
  // First fetch to get currentRound
  const baseContracts = [
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "currentRound",
    },
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "lastUpdateTime",
    },
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "currentNumberOfUsers",
    },
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "MIN_TIME_BETWEEN_ROUNDS",
    },
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "MIN_DISTINCT_USERS",
    },
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "nextRoundDelta",
    },
  ] as const;

  const { data: baseData, refetch: refetchBase, ...baseRest } = useReadContracts({ contracts: baseContracts });

  const currentRound = baseData?.[0]?.result as bigint | undefined;
  const lastUpdateTime = baseData?.[1]?.result as bigint | undefined;
  const currentNumberOfUsers = baseData?.[2]?.result as bigint | undefined;
  const minTimeBetweenRounds = baseData?.[3]?.result as bigint | undefined;
  const minDistinctUsers = baseData?.[4]?.result as bigint | undefined;
  const nextRoundDeltaHandle = baseData?.[5]?.result as `0x${string}` | undefined;

  // Second fetch for round-specific data
  const roundOffset = currentRound && Number(currentRound) > 0 ? BigInt(Number(currentRound) - 1) : BigInt(0);
  
  const roundContracts = [
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "totalRequestedAmount",
      args: [roundOffset],
    },
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "totalReceivedAmount",
      args: [roundOffset],
    },
    {
      address: PROTOCOL.address.ConfidentialSwap,
      abi: ConfidentialSwapAbi.abi as any,
      functionName: "userAmounts",
      args: [roundOffset, userAddress],
    }
  ] as const;

  const { data: roundData, refetch: refetchRound } = useReadContracts({ 
    contracts: roundContracts,
    query: { enabled: !!currentRound && Number(currentRound) > 0 }
  });

  const totalRequestedAmount = roundData?.[0]?.result as bigint | undefined;
  const totalReceivedAmount = roundData?.[1]?.result as bigint | undefined;
  const userAmountHandle = userAddress ? (roundData?.[2]?.result as `0x${string}` | undefined) : undefined;

  const refetch = async () => {
    await refetchBase();
    await refetchRound();
  };

  return {
    currentRound,
    lastUpdateTime,
    currentNumberOfUsers,
    minTimeBetweenRounds,
    minDistinctUsers,
    nextRoundDeltaHandle,
    totalRequestedAmount,
    totalReceivedAmount,
    userAmountHandle,
    refetch,
    ...baseRest,
  };
}
