type EthereumProvider = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
};

export async function watchErc721InWallet(
  provider: EthereumProvider,
  contractAddress: `0x${string}`,
  tokenId: bigint
): Promise<boolean> {
  const result = await provider.request({
    method: "wallet_watchAsset",
    params: {
      type: "ERC721",
      options: {
        address: contractAddress,
        tokenId: tokenId.toString(),
      },
    },
  });

  return Boolean(result);
}
