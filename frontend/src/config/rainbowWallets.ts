import { metaMaskWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "2f681044bb90df01007c9cb66229e20c";

/** Wallets shown in the RainbowKit connect modal. */
export const portalWallets = [
  {
    groupName: "Recommended",
    wallets: [metaMaskWallet, injectedWallet],
  },
];

export { projectId };
