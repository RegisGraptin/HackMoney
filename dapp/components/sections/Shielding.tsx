"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Shield, CircleDollarSign, CheckCircle, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { parseUnits, erc20Abi } from "viem";
import { PROTOCOL } from "@/lib/protocol";
import { useBalance } from "@/lib/hooks/useTokenBalance";
import { useConfidentialBalance } from "@/lib/hooks/useConfidentialBalance";
import { ethers } from "ethers";
import { formatUnits } from "viem";
import { formatAmount } from "@/lib/utils";
import { Balance } from "./Balance";

export function Shielding() {
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [swapAmountRaw, setSwapAmountRaw] = useState("");
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const [shieldStage, setShieldStage] = useState<"idle" | "approving" | "wrapping" | "done">("idle");
  const { address: userAddress } = useConnection();
  const publicClient = usePublicClient();
  const { mutateAsync } = useWriteContract();
  
  const { data: usdcRaw } = useBalance(PROTOCOL.address.USDC, userAddress);
  const { refetch: refetchConfidentialBalance } = useConfidentialBalance(PROTOCOL.address.cUSDC, userAddress as any);

  const handleShield = async () => {
    try {
      if (!userAddress) return;
      let amountStr = swapAmountRaw.trim();
      if (amountStr.endsWith(".")) amountStr = amountStr.slice(0, -1);
      if (!amountStr || Number(amountStr) <= 0) return;

      setPrivacyLoading(true);
      const amount = parseUnits(amountStr, PROTOCOL.decimals.USDC);
      
      // Check existing allowance; skip approval if sufficient
      const allowance = await publicClient!.readContract({
        address: PROTOCOL.address.USDC,
        abi: erc20Abi,
        functionName: "allowance",
        args: [userAddress as any, PROTOCOL.address.cUSDC]
      }) as bigint;

      if (allowance < amount) {
        setShieldStage("approving");
        const approveHash = await mutateAsync({
          address: PROTOCOL.address.USDC,
          abi: erc20Abi,
          functionName: "approve",
          args: [PROTOCOL.address.cUSDC, amount]
        });
        await publicClient!.waitForTransactionReceipt({ hash: approveHash });
      }

      setShieldStage("wrapping");
      const wrapHash = await mutateAsync({
        address: PROTOCOL.address.cUSDC,
        abi: PROTOCOL.abi.cUSDC as any,
        functionName: "wrap",
        args: [userAddress, amount]
      });
      await publicClient!.waitForTransactionReceipt({ hash: wrapHash });

      // Refresh encrypted cUSDC balance
      refetchConfidentialBalance();

      setShieldStage("done");
      setSwapAmountRaw("");
    } catch (err) {
      console.error("Shield failed:", err);
    } finally {
      setPrivacyLoading(false);
    }
  };

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

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle>Shield Assets</CardTitle>
          <CardDescription>
            Shield USDC into cUSDC for confidential transfers using FHE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Amount to Shield
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  const base = usdcRaw ? formatUnits(usdcRaw as bigint, PROTOCOL.decimals.USDC) : "";
                  setSwapAmountRaw(base);
                }}
              >
                Max
              </Button>
            </div>
            <div
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-300 cursor-text"
              onClick={() => amountInputRef.current?.focus()}
            >
              <div className="flex items-center gap-2">
                <img src="/usdc.svg" alt="USDC" className="h-5 w-5" />
              </div>
              <div className="flex flex-1 items-center min-w-0 justify-end gap-2">
                <Input
                  placeholder="0.00"
                  value={prettyAmount(swapAmountRaw)}
                  onChange={(event) => {
                    setShieldStage("idle");
                    setSwapAmountRaw(normalizeAmountInput(event.target.value));
                  }}
                  inputMode="decimal"
                  ref={amountInputRef}
                  aria-label="Amount to shield"
                  className="h-10 w-full flex-1 min-w-0 border-none bg-transparent p-0 text-2xl leading-none font-mono text-white text-right shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Badge className="border-[#2775CA]/40 bg-[#2775CA]/10 text-[#2775CA]">USDC</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-300">
            <span className="text-zinc-400">You will receive</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono text-[#00FF94]">{formatAmount(swapAmountRaw || "0")}</span>
              <Badge className="border-[#00FF94]/40 bg-[#00FF94]/10 text-[#00FF94] px-3">cUSDC</Badge>
            </div>
          </div>
          <div className="rounded-2xl border border-[#00FF94]/20 bg-[#00FF94]/5 p-4 text-sm text-zinc-300">
            <p className="flex items-center gap-2 text-[#00FF94]">
              <Shield className="h-4 w-4" />
              Shielding Progress
            </p>
            <div className="mt-3 space-y-2">
              {[
                { key: "approving", label: "Approve USDC", icon: <CircleDollarSign className="h-4 w-4" /> },
                { key: "wrapping", label: "Shield to cUSDC", icon: <Shield className="h-4 w-4" /> },
              ].map((step) => {
                const currentOrder = { idle: -1, approving: 0, wrapping: 1, done: 2 } as const;
                const statusOrder = currentOrder[shieldStage];
                const stepOrder = currentOrder[step.key as keyof typeof currentOrder];
                const isDone = statusOrder > stepOrder;
                const isActive = statusOrder === stepOrder && privacyLoading;
                return (
                  <div key={step.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      {step.icon}
                      <span>{step.label}</span>
                    </div>
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
        </CardContent>
        <CardFooter className="flex items-center justify-end">
          <Button onClick={handleShield} disabled={!swapAmountRaw || !userAddress || privacyLoading}>
            {privacyLoading ? "Shielding..." : "Shield USDC"}
          </Button>
        </CardFooter>
      </Card>

      <Balance />
    </div>
  );
}
