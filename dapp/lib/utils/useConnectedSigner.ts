"use client";

import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import { ethers } from "ethers";

export type UseConnectedSignerResult = {
  signer: ethers.JsonRpcSigner | undefined;
  isReady: boolean;
};

/**
 * useConnectedSigner
 * Returns an ethers signer only after the wallet is connected.
 * Prevents MetaMask popups by avoiding any provider requests when disconnected.
 */
export function useConnectedSigner(): UseConnectedSignerResult {
  const { isConnected } = useConnection();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!isConnected || typeof window === "undefined") {
      setSigner(undefined);
      return () => {
        cancelled = true;
      };
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setSigner(undefined);
      return () => {
        cancelled = true;
      };
    }

    const provider = new ethers.BrowserProvider(ethereum);
    provider
      .getSigner()
      .then((s) => {
        if (!cancelled) setSigner(s);
      })
      .catch(() => {
        if (!cancelled) setSigner(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected]);

  return { signer, isReady: Boolean(isConnected && signer) };
}
