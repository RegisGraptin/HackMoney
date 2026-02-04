"use client";

import { Button } from "@/components/ui/button";
import { modal } from "@/lib/appkit";
import { useConnection, useDisconnect, useEnsName } from "wagmi";

function formatAddress(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const disconnect = useDisconnect();
  const { address: userAddress, isConnected } = useConnection();
  const { data: ensName } = useEnsName({ address: userAddress });

  if (!isConnected) {
    return (
      <Button
        onClick={() => modal.open()}
        aria-label="Connect Wallet"
        className="transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_24px_rgba(0,255,148,0.35)] focus-visible:ring-2 focus-visible:ring-[#00FF94]/40"
      >
        Connect
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        aria-label="Manage Wallet"
        className="transition-all duration-150 hover:bg-zinc-800/50 hover:shadow-[0_0_18px_rgba(255,255,255,0.12)] focus-visible:ring-2 focus-visible:ring-[#00FF94]/30"
      >
        {ensName ?? formatAddress(userAddress)}
      </Button>
      <Button
        variant="ghost"
        onClick={() => disconnect.mutate()}
        aria-label="Disconnect Wallet"
        className="transition-transform duration-150 hover:bg-zinc-800/30 hover:text-[#00FF94] active:scale-[0.98]"
      >
        Disconnect
      </Button>
    </div>
  );
}
