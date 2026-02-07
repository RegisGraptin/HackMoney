"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ArrowRightLeft, Activity, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { PROTOCOL } from "@/lib/protocol";
import { useConnectedFhevm } from "@/lib/utils/fhevm";
import { useConfidentialSwapStatus } from "@/lib/hooks/useConfidentialSwapStatus";
import ConfidentialSwapAbi from "@/lib/abis/ConfidentialSwap.json" assert { type: "json" };
import { formatUnits, parseUnits, zeroHash } from "viem";
import { useConfidentialBalance } from "@/lib/hooks/useConfidentialBalance";

export function SwapStatus() {
  const { address: userAddress } = useConnection();
  const publicClient = usePublicClient();
  const { mutateAsync } = useWriteContract();
  const { instance: fhevm } = useConnectedFhevm();
  
  const [nowTs, setNowTs] = useState<number>(Math.floor(Date.now() / 1000));
  const [isCallingNextRound, setIsCallingNextRound] = useState(false);
  const [isUnshieldingForSwap, setIsUnshieldingForSwap] = useState(false);
  const [isExecutingRound, setIsExecutingRound] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const { refetch: refetchCUniBalance } = useConfidentialBalance(PROTOCOL.address.UniswapCUni, userAddress as any);


  // Update timer every second
  useEffect(() => {
    const id = setInterval(() => setNowTs(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // Read contract state using custom hook
  const {
    currentRound,
    lastUpdateTime,
    currentNumberOfUsers,
    minTimeBetweenRounds,
    minDistinctUsers,
    roundDeltaHandle,
    totalRequestedAmount,
    totalReceivedAmount,
    userAmountHandle,
    refetch: refetchSwapStatus,
  } = useConfidentialSwapStatus(userAddress);

  // Calculate timer values
  const timeElapsed = lastUpdateTime ? Math.max(0, nowTs - Number(lastUpdateTime)) : 0;
  const timeRemaining = minTimeBetweenRounds ? Math.max(0, Number(minTimeBetweenRounds) - timeElapsed) : 0;
  const canCallNextRound = (timeRemaining === 0) && !!currentNumberOfUsers && !!minDistinctUsers && Number(currentNumberOfUsers) >= Number(minDistinctUsers);

  const usersCurrent = currentNumberOfUsers ? Number(currentNumberOfUsers) : 0;
  const usersRequired = minDistinctUsers ? Number(minDistinctUsers) : 0;
  const usersProgress = usersRequired > 0 ? Math.min(1, usersCurrent / usersRequired) : 0;

  // Check if user has an amount to withdraw
  // userAmountHandle is a bytes32 encrypted value. If it's not zero (0x0000...), user has an amount
  const hasUserAmount = userAmountHandle && userAmountHandle !== zeroHash;

  // Action handlers
  const onCallNextRound = async () => {
    try {
      setIsCallingNextRound(true);
      const txHash = await mutateAsync({
        address: PROTOCOL.address.ConfidentialSwap,
        abi: ConfidentialSwapAbi.abi as any,
        functionName: "callNextRound",
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });
      await refetchSwapStatus();
    } catch (e) {
      console.error("callNextRound failed:", e);
    } finally {
      setIsCallingNextRound(false);
    }
  };

  const onUnshieldForSwap = async () => {
    try {
      setIsUnshieldingForSwap(true);
      
      // The unwrap was already called by callNextRound in the smart contract
      // Step 1: Fetch the most recent UnwrapRequested event from recent blocks
      const latestBlock = await publicClient!.getBlockNumber();
      const fromBlock = latestBlock - BigInt(100); // Search last 1000 blocks to be safe
      
      const logs = await publicClient!.getLogs({
        address: PROTOCOL.address.UniswapCUsdc,
        event: {
          type: 'event',
          name: 'UnwrapRequested',
          inputs: [
            { type: 'address', indexed: true, name: 'receiver' },
            { type: 'bytes32', indexed: false, name: 'amount' },
          ],
        },
        args: {
          receiver: PROTOCOL.address.ConfidentialSwap,
        },
        fromBlock: fromBlock,
        toBlock: latestBlock,
      });

      if (!logs || logs.length === 0) {
        console.error("No UnwrapRequested event found for ConfidentialSwap");
        return;
      }

      // Get the most recent event's handle (sort by block number and log index to ensure we get the latest)
      const sortedLogs = [...logs].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return Number(b.blockNumber - a.blockNumber); // Most recent block first
        }
        return Number(BigInt(b.logIndex || BigInt(0)) - BigInt(a.logIndex || BigInt(0))); // Most recent log in block first
      });
      
      const mostRecentLog = sortedLogs[0];
      const handle = mostRecentLog.args.amount as `0x${string}`;
      
      console.log("Most recent UnwrapRequested handle:", handle, "from block:", mostRecentLog.blockNumber);

      // Step 2: Public decrypt the handle
      const results = await fhevm?.publicDecrypt([handle]);
      console.log("Decryption results for unwrap:", results);

      if (!results) {
        console.error("No decryption results available");
        return;
      }

      // Step 3: Call finalizeUnwrap
      const finalizeTxHash = await mutateAsync({
        address: PROTOCOL.address.UniswapCUsdc,
        abi: PROTOCOL.abi.cToken as any,
        functionName: "finalizeUnwrap",
        args: [handle, results.abiEncodedClearValues, results.decryptionProof],
      });
      await publicClient!.waitForTransactionReceipt({ hash: finalizeTxHash });
      
    } catch (e) {
      console.error("unshield for swap failed:", e);
    } finally {
      setIsUnshieldingForSwap(false);
    }
  };

  const onExecuteRound = async () => {
    try {
      setIsExecutingRound(true);
      
      // Fetch the publicly decryptable handle for the previous round
      const results = await fhevm?.publicDecrypt([roundDeltaHandle as `0x${string}`]);
      console.log("Decryption results for roundDelta:", results);

      if (!results) {
        console.error("No decryption results available");
        return;
      }

      const txHash = await mutateAsync({
        address: PROTOCOL.address.ConfidentialSwap,
        abi: ConfidentialSwapAbi.abi as any,
        functionName: "executeRound",
        args: [results.abiEncodedClearValues, results.decryptionProof],
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });
    } catch (e) {
      console.error("executeRound failed:", e);
    } finally {
      setIsExecutingRound(false);
    }
  };

  const onWithdraw = async () => {
    try {
      if (!currentRound || Number(currentRound) === 0) return;
      
      setIsWithdrawing(true);
      const roundId = BigInt(Number(currentRound) - 1);
      
      const txHash = await mutateAsync({
        address: PROTOCOL.address.ConfidentialSwap,
        abi: ConfidentialSwapAbi.abi as any,
        functionName: "withdraw",
        args: [roundId],
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });

      refetchCUniBalance();
    } catch (e) {
      console.error("withdraw failed:", e);
    } finally {
      setIsWithdrawing(false);
    }
  };


  return (
    <div className="grid gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00FF94]/10">
                  <ArrowRightLeft className="h-5 w-5 text-[#00FF94]" />
                </div>
                <div>
                  <CardTitle>Swap Protocol Status</CardTitle>
                  <CardDescription>
                    Overview of confidential swap activity
                  </CardDescription>
                </div>
              </div>
              <Badge className="border-[#00FF94]/30 text-[#00FF94]">
                Round {currentRound ? Number(currentRound) : 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Round Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Users This Round</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {usersCurrent} / {usersRequired}
                </p>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div 
                    className="h-2 rounded-full bg-[#00FF94]" 
                    style={{ width: `${Math.floor(usersProgress * 100)}%` }} 
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Time to Execution</span>
                </div>
                <p className="mt-2 text-2xl font-mono font-semibold text-white">
                  {minTimeBetweenRounds ? `${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s` : "..."}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {canCallNextRound ? "Ready to execute" : "Waiting..."}
                </p>
              </div>
            </div>

            {/* Round Execution Actions */}
            <div className="rounded-2xl border border-[#00FF94]/20 bg-[#00FF94]/5 p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-[#00FF94] mb-4">
                <ArrowRightLeft className="h-4 w-4" />
                Round Execution
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">1. Finalize Round</p>
                    <p className="text-xs text-zinc-500">Requires {usersRequired} users and {minTimeBetweenRounds ? Number(minTimeBetweenRounds) / 60 : 0} minutes</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={onCallNextRound}
                    disabled={!canCallNextRound || isCallingNextRound}
                    className="bg-[#00FF94] text-black hover:bg-[#00FF94]/90"
                  >
                    {isCallingNextRound ? "Processing..." : "Call Next Round"}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">2. Unshield cUSDC</p>
                    <p className="text-xs text-zinc-500">Unshield cUSDC to USDC for the swap execution</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onUnshieldForSwap}
                    disabled={isUnshieldingForSwap}
                  >
                    {isUnshieldingForSwap ? "Unshielding..." : "Unshield cUSDC"}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                  <div>
                    <p className="font-medium text-white">3. Execute Swap</p>
                    <p className="text-xs text-zinc-500">Decrypt and execute aggregated swap on Uniswap</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onExecuteRound}
                    disabled={!roundDeltaHandle || isExecutingRound}
                  >
                    {isExecutingRound ? "Executing..." : "Execute Round"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Swap Statistics */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400 mb-4">
                <Activity className="h-4 w-4" />
                Previous Round Results
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-xs text-zinc-500">cUSDC Swapped</p>
                  <p className="mt-1 text-lg font-mono text-white">
                    {totalRequestedAmount ? formatUnits(totalRequestedAmount, 6) : "0.00"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-xs text-zinc-500">cUNI Received</p>
                  <p className="mt-1 text-lg font-mono text-white">
                    {totalReceivedAmount ? formatUnits(totalReceivedAmount, 6) : "0.00"}
                  </p>
                </div>
              </div>
            </div>

            {/* User Withdraw */}
            <div className="rounded-2xl border border-[#FF6B00]/20 bg-[#FF6B00]/5 p-4">
              <h3 className="text-sm font-medium text-[#FF6B00] mb-3">
                Withdraw Your Share
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-300">
                    Claim your proportional cUNI from the last executed round
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onWithdraw}
                    disabled={!userAddress || !currentRound || Number(currentRound) === 0 || isWithdrawing || !hasUserAmount}
                    className="border-[#FF6B00]/40 text-[#FF6B00] hover:bg-[#FF6B00]/10"
                  >
                    {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
