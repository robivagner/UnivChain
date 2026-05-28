"use client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { config } from "@/config/wagmi";
import "./globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2_000,
      refetchOnWindowFocus: true,
    },
  },
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <ConnectKitProvider>{children}</ConnectKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}