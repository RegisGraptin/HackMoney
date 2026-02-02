"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, CheckCircle, Loader2 } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConnection, usePublicClient, useWriteContract, useReadContract } from "wagmi";
import { formatUnits, parseUnits } from "viem";

import { PROTOCOL } from "@/lib/protocol";
import { useFHEDecrypt, useFhevm } from "@/lib/fhevm-sdk/react";
import { useFHEEncryption, toHex } from "@/lib/fhevm-sdk/react/useFHEEncryption";
import { GenericStringInMemoryStorage } from "@/lib/fhevm-sdk/storage/GenericStringStorage";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { formatAmount } from "@/lib/utils";
import ConfidentialLendingABI from "@/lib/abis/ConfidentialLending.json" assert { type: "json" };

export function LendingDeck() {
  const [activeTab, setActiveTab] = useState<"supply" | "withdraw">("supply");
  const [amountRaw, setAmountRaw] = useState("");
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const { address: userAddress } = useConnection();

  // Encrypted lending token balance + reveal (from ConfidentialLending)
  const { data: lendingEncryptedHandle, refetch } = useReadContract({
    address: PROTOCOL.address.ConfidentialLending,
    abi: ConfidentialLendingABI.abi as any,
    functionName: "confidentialBalanceOf",
    args: [userAddress as any],
    query: { enabled: !!userAddress, refetchInterval: 5000 },
  });
  const [cUsdcDecrypted, setCUsdcDecrypted] = useState<string>("");
  const [revealEncrypted, setRevealEncrypted] = useState(false);

  const { instance: fhevm, status: fheStatus } = useFhevm({
    provider: typeof window !== "undefined" ? (window as any).ethereum : undefined,
    chainId: PROTOCOL.chainId,
  });
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  const storage = new GenericStringInMemoryStorage();

  if (typeof window !== "undefined" && !signer && (window as any).ethereum) {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    provider.getSigner().then(setSigner).catch(() => {});
  }

  const requests = lendingEncryptedHandle
    ? [{ handle: lendingEncryptedHandle as string, contractAddress: PROTOCOL.address.ConfidentialLending }]
    : [];

  const { decrypt, isDecrypting, results } = useFHEDecrypt({
    instance: fhevm,
    ethersSigner: signer,
    fhevmDecryptionSignatureStorage: storage,
    chainId: PROTOCOL.chainId,
    requests,
  });

  useEffect(() => {
    if (!lendingEncryptedHandle) return;
    const raw = (results as Record<string, unknown>)[lendingEncryptedHandle as string];
    if (raw !== undefined) {
      if (typeof raw === "bigint") {
        const base = formatUnits(raw, PROTOCOL.decimals.cUSDC);
        setCUsdcDecrypted(formatAmount(base));
      } else if (typeof raw === "string") {
        setCUsdcDecrypted(raw);
      } else if (raw !== null) {
        setCUsdcDecrypted(String(raw));
      }
      setRevealEncrypted(true);
    }
  }, [results, lendingEncryptedHandle]);

  const handleDecrypt = async () => decrypt();

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

  // Placeholder progress UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<"idle" | "submitting" | "done">("idle");

  const publicClient = usePublicClient();
  const { mutateAsync } = useWriteContract();

  // Encryption contexts
  const encCUSDCToken = useFHEEncryption({
    instance: fhevm,
    ethersSigner: signer,
    contractAddress: PROTOCOL.address.cUSDC,
  });
  const encLending = useFHEEncryption({
    instance: fhevm,
    ethersSigner: signer,
    contractAddress: PROTOCOL.address.ConfidentialLending,
  });

  const onSubmit = async () => {
    try {
      if (!amountRaw || !userAddress) return;
      setIsSubmitting(true);
      setStage("submitting");

      const decimals = PROTOCOL.decimals.cUSDC ?? 6;
      let s = amountRaw.trim();
      if (s.endsWith(".")) s = s.slice(0, -1);
      const amount = parseUnits(s || "0", decimals);

      if (activeTab === "supply") {
        // Encrypt amount for cUSDC transfer
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
      } else {
        // Withdraw: requestWithdraw on lending contract using externalEuint64
        const enc = await encLending.encryptWith((b) => b.add64(amount as unknown as bigint));
        if (!enc) throw new Error("Encryption failed for lending");

        const txHash = await mutateAsync({
          address: PROTOCOL.address.ConfidentialLending,
          abi: ConfidentialLendingABI.abi as any,
          functionName: "requestWithdraw",
          args: [toHex(enc.handles[0]), toHex(enc.inputProof)],
        });
        await publicClient!.waitForTransactionReceipt({ hash: txHash });
      }

      setStage("done");
      setAmountRaw("");
      // Refresh encrypted lending balance and reset reveal state
      await refetch();
      setRevealEncrypted(false);
      setCUsdcDecrypted("");
    } catch (e) {
      console.error("Lending action failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Lend cUSDC</CardTitle>
          <CardDescription>Supply or withdraw cUSDC liquidity privately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="supply">Supply</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            </TabsList>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-400">
              Your action is an encrypted intent. It executes next round once at least 2 distinct users participate and 2 minutes have elapsed (test settings).
            </div>

            <TabsContent value="supply">
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
              </div>

              <div className="mt-4 rounded-2xl border border-[#00FF94]/20 bg-[#00FF94]/5 p-4 text-sm text-zinc-300">
                <p className="text-[#00FF94]">Supply Progress</p>
                <div className="mt-3 space-y-2">
                  {[{ key: "submit", label: "Submit supply intent" }].map((step, idx) => {
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
            </TabsContent>

            <TabsContent value="withdraw">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Amount to Withdraw</p>
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
                      aria-label="Amount to withdraw"
                      className="h-10 w-full flex-1 min-w-0 border-none bg-transparent p-0 text-2xl leading-none font-mono text-white text-right shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Badge className="border-[#00FF94]/40 bg-[#00FF94]/10 text-[#00FF94]">cUSDC</Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-sm text-zinc-300">
                <span className="text-zinc-400">You will request</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono text-[#00FF94]">{formatAmount(amountRaw || "0")}</span>
                  <Badge className="border-[#00FF94]/40 bg-[#00FF94]/10 text-[#00FF94] px-3">cUSDC</Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-[#00FF94]/20 bg-[#00FF94]/5 p-4 text-sm text-zinc-300">
                <p className="text-[#00FF94]">Withdraw Progress</p>
                <div className="mt-3 space-y-2">
                  {[{ key: "submit", label: "Submit withdraw intent" }].map((step) => {
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
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex items-center justify-end">
          <Button onClick={onSubmit} disabled={!amountRaw || !userAddress || isSubmitting}>
            {isSubmitting ? (activeTab === "supply" ? "Submitting..." : "Submitting...") : activeTab === "supply" ? "Supply cUSDC" : "Withdraw cUSDC"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Position</CardTitle>
          <CardDescription>Encrypted cUSDC balance. Reveal on-device only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  {revealEncrypted ? cUsdcDecrypted : "✶✶✶✶✶✶✶✶"}
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
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-4">
          {!revealEncrypted && (
            <Button variant="outline" onClick={handleDecrypt} disabled={isDecrypting || !lendingEncryptedHandle || fheStatus !== "ready"}>
              <Lock className="h-4 w-4" />
              {isDecrypting ? "Revealing..." : "Reveal Balance"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
