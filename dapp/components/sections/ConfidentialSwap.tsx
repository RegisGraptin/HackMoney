"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
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
import { Balance } from "./Balance";
import { ProtocolStatus } from "./ProtocolStatus";

export function ConfidentialSwap() {
  const [swapAmount, setSwapAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwap = async () => {
    try {
      setIsSwapping(true);
      // TODO: Implement confidential swap logic
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Swap failed:", error);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <Badge variant="outline" className="border-[#00FF94]/30 text-[#00FF94]">
                Private
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">From</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" className="w-32">
                    cUSDC
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="rounded-full bg-zinc-800 p-2">
                  <ArrowRight className="h-4 w-4 text-zinc-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">To (estimated)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={swapAmount}
                    disabled
                    className="flex-1"
                  />
                  <Button variant="outline" className="w-32">
                    cUNI
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Privacy Level</span>
                <span className="text-[#00FF94]">Fully Encrypted</span>
              </div>
            </div>

            <Button
              onClick={handleSwap}
              disabled={!swapAmount || Number(swapAmount) <= 0 || isSwapping}
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

      {/* Right Column - Balance & Protocol Status */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-6"
      >
        <SwapBalance />
      </motion.div>
    </div>
  );
}
