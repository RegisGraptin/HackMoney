"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Balance } from "./Balance";
import { LendingSupply } from "./LendingSupply";
import { LendingWithdraw } from "./LendingWithdraw";

export function LendingDeck() {
  const [activeTab, setActiveTab] = useState<"supply" | "withdraw">("supply");

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
              <LendingSupply />
            </TabsContent>

            <TabsContent value="withdraw">
              <LendingWithdraw />
            </TabsContent>
          </Tabs>
        </CardContent>
        
      </Card>

      <Balance />
    </div>
  );
}
