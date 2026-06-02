import type { PublicClient } from "viem";

/** Submit a contract write, wait for confirmation, and fail if the tx reverts on-chain. */
export async function waitForSuccessfulTx(
  publicClient: PublicClient | undefined,
  hash: `0x${string}`
): Promise<void> {
  if (!publicClient) return;

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "reverted") {
    throw new Error("Transaction reverted on-chain.");
  }
}

export async function runContractTx(params: {
  publicClient: PublicClient | undefined;
  write: () => Promise<`0x${string}`>;
  invalidate?: () => Promise<void>;
}): Promise<`0x${string}`> {
  const hash = await params.write();
  await waitForSuccessfulTx(params.publicClient, hash);
  await params.invalidate?.();
  return hash;
}
