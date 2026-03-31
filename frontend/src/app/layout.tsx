"use client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider } from "connectkit";
import { config } from "@/config/wagmi";
import "./globals.css";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <ConnectKitProvider>
              <div className="min-h-screen bg-slate-50">
                {children}
              </div>
            </ConnectKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}