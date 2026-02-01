"use client";

import * as React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiAdapter } from "../../lib/wagmi";
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Import the modal to initialize it
import '../../lib/appkit'

export const client = new QueryClient();

export function WalletProvider({ children, cookies }: { children: React.ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={client}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
