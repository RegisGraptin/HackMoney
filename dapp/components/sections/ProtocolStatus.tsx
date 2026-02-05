"use client";

import { useEffect, useState } from "react";
import { Address, erc20Abi, formatUnits, encodeAbiParameters, parseAbiParameters } from "viem";
import { usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { useFHEPublicDecrypt } from "@/lib/fhevm-sdk/react";
import { useConnectedFhevm } from "@/lib/utils/fhevm";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROTOCOL } from "@/lib/protocol";
import { formatAmount } from "@/lib/utils";
import AaveAdapter from "@/lib/abis/AaveAdapter.json" assert { type: "json" };
import { useBalance } from "@/lib/hooks/useTokenBalance";

export function ProtocolStatus() {
  const publicClient = usePublicClient();
  const { mutateAsync } = useWriteContract();
  
  // FHE public decryption setup
  const { instance: fhevm } = useConnectedFhevm();

  // ===== Protocol status reads =====
  const { data: currentRound } = useReadContract({
    address: PROTOCOL.address.ConfidentialLending,
    abi: PROTOCOL.abi.ConfidentialLending,
    functionName: "currentRound",
  });

  const { data: lastUpdateTime } = useReadContract({
    address: PROTOCOL.address.ConfidentialLending,
    abi: PROTOCOL.abi.ConfidentialLending,
    functionName: "lastUpdateTime",
  });

  const { data: currentNumberOfUsers } = useReadContract({
    address: PROTOCOL.address.ConfidentialLending,
    abi: PROTOCOL.abi.ConfidentialLending,
    functionName: "currentNumberOfUsers",
  });

  const { data: minTimeBetweenRounds } = useReadContract({
    address: PROTOCOL.address.ConfidentialLending,
    abi: PROTOCOL.abi.ConfidentialLending,
    functionName: "MIN_TIME_BETWEEN_ROUNDS",
  });

  const { data: minDistinctUsers } = useReadContract({
    address: PROTOCOL.address.ConfidentialLending,
    abi: PROTOCOL.abi.ConfidentialLending,
    functionName: "MIN_DISTINCT_USERS",
  });

  // Read nextRoundDelta (encrypted handle)
  const { data: nextRoundDeltaHandle } = useReadContract({
    address: PROTOCOL.address.ConfidentialLending,
    abi: PROTOCOL.abi.ConfidentialLending,
    functionName: "nextRoundDelta",
  });


  const [nowTs, setNowTs] = useState<number>(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNowTs(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const timeElapsed = lastUpdateTime ? Math.max(0, nowTs - Number(lastUpdateTime)) : 0;
  const timeRemaining = minTimeBetweenRounds ? Math.max(0, Number(minTimeBetweenRounds) - timeElapsed) : 0;
  const canCallNextRound = (timeRemaining === 0) && !!currentNumberOfUsers && !!minDistinctUsers && Number(currentNumberOfUsers) >= Number(minDistinctUsers);

  const usersCurrent = currentNumberOfUsers ? Number(currentNumberOfUsers) : 0;
  const usersRequired = minDistinctUsers ? Number(minDistinctUsers) : 0;
  const usersProgress = usersRequired > 0 ? Math.min(1, usersCurrent / usersRequired) : 0;

  // Previous rounds positions (last up to 10)
  const roundsCount = currentRound ? Math.max(0, Number(currentRound) - 1) : 0;
  const maxRoundsToShow = 10;
  const roundsToFetch = Array.from({ length: Math.min(maxRoundsToShow, roundsCount) }, (_, i) => BigInt(roundsCount - i));

  const positionsReads = useReadContracts({
    contracts: roundsToFetch.map((r) => ({
      address: PROTOCOL.address.ConfidentialLending,
      abi: PROTOCOL.abi.ConfidentialLending as any,
      functionName: "positions",
      args: [r],
    })),
  });

  // Actions: callNextRound / executeRound / finalizeSupply
  const onCallNextRound = async () => {
    try {
      const txHash = await mutateAsync({
        address: PROTOCOL.address.ConfidentialLending,
        abi: PROTOCOL.abi.ConfidentialLending,
        functionName: "callNextRound",
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });
    } catch (e) {
      console.error("callNextRound failed:", e);
    }
  };

  const onExecuteRound = async () => {
    try {
      
      const results = await fhevm?.publicDecrypt([nextRoundDeltaHandle as `0x${string}`])
      console.log("Decryption results for nextRoundDelta:", results);

      if (!results) {
        console.error("No decryption results available");
        return;
      }

      const txHash = await mutateAsync({
        address: PROTOCOL.address.ConfidentialLending,
        abi: PROTOCOL.abi.ConfidentialLending,
        functionName: "executeRound",
        args: [results.abiEncodedClearValues, results.decryptionProof],
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });
    } catch (e) {
      console.error("executeRound failed:", e);
    }
  };

  const onFinalizeSupply = async (roundIndex: bigint) => {
    try {
      const txHash = await mutateAsync({
        address: PROTOCOL.address.ConfidentialLending,
        abi: PROTOCOL.abi.ConfidentialLending,
        functionName: "finalizeSupply",
        args: [roundIndex],
      });
      await publicClient!.waitForTransactionReceipt({ hash: txHash });
    } catch (e) {
      console.error("finalizeSupply failed:", e);
    }
  };

  // ===== Underlying balances =====
  const { formattedAmount: usdcFormatted } = useBalance(PROTOCOL.address.USDC, PROTOCOL.address.ConfidentialLending);

  const { data: aTokenAddress } = useReadContract({
    address: AaveAdapter.address as Address,
    abi: AaveAdapter.abi as any,
    functionName: "fetchAssets",
    args: [PROTOCOL.address.AAVEPool, PROTOCOL.address.USDC],
    query: { enabled: !!PROTOCOL.address.AAVEPool && !!PROTOCOL.address.USDC },
  });

  const { data: aUSDCBalanceRaw } = useReadContract({
    address: (aTokenAddress || "0x0000000000000000000000000000000000000000") as Address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [PROTOCOL.address.ConfidentialLending],
    query: { enabled: !!aTokenAddress },
  });

  const aUSDCBase = aUSDCBalanceRaw ? formatUnits(aUSDCBalanceRaw as bigint, PROTOCOL.decimals.USDC) : undefined;
  const aUSDCFormatted = aUSDCBase ? formatAmount(aUSDCBase, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Protocol Status</CardTitle>
          <CardDescription>Rounds, countdown, and actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-xs text-zinc-500">Current Round</p>
              <p className="mt-1 font-mono text-lg text-white">{currentRound ? Number(currentRound) : "…"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-xs text-zinc-500">Users This Round</p>
              <p className="mt-1 font-mono text-lg text-white">{usersCurrent} / {usersRequired || "…"}</p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-[#00FF94]" style={{ width: `${Math.floor(usersProgress * 100)}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 col-span-2">
              <p className="text-xs text-zinc-500">Time to Next Round Execution</p>
              <p className="mt-1 font-mono text-lg text-white">{minTimeBetweenRounds ? `${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s` : "…"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onCallNextRound} disabled={!canCallNextRound}>Call Next Round</Button>
            <Button variant="outline" onClick={onExecuteRound} >
              Execute Round
            </Button>
          </div>

          <div className="mt-2">
            <p className="text-sm text-[#00FF94]">Previous Rounds</p>
            <div className="mt-2 space-y-2">
              {(positionsReads?.data ?? []).map((res, idx) => {
                const roundIndex = roundsToFetch[idx];
                const value = res?.result as bigint | undefined;
                const INT64_OFFSET = (BigInt(2) ** BigInt(63));
                const isSupply = value !== undefined ? value > INT64_OFFSET : false;
                const amountRaw = value !== undefined ? (isSupply ? value - INT64_OFFSET : INT64_OFFSET - value) : BigInt(0);
                const amount = formatUnits(amountRaw, PROTOCOL.decimals.cUSDC ?? 6);
                return (
                  <div key={String(roundIndex)} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge className="border-white/20 bg-white/10 text-white">Round {Number(roundIndex)}</Badge>
                      <span className={isSupply ? "text-[#00FF94]" : "text-rose-400"}>{isSupply ? "Supply" : "Withdraw"}</span>
                      <span className="font-mono text-white">{amount}</span>
                    </div>
                    {isSupply ? (
                      <Button size="sm" variant="outline" onClick={() => onFinalizeSupply(roundIndex)}>Finalize Supply</Button>
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </div>
                );
              })}
              {roundsToFetch.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-400">No previous rounds yet.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Underlying Balances</CardTitle>
          <CardDescription>Wallet USDC and Aave supply (aUSDC).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">USDC (Wallet)</p>
            <p className="mt-2 text-2xl font-semibold text-white font-mono">{usdcFormatted ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">aUSDC (Supplied via Protocol)</p>
            <p className="mt-2 text-2xl font-semibold text-white font-mono">{aUSDCFormatted ?? (aTokenAddress ? "—" : "Resolving aUSDC...")}</p>
            <p className="mt-2 text-xs text-zinc-500">Source: AAVE Pool on {PROTOCOL.chainId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
