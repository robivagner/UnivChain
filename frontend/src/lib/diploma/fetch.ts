export const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://ipfs.io/ipfs/";

export function resolveMetadataUrl(metadataURI: string): string {
  if (metadataURI.startsWith("ipfs://")) {
    return `${IPFS_GATEWAY}${metadataURI.slice(7)}`;
  }
  return metadataURI;
}
