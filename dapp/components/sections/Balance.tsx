"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { useBalance } from "@/lib/hooks/useTokenBalance";
import { useConfidentialBalance } from "@/lib/hooks/useConfidentialBalance";
import { useFHEDecrypt, useFhevm } from "@/lib/fhevm-sdk/react";
import { ethers } from "ethers";
import { formatUnits } from "viem";
import { formatAmount } from "@/lib/utils";
import { GenericStringInMemoryStorage } from "@/lib/fhevm-sdk/storage/GenericStringStorage";
import { useConnectedFhevm } from "@/lib/utils/fhevm";
import { useConnectedSigner } from "@/lib/utils/useConnectedSigner";

export function Balance() {
  const { address: userAddress } = useConnection();
  const { formattedAmount: usdcFormattedAmount } = useBalance(PROTOCOL.address.USDC, userAddress);
  const { data: cUsdcEncrypted } = useConfidentialBalance(PROTOCOL.address.cUSDC, userAddress as any);
  const { data: lcUsdcEncrypted } = useConfidentialBalance(PROTOCOL.address.ConfidentialLending, userAddress as any);

  const { instance: fhevm, status: fheStatus } = useConnectedFhevm();
  const { signer } = useConnectedSigner();

  const storage = new GenericStringInMemoryStorage();
  const [cUsdcBig, setCUsdcBig] = useState<bigint | undefined>(undefined);
  const [revealEncrypted, setRevealEncrypted] = useState(false);
  const encryptedPlaceholder = "✶✶✶✶✶✶✶✶";

  const [lcUsdcBig, setLcUsdcBig] = useState<bigint | undefined>(undefined);
  const [revealLending, setRevealLending] = useState(false);
  const [lastCHandle, setLastCHandle] = useState<string | undefined>(undefined);
  const [lastLHandle, setLastLHandle] = useState<string | undefined>(undefined);

  const requests = [
    ...(cUsdcEncrypted
      ? [{ handle: cUsdcEncrypted as string, contractAddress: PROTOCOL.address.cUSDC }]
      : []),
    ...(lcUsdcEncrypted
      ? [{ handle: lcUsdcEncrypted as string, contractAddress: PROTOCOL.address.ConfidentialLending }]
      : []),
  ];

  const { decrypt, isDecrypting, results } = useFHEDecrypt({
    instance: fhevm,
    ethersSigner: signer,
    fhevmDecryptionSignatureStorage: storage,
    chainId: PROTOCOL.chainId,
    requests,
  });

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
    // Process lcUSDC
    if (lcUsdcEncrypted && raw[lcUsdcEncrypted as string] !== undefined) {
      const val = raw[lcUsdcEncrypted as string];
      setLcUsdcBig(val as bigint);
      setRevealLending(true);
      setLastLHandle(lcUsdcEncrypted as string);
    }
  }, [results, cUsdcEncrypted, lcUsdcEncrypted]);

  // Reset when handles change (one or both); user can click Reveal again
  useEffect(() => {
    if (cUsdcEncrypted && cUsdcEncrypted !== lastCHandle) {
      setRevealEncrypted(false);
      setCUsdcBig(undefined);
    }
    if (lcUsdcEncrypted && lcUsdcEncrypted !== lastLHandle) {
      setRevealLending(false);
      setLcUsdcBig(undefined);
    }
  }, [cUsdcEncrypted, lcUsdcEncrypted, lastCHandle, lastLHandle]);

  const hasHandles = Boolean(cUsdcEncrypted || lcUsdcEncrypted);
  const allRevealed = (cUsdcEncrypted ? revealEncrypted : true) && (lcUsdcEncrypted ? revealLending : true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balances</CardTitle>
        <CardDescription>
          Public USDC vs encrypted cUSDC inside privacy vaults.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <img src="/usdc.svg" alt="USDC" className="h-5 w-5" />
            USDC Balance
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-3xl font-mono font-semibold text-white">{usdcFormattedAmount || "0.0"}</p>
            <Badge className="border-[#2775CA]/40 bg-[#2775CA]/10 text-[#2775CA]">USDC</Badge>
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <Lock className="h-4 w-4" />
            Encrypted cUSDC
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="relative overflow-hidden rounded-xl">
              <motion.p
                className="relative z-10 font-mono text-3xl font-semibold text-[#00FF94]"
                animate={{ filter: revealEncrypted ? "blur(0px)" : "blur(8px)", opacity: revealEncrypted ? 1 : 0.8 }}
                transition={{ duration: 0.4 }}
              >
                {revealEncrypted && cUsdcBig !== undefined
                  ? formatAmount(formatUnits(cUsdcBig, PROTOCOL.decimals.cUSDC))
                  : encryptedPlaceholder}
              </motion.p>
              {!revealEncrypted && (
                <motion.div
                  className="absolute inset-0"
                  animate={{ opacity: [0.24, 0.36, 0.28, 0.4, 0.3] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 20%, rgba(0,255,148,0.08), transparent 35%), radial-gradient(circle at 80% 60%, rgba(0,255,148,0.06), transparent 45%), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 4px)",
                  }}
                />
              )}
            </div>
            <Badge>cUSDC</Badge>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {revealEncrypted ? "Decrypted" : "Encrypted • Privacy Mask Active"}
            </p>
          </div>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <Lock className="h-4 w-4" />
            Encrypted lcUSDC (Lending)
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="relative overflow-hidden rounded-xl">
              <motion.p
                className="relative z-10 font-mono text-3xl font-semibold text-[#00FF94]"
                animate={{ filter: revealLending ? "blur(0px)" : "blur(8px)", opacity: revealLending ? 1 : 0.8 }}
                transition={{ duration: 0.4 }}
              >
                {revealLending && lcUsdcBig !== undefined
                  ? formatAmount(formatUnits(lcUsdcBig, PROTOCOL.decimals.cUSDC))
                  : encryptedPlaceholder}
              </motion.p>
              {!revealLending && (
                <motion.div
                  className="absolute inset-0"
                  animate={{ opacity: [0.24, 0.36, 0.28, 0.4, 0.3] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 20%, rgba(0,255,148,0.08), transparent 35%), radial-gradient(circle at 80% 60%, rgba(0,255,148,0.06), transparent 45%), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 4px)",
                  }}
                />
              )}
            </div>
            <Badge>lcUSDC</Badge>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {revealLending ? "Decrypted" : "Encrypted • Privacy Mask Active"}
            </p>
          </div>
        </div>
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
