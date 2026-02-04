"use client";

import { useMemo } from "react";
import { useConnection, useChainId } from "wagmi";
import { useFhevm } from "@/lib/fhevm-sdk/react";

/**
 * useConnectedFhevm
 * A safe wrapper around `useFhevm` that only injects the EIP-1193 provider
 * once the wallet is connected, preventing MetaMask popups on load.
 */
export function useConnectedFhevm() {
  const { isConnected } = useConnection();
  const chainId = useChainId();

  const provider = useMemo(() => {
    if (!isConnected) return undefined;
    if (typeof window === "undefined") return undefined;
    return (window as any).ethereum;
  }, [isConnected]);

  return useFhevm({
    provider,
    chainId
  });
}
