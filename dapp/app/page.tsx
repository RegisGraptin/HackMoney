"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Shield, Zap } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$@%";

const generateRandomString = (length: number) =>
  Array.from({ length })
    .map(() => randomChars[Math.floor(Math.random() * randomChars.length)])
    .join("");

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("shield");
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [swapAmount, setSwapAmount] = useState("");
  const [roundSeconds, setRoundSeconds] = useState(11 * 60 + 21);
  const [mode, setMode] = useState<"supply" | "withdraw">("supply");
  const [commitValue, setCommitValue] = useState("");
  const [encryptedValue, setEncryptedValue] = useState("-");
  const [encrypting, setEncrypting] = useState(false);
  const [revealBalance, setRevealBalance] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRoundSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const roundStatus = useMemo(() => {
    return roundSeconds === 0 ? "Rolling new round..." : "Round #42";
  }, [roundSeconds]);

  const handleSwap = () => {
    if (!swapAmount) return;
    setPrivacyLoading(true);
    setTimeout(() => {
      setPrivacyLoading(false);
      setSwapAmount("");
    }, 2200);
  };

  const handleCommit = () => {
    if (!commitValue) return;
    setEncrypting(true);
    let ticks = 0;
    const targetLength = Math.max(commitValue.length, 6);
    const interval = setInterval(() => {
      ticks += 1;
      setEncryptedValue(generateRandomString(targetLength));
      if (ticks > 16) {
        clearInterval(interval);
        setEncryptedValue(generateRandomString(targetLength));
        setEncrypting(false);
      }
    }, 70);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,255,148,0.12),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00FF94]/30 bg-[#00FF94]/10">
              <Shield className="h-5 w-5 text-[#00FF94]" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
                CipherAave
              </p>
              <h1 className="text-2xl font-semibold">Cyber-Noir Privacy Suite</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* <Button className="shadow-[0_0_25px_rgba(0,255,148,0.35)]">
              <Zap className="h-4 w-4" />
              Connect Wallet
            </Button> */}
            <appkit-button />
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="shield">Shielding Bridge</TabsTrigger>
            <TabsTrigger value="lending">Command Deck</TabsTrigger>
            <TabsTrigger value="portfolio">Private Portfolio</TabsTrigger>
          </TabsList>
        </Tabs>

        <AnimatePresence mode="wait">
          {activeTab === "shield" && (
            <motion.div
              key="shield"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4 }}
              className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <Card className="relative overflow-hidden">
                <CardHeader>
                  <CardTitle>The Shielding Bridge</CardTitle>
                  <CardDescription>
                    Wrap public tokens into FHE-encrypted cTokens for private
                    operations.
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
                    <span className="text-[#00FF94]">
                      {swapAmount || "0.0"} cTokens
                    </span>
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
                  <CardTitle>Zero-Knowledge Transport</CardTitle>
                  <CardDescription>
                    Batch routing through encrypted relays to mask liquidity
                    origin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Active Relays
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">7</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Obfuscation Layer
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      Noise entropy synced across 42 validator shards.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "lending" && (
            <motion.div
              key="lending"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4 }}
              className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Lending Command Deck</CardTitle>
                  <CardDescription>
                    Launch shielded lending intents inside the current privacy
                    round.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                        Current Round
                      </p>
                      <p className="text-2xl font-semibold text-white">
                        {roundStatus}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#00FF94]/25 bg-[#00FF94]/10 px-4 py-2 text-sm text-[#00FF94]">
                      Countdown {formatTime(roundSeconds)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                        Supply / Withdraw
                      </p>
                      <p className="text-sm text-zinc-300">
                        Mode: {mode === "supply" ? "Supplying" : "Withdrawing"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span
                        className={
                          mode === "supply" ? "text-[#00FF94]" : "text-zinc-500"
                        }
                      >
                        Supply
                      </span>
                      <Switch
                        checked={mode === "withdraw"}
                        onCheckedChange={(checked) =>
                          setMode(checked ? "withdraw" : "supply")
                        }
                      />
                      <span
                        className={
                          mode === "withdraw"
                            ? "text-[#00FF94]"
                            : "text-zinc-500"
                        }
                      >
                        Withdraw
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                        Batch Status
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-zinc-300">
                        <p>Encrypted Commits: 14</p>
                        <p>
                          Total Round TVL: <span className="text-[#00FF94]">[REDACTED]</span>
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                        Encrypted Signal
                      </p>
                      <p className="mt-3 font-mono text-lg text-[#00FF94]">
                        {encryptedValue}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {encrypting ? "FHE morphing in progress" : "Awaiting commit"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Commit Value
                    </p>
                    <Input
                      placeholder="Amount for encrypted batch"
                      value={commitValue}
                      onChange={(event) => setCommitValue(event.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-4">
                  <Button variant="ghost">Simulate Route</Button>
                  <Button onClick={handleCommit}>
                    <Zap className="h-4 w-4" />
                    Commit
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Encrypted Telemetry</CardTitle>
                  <CardDescription>
                    Your intent stays encrypted until the round closes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Sync Latency
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-white">0.82s</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Attestation
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      Commitment hashed into round ledger.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "portfolio" && (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4 }}
              className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Private Portfolio</CardTitle>
                  <CardDescription>
                    View-key secured balances routed through FHE shields.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      View Key
                    </p>
                    <p className="mt-2 font-mono text-sm text-zinc-300">
                      {revealBalance ? "VK-7X9A-0D4F-52E9" : "•••• •••• •••• ••••"}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-[#00FF94]/25 bg-[#00FF94]/5 p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Private Interest Earned (Aave)
                    </p>
                    <motion.div
                      className="mt-4 text-4xl font-semibold text-white"
                      animate={{
                        filter: revealBalance ? "blur(0px)" : "blur(10px)",
                        opacity: revealBalance ? 1 : 0.6,
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      Ξ 0.7421
                    </motion.div>
                    <p className="mt-3 text-sm text-zinc-400">
                      Shielded yield streamed through privacy vaults.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between gap-4">
                  <Button variant="ghost">Rotate View Key</Button>
                  <Button onClick={() => setRevealBalance((prev) => !prev)}>
                    <Lock className="h-4 w-4" />
                    {revealBalance ? "Hide Balance" : "Reveal My Balance"}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stealth Signals</CardTitle>
                  <CardDescription>
                    Private performance feed masked behind the view key.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Risk Tier
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">Phantom</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Privacy Score
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      98% shielded coverage across positions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
