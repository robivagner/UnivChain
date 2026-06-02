import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { defineChain } from "viem";
import { portalWallets, projectId } from "@/config/rainbowWallets";

const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
});

export const config = getDefaultConfig({
  appName: "UnivChain Portal",
  projectId,
  chains: [anvil],
  wallets: portalWallets,
  ssr: true,
  transports: {
    [anvil.id]: http("http://127.0.0.1:8545"),
  },
});

export { anvil };
