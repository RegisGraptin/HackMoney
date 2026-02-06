"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shielding } from "@/components/sections/Shielding";
import { LendingDeck } from "@/components/sections/LendingDeck";
import { ProtocolStatus } from "@/components/sections/ProtocolStatus";
import { ConfidentialSwap } from "@/components/sections/ConfidentialSwap";
import { SwapBalance } from "@/components/sections/SwapBalance";
import { SwapStatus } from "@/components/sections/SwapStatus";
import { ConnectButton } from "@/components/wallet/ConnectButton";

export default function Home() {
  const [activeTab, setActiveTab] = useState("shield");

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,255,148,0.12),_transparent_55%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00FF94]/20">
              <Image src="/logo.png" alt="Cipher Lend logo" width={36} height={36} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">
                Cipher Lend
              </p>
              <h1 className="text-2xl font-semibold">Confidential DeFi Lending</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectButton />
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="shield">Shield Assets</TabsTrigger>
            <TabsTrigger value="swap">Swap</TabsTrigger>
            <TabsTrigger value="swapStatus">Swap Status</TabsTrigger>
            <TabsTrigger value="lending">Lend</TabsTrigger>
            <TabsTrigger value="portfolio">Lend Status</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="w-full">
            <AnimatePresence mode="wait">
              {activeTab === "shield" && (
                <motion.div
                  key="shield"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.4 }}
                  className=""
                >
                  <Shielding />
                </motion.div>
              )}

              {activeTab === "lending" && (
                <motion.div
                  key="lending"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.4 }}
                  className=""
                >
                  <LendingDeck />
                </motion.div>
              )}

              {activeTab === "swap" && (
                <motion.div
                  key="swap"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.4 }}
                  className=""
                >
                  <ConfidentialSwap />
                </motion.div>
              )}

              {activeTab === "swapStatus" && (
                <motion.div
                  key="swapStatus"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.4 }}
                  className=""
                >
                  <SwapStatus />
                </motion.div>
              )}

              {activeTab === "portfolio" && (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.4 }}
                  className=""
                >
                  <ProtocolStatus />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full">
            <SwapBalance />
          </div>
        </div>
      </div>
    </div>
  );
}
