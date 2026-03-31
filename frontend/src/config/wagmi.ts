import { http, createConfig } from "wagmi";
import { localhost, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";
import { defineChain } from "viem";

const anvil = defineChain({
    id: 31337,
    name: "Anvil",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["http://127.0.0.1:8545"] },
    },
  });

export const config = createConfig(
  getDefaultConfig({
    chains: [anvil, sepolia],
    transports: {
      [anvil.id]: http("http://127.0.0.1:8545"),
      [sepolia.id]: http(),
    },
    walletConnectProjectId: "2f681044bb90df01007c9cb66229e20c",
    appName: "UnivChain Portal",
    enableAaveAccount: false
  })
);