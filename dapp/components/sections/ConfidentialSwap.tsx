"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { useConnectedFhevm } from "@/lib/utils/fhevm";
import { useConnectedSigner } from "@/lib/utils/useConnectedSigner";
import { useFHEEncryption } from "@/lib/fhevm-sdk";
import { PROTOCOL } from "@/lib/protocol";
import { formatUnits, parseUnits, toHex } from "viem";
import { formatAmount } from "@/lib/utils";
import { useConfidentialBalance } from "@/lib/hooks/useConfidentialBalance";
import { useSwapQuote } from "@/lib/hooks/useSwapQuote";

export function ConfidentialSwap() {
  const [swapAmount, setSwapAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStage, setSwapStage] = useState<"idle" | "swapping" | "done">("idle");
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const { address: userAddress } = useConnection();
  const publicClient = usePublicClient();
  const { mutateAsync } = useWriteContract();
  
  const { instance: fhevm } = useConnectedFhevm();
  const { signer } = useConnectedSigner();

  // Get quote from Uniswap V4 for USDC to UNI swap
  const { amountOut: quoteAmountOut, isLoading: quoteLoading, outputDecimals } = useSwapQuote(
    swapAmount,
    PROTOCOL.address.UniswapUSDC,
    PROTOCOL.address.UniswapUNI,
    PROTOCOL.address.V4Quoter,
    PROTOCOL.decimals.USDC, // Input: USDC has 6 decimals
    PROTOCOL.decimals.UNI // Output: UNI has 18 decimals
  );

  const encCUSDCToken = useFHEEncryption({
    instance: fhevm,
    ethersSigner: signer,
    contractAddress: PROTOCOL.address.UniswapCUsdc,
  });

  const { refetch: refetchCUsdcBalance } = useConfidentialBalance(PROTOCOL.address.UniswapCUsdc, userAddress as any);
  const { refetch: refetchCUniBalance } = useConfidentialBalance(PROTOCOL.address.UniswapCUni, userAddress as any);

  const normalizeAmountInput = (v: string) => {
    const decimals = PROTOCOL.decimals.USDC ?? 6;
    let s = v.replace(/,/g, "").replace(/[^\d.]/g, "");
    const parts = s.split(".");
    const intPart = (parts[0] || "").replace(/^0+(?=\d)/, "");
    let fracPart = parts[1] || "";
    if (fracPart.length > decimals) fracPart = fracPart.slice(0, decimals);
    if (parts.length > 1) return `${intPart || "0"}.${fracPart}`;
    return intPart;
  };

  const prettyAmount = (raw: string) => {
    if (!raw) return "";
    const [i, f] = raw.split(".");
    const intNum = Number(i || "0");
    const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
      Number.isFinite(intNum) ? intNum : 0
    );
    return f !== undefined ? `${intFmt}.${f}` : intFmt;
  };
  

  const handleSwap = async () => {
    try {
      if (!userAddress) return;
      let amountStr = swapAmount.trim();
      if (amountStr.endsWith(".")) amountStr = amountStr.slice(0, -1);
      if (!amountStr || Number(amountStr) <= 0) return;

      setIsSwapping(true);
      const amount = parseUnits(amountStr, PROTOCOL.decimals.USDC);
      
      setSwapStage("swapping");
      // Waif before as we have a freezing effect due to FHE encryption 
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const enc = await encCUSDCToken.encryptWith((b) => b.add64(amount as unknown as bigint));
      if (!enc) throw new Error("Encryption failed for cUSDC");

      const txHash = await mutateAsync({
        address: PROTOCOL.address.UniswapCUsdc,
        abi: PROTOCOL.abi.cToken as any,
        functionName: "confidentialTransferAndCall",
        args: [
          PROTOCOL.address.ConfidentialSwap,
          toHex(enc.handles[0]),
          toHex(enc.inputProof),
          "0x",
        ],
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });
      
      // Refresh balances
      refetchCUsdcBalance();
      refetchCUniBalance();

      setSwapStage("done");
      setSwapAmount("");
    } catch (error) {
      console.error("Swap failed:", error);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Left Column - Swap Interface */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00FF94]/10">
                  <ArrowRight className="h-5 w-5 text-[#00FF94]" />
                </div>
                <div>
                  <CardTitle>Confidential Swap</CardTitle>
                  <CardDescription>
                    Swap cUSDC to cUNI privately
                  </CardDescription>
                </div>
              </div>
              <Badge className="border-[#00FF94]/30 text-[#00FF94]">
                Private
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Amount to Swap
                </p>
                <div
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-300 cursor-text"
                  onClick={() => amountInputRef.current?.focus()}
                >
                  <div className="flex items-center gap-2">
                    <img src="/usdc.svg" alt="cUSDC" className="h-5 w-5" />
                  </div>
                  <div className="flex flex-1 items-center min-w-0 justify-end gap-2">
                    <Input
                      placeholder="0.00"
                      value={prettyAmount(swapAmount)}
                      onChange={(event) => {
                        setSwapStage("idle");
                        setSwapAmount(normalizeAmountInput(event.target.value));
                      }}
                      inputMode="decimal"
                      ref={amountInputRef}
                      aria-label="Amount to swap"
                      className="h-10 w-full flex-1 min-w-0 border-none bg-transparent p-0 text-2xl leading-none font-mono text-white text-right shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Badge className="border-[#00FF94]/40 bg-[#00FF94]/10 text-[#00FF94]">cUSDC</Badge>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="rounded-full bg-zinc-800 p-2">
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  You will receive (estimated)
                </p>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-300">
                  <span className="text-zinc-400">{quoteLoading ? "Fetching quote..." : "Estimated output"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-mono text-[#FF6B00]">
                      {quoteAmountOut && outputDecimals
                        ? formatAmount(formatUnits(quoteAmountOut / (BigInt(10) ** BigInt(outputDecimals - 6)), 6), {
                          maximumFractionDigits: 6,
                          minimumFractionDigits: 6,
                        })
                        : "0.00"}
                    </span>
                    <Badge className="border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#FF6B00] px-3">cUNI</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#00FF94]/20 bg-[#00FF94]/5 p-4 text-sm text-zinc-300">
              <p className="flex items-center gap-2 text-[#00FF94]">
                <Shield className="h-4 w-4" />
                Swap Progress
              </p>
              <div className="mt-3 space-y-2">
                {[
                  { key: "swapping", label: "Execute Swap" },
                ].map((step) => {
                  const currentOrder = { idle: -1, swapping: 1, done: 2 } as const;
                  const statusOrder = currentOrder[swapStage];
                  const stepOrder = currentOrder[step.key as keyof typeof currentOrder];
                  const isDone = statusOrder > stepOrder;
                  const isActive = statusOrder === stepOrder && isSwapping;
                  return (
                    <div key={step.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                      <span>{step.label}</span>
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle className="h-4 w-4 text-[#00FF94]" />
                        ) : isActive ? (
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        ) : (
                          <span className="text-xs text-zinc-500">Pending</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleSwap}
              disabled={!swapAmount || !userAddress || isSwapping}
              className="w-full bg-[#00FF94] text-black hover:bg-[#00FF94]/90"
            >
              {isSwapping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Swapping...
                </>
              ) : (
                "Swap Confidentially"
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
