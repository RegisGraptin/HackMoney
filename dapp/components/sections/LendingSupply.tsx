"use client";

import { useRef, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { PROTOCOL } from "@/lib/protocol";
import { useFhevm } from "@/lib/fhevm-sdk/react";
import { useFHEEncryption, toHex } from "@/lib/fhevm-sdk/react/useFHEEncryption";
import { ethers } from "ethers";
import { useConfidentialBalance } from "@/lib/hooks/useConfidentialBalance";

type Stage = "idle" | "submitting" | "done";

export function LendingSupply() {
  const [amountRaw, setAmountRaw] = useState("");
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");

  const { address: userAddress } = useConnection();
  const { refetch: refetchConfidentialBalance } = useConfidentialBalance(
    PROTOCOL.address.ConfidentialLending,
    userAddress as any
  );
  const publicClient = usePublicClient();
  const { mutateAsync } = useWriteContract();

  const { instance: fhevm } = useFhevm({
    provider: typeof window !== "undefined" ? (window as any).ethereum : undefined,
    chainId: PROTOCOL.chainId,
  });
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  if (typeof window !== "undefined" && !signer && (window as any).ethereum) {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    provider.getSigner().then(setSigner).catch(() => {});
  }

  const encCUSDCToken = useFHEEncryption({
    instance: fhevm,
    ethersSigner: signer,
    contractAddress: PROTOCOL.address.cUSDC,
  });

  const normalizeAmountInput = (v: string) => {
    const decimals = PROTOCOL.decimals.cUSDC ?? 6;
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

  const onSubmit = async () => {
    try {
      if (!amountRaw || !userAddress) return;
      setIsSubmitting(true);
      setStage("submitting");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const decimals = PROTOCOL.decimals.cUSDC ?? 6;
      let s = amountRaw.trim();
      if (s.endsWith(".")) s = s.slice(0, -1);
      const amount = parseUnits(s || "0", decimals);

      const enc = await encCUSDCToken.encryptWith((b) => b.add64(amount as unknown as bigint));
      if (!enc) throw new Error("Encryption failed for cUSDC");

      const txHash = await mutateAsync({
        address: PROTOCOL.address.cUSDC,
        abi: PROTOCOL.abi.cUSDC as any,
        functionName: "confidentialTransferAndCall",
        args: [
          PROTOCOL.address.ConfidentialLending,
          toHex(enc.handles[0]),
          toHex(enc.inputProof),
          "0x",
        ],
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });

      setStage("done");
      setAmountRaw("");
      refetchConfidentialBalance();
    } catch (e) {
      console.error("Supply action failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Amount to Supply</p>
      </div>
      <div
        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-300 cursor-text"
        onClick={() => amountInputRef.current?.focus()}
      >
        <div className="flex flex-1 items-center min-w-0 justify-end gap-2">
          <Input
            placeholder="0.00"
            value={prettyAmount(amountRaw)}
            onChange={(event) => {
              setStage("idle");
              setAmountRaw(normalizeAmountInput(event.target.value));
            }}
            inputMode="decimal"
            ref={amountInputRef}
            aria-label="Amount to supply"
            className="h-10 w-full flex-1 min-w-0 border-none bg-transparent p-0 text-2xl leading-none font-mono text-white text-right shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Badge className="border-[#00FF94]/40 bg-[#00FF94]/10 text-[#00FF94]">cUSDC</Badge>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#00FF94]/20 bg-[#00FF94]/5 p-4 text-sm text-zinc-300">
        <p className="text-[#00FF94]">Supply Progress</p>
        <div className="mt-3 space-y-2">
          {[{ key: "submit", label: "Submit supply intent" }].map((step) => {
            const isDone = stage === "done";
            const isActive = stage === "submitting";
            return (
              <div key={step.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <span>{step.label}</span>
                {isDone ? (
                  <CheckCircle className="h-4 w-4 text-[#00FF94]" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                ) : (
                  <span className="text-xs text-zinc-500">Pending</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={onSubmit} disabled={!amountRaw || !userAddress || isSubmitting}>
          {isSubmitting ? "Submitting..." : "Supply cUSDC"}
        </Button>
      </div>
    </div>
  );
}
