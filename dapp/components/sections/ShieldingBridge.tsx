"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Lock, CircleDollarSign } from "lucide-react";
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

export function ShieldingBridge() {
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [swapAmount, setSwapAmount] = useState("");
  const [revealEncrypted, setRevealEncrypted] = useState(false);
  const usdcBalance = "1,234.56";
  const cUsdcDecrypted = "1,234.56";
  const encryptedPlaceholder = "✶✶✶✶✶✶✶✶";

  const handleSwap = () => {
    if (!swapAmount) return;
    setPrivacyLoading(true);
    setTimeout(() => {
      setPrivacyLoading(false);
      setSwapAmount("");
    }, 2200);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle>The Shielding Bridge</CardTitle>
          <CardDescription>
            Wrap public tokens into FHE-encrypted cTokens for private operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Public Token Amount
            </p>
            <Input
              placeholder="Enter amount to shield"
              value={swapAmount}
              onChange={(event) => setSwapAmount(event.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-300">
            <span>Output</span>
            <span className="text-[#00FF94]">{swapAmount || "0.0"} cTokens</span>
          </div>
          <div className="rounded-2xl border border-[#00FF94]/20 bg-[#00FF94]/5 p-4 text-sm text-zinc-300">
            <p className="flex items-center gap-2 text-[#00FF94]">
              <Shield className="h-4 w-4" />
              Privacy Loading Channel
            </p>
            <div className="mt-3 flex items-center gap-3">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-2 w-2 rounded-full bg-[#00FF94]"
                  animate={{
                    opacity: privacyLoading ? [0.2, 1, 0.2] : 0.3,
                    scale: privacyLoading ? [0.9, 1.2, 0.9] : 1,
                  }}
                  transition={{
                    duration: 0.9,
                    repeat: privacyLoading ? Infinity : 0,
                    delay: dot * 0.2,
                  }}
                />
              ))}
              <span className="text-xs text-zinc-400">
                {privacyLoading ? "Privacy Loading..." : "Idle"}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-4">
          <Button variant="outline">View Bridge Params</Button>
          <Button onClick={handleSwap}>
            {privacyLoading ? "Shielding" : "Swap to cTokens"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Balances</CardTitle>
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
              <p className="text-3xl font-semibold text-white">{usdcBalance}</p>
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
                  {revealEncrypted ? cUsdcDecrypted : encryptedPlaceholder}
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
              {!revealEncrypted && <Badge>Encrypted</Badge>}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-4">
          {!revealEncrypted && (
            <Button variant="outline" onClick={() => setRevealEncrypted(true)}>
              <Lock className="h-4 w-4" />
              Decrypt
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
