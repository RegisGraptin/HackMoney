"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConnection } from "wagmi";
import { PROTOCOL } from "@/lib/protocol";
import { useConfidentialBalance } from "@/lib/hooks/useConfidentialBalance";
import { useFHEDecrypt } from "@/lib/fhevm-sdk/react";
import { GenericStringInMemoryStorage } from "@/lib/fhevm-sdk/storage/GenericStringStorage";
import { useConnectedFhevm } from "@/lib/utils/fhevm";
import { useConnectedSigner } from "@/lib/utils/useConnectedSigner";
import { ClearBalance } from "../balance/ClearBalance";
import { EncryptedBalance } from "../balance/EncryptedBalance";
import { zeroHash } from "viem";

export function SwapBalance() {
  const { address: userAddress } = useConnection();
  const { data: cUsdcEncrypted } = useConfidentialBalance(PROTOCOL.address.UniswapCUsdc, userAddress as any);
  const { data: cUniEncrypted } = useConfidentialBalance(PROTOCOL.address.UniswapCUni, userAddress as any);

  const { instance: fhevm, status: fheStatus } = useConnectedFhevm();
  const { signer } = useConnectedSigner();

  const storage = new GenericStringInMemoryStorage();
  const [cUsdcBig, setCUsdcBig] = useState<bigint | undefined>(undefined);
  const [cUniBig, setCUniBig] = useState<bigint | undefined>(undefined);

  const [revealEncrypted, setRevealEncrypted] = useState(false);
  const [revealUni, setRevealUni] = useState(false);
  
  const [lastCHandle, setLastCHandle] = useState<string | undefined>(undefined);
  const [lastUniHandle, setLastUniHandle] = useState<string | undefined>(undefined);

  const requests = [
    ...(cUsdcEncrypted && cUsdcEncrypted !== zeroHash
      ? [{ handle: cUsdcEncrypted as string, contractAddress: PROTOCOL.address.UniswapCUsdc }]
      : []),
    ...(cUniEncrypted && cUniEncrypted !== zeroHash
      ? [{ handle: cUniEncrypted as string, contractAddress: PROTOCOL.address.UniswapCUni }]
      : []),
  ];

  const { decrypt, isDecrypting, results } = useFHEDecrypt({
    instance: fhevm,
    ethersSigner: signer,
    fhevmDecryptionSignatureStorage: storage,
    chainId: PROTOCOL.chainId,
    requests,
  });

  // Handle zero hash case - automatically set to 0
  useEffect(() => {
    if (cUsdcEncrypted == zeroHash) {
      setCUsdcBig(BigInt(0));
      setRevealEncrypted(true);
      setLastCHandle(zeroHash);
    }
    if (cUniEncrypted == zeroHash) {
      setCUniBig(BigInt(0));
      setRevealUni(true);
      setLastUniHandle(zeroHash);
    }
  }, [cUsdcEncrypted, cUniEncrypted]);

  useEffect(() => {
    if (!results) return;
    const raw = results as Record<string, unknown>;
    // Process cUSDC
    if (cUsdcEncrypted && raw[cUsdcEncrypted as string] !== undefined) {
      const val = raw[cUsdcEncrypted as string];
      setCUsdcBig(val as bigint);
      setRevealEncrypted(true);
      setLastCHandle(cUsdcEncrypted as string);
    }
    // Process cUNI
    if (cUniEncrypted && raw[cUniEncrypted as string] !== undefined) {
      const val = raw[cUniEncrypted as string];
      setCUniBig(val as bigint);
      setRevealUni(true);
      setLastUniHandle(cUniEncrypted as string);
    }
  }, [results, cUsdcEncrypted, cUniEncrypted]);

  // Reset when handles change (one or both); user can click Reveal again
  useEffect(() => {
    if (cUsdcEncrypted && cUsdcEncrypted !== lastCHandle && cUsdcEncrypted !== zeroHash) {
      setRevealEncrypted(false);
      setCUsdcBig(undefined);
    }
    if (cUniEncrypted && cUniEncrypted !== lastUniHandle && cUniEncrypted !== zeroHash) {
      setRevealUni(false);
      setCUniBig(undefined);
    }
  }, [cUsdcEncrypted, cUniEncrypted, lastCHandle, lastUniHandle]);

  const hasHandles = Boolean(cUsdcEncrypted || cUniEncrypted);
  const allRevealed = (cUsdcEncrypted ? revealEncrypted : true) && (cUniEncrypted ? revealUni : true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balances</CardTitle>
        <CardDescription>
          Your on-chain balances, public and encrypted
          <br />
          <a 
            href="https://faucet.circle.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#00FF94] hover:underline"
          >
            Need testnet USDC from Circle Faucet →
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        <ClearBalance tokenName="USDC" tokenAddress={PROTOCOL.address.UniswapUSDC} />
        <ClearBalance tokenName="UNI" tokenAddress={PROTOCOL.address.UniswapUNI} />

        <EncryptedBalance tokenName="cUSDC" decryptedValue={cUsdcBig} />

        <EncryptedBalance tokenName="cUNI" decryptedValue={cUniBig} displayDecimals={6} />

      </CardContent>
      <CardFooter className="flex items-center justify-end gap-4">
        {hasHandles && !allRevealed && (
          <Button
            variant="outline"
            onClick={() => decrypt()}
            disabled={isDecrypting || !hasHandles || fheStatus !== "ready"}
          >
            <Lock className="h-4 w-4" />
            {isDecrypting ? "Revealing balances..." : "Reveal balances"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
