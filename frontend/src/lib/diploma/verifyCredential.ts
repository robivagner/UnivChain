import type { PublicClient } from "viem";
import { verifyTypedData } from "viem";
import type { UnivChainDeployment } from "@/constants/contracts";
import { computeDocumentHash, credentialToSignableFields, isUnivChainDiplomaCredential } from "./credential";
import { DIPLOMA_EIP712_TYPES, getEip712Domain } from "./eip712";
import { ZERO_BYTES32, type UnivChainDiplomaCredential } from "./types";

export type CredentialVerification = {
  parsed: UnivChainDiplomaCredential;
  signatureValid: boolean;
  documentHashMatch: boolean;
  issuerMatchesChain: boolean;
  studentMatchesQuery?: boolean;
  chainIdMatches: boolean;
  certificationContractMatches: boolean;
};

export async function verifyCredentialProof(
  client: PublicClient,
  deployment: UnivChainDeployment,
  credential: UnivChainDiplomaCredential,
  options?: {
    onChainIssuer?: `0x${string}`;
    expectedStudent?: `0x${string}`;
    onChainDocumentHash?: `0x${string}`;
  }
): Promise<CredentialVerification> {
  const signable = credentialToSignableFields(credential);
  const chainId = await client.getChainId();

  const signatureValid = await verifyTypedData({
    address: credential.issuer,
    domain: getEip712Domain(deployment, credential.evidence.chainId),
    types: DIPLOMA_EIP712_TYPES,
    primaryType: "DiplomaCredential",
    message: signable,
    signature: credential.proof.proofValue,
  });

  const computedHash = computeDocumentHash(credential);
  const onChainHash = options?.onChainDocumentHash;
  const documentHashMatch =
    onChainHash !== undefined && onChainHash !== ZERO_BYTES32
      ? computedHash === onChainHash &&
        credential.evidence.documentHash === onChainHash
      : computedHash === credential.evidence.documentHash;

  return {
    parsed: credential,
    signatureValid,
    documentHashMatch,
    issuerMatchesChain: options?.onChainIssuer
      ? credential.issuer.toLowerCase() === options.onChainIssuer.toLowerCase()
      : true,
    studentMatchesQuery: options?.expectedStudent
      ? credential.student.toLowerCase() === options.expectedStudent.toLowerCase()
      : undefined,
    chainIdMatches: credential.evidence.chainId === chainId,
    certificationContractMatches:
      credential.evidence.certificationContract.toLowerCase() ===
      deployment.certification.toLowerCase(),
  };
}

export function parseCredentialJson(raw: unknown): UnivChainDiplomaCredential | null {
  if (!isUnivChainDiplomaCredential(raw)) return null;
  return raw;
}
