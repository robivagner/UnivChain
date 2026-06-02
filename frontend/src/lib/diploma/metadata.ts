import { resolveMetadataUrl } from "./fetch";
import { isUnivChainDiplomaCredential } from "./credential";
import type { UnivChainDiplomaCredential } from "./types";

export { IPFS_GATEWAY, resolveMetadataUrl } from "./fetch";

/** @deprecated Use UnivChainDiplomaCredential fields directly. */
export type DiplomaMetadata = Pick<
  UnivChainDiplomaCredential,
  "degreeTitle" | "major" | "facultyName"
>;

export async function fetchDiplomaCredential(
  metadataURI: string
): Promise<UnivChainDiplomaCredential | null> {
  if (!metadataURI.trim()) return null;
  try {
    const res = await fetch(resolveMetadataUrl(metadataURI));
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isUnivChainDiplomaCredential(data) ? data : null;
  } catch {
    return null;
  }
}

/** @deprecated Use fetchDiplomaCredential */
export async function fetchDiplomaMetadata(
  metadataURI: string
): Promise<DiplomaMetadata | null> {
  const credential = await fetchDiplomaCredential(metadataURI);
  if (!credential) return null;
  return {
    degreeTitle: credential.degreeTitle,
    major: credential.major,
    facultyName: credential.facultyName,
  };
}
