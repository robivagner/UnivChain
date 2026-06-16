import type { PublicClient } from "viem";
import { CertificationABI } from "@/abi/Certification";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import type { UnivChainDeployment } from "@/constants/contracts";
import { fetchDiplomaCredential } from "@/lib/diploma/metadata";
import { verifyCredentialProof } from "@/lib/diploma/verifyCredential";
import type { VerificationReport } from "./types";

export async function verifyDiplomaByStudent(
  client: PublicClient,
  deployment: UnivChainDeployment,
  studentAddress: `0x${string}`
): Promise<VerificationReport> {
  try {
    const tokenId = await client.readContract({
      address: deployment.certification,
      abi: CertificationABI,
      functionName: "getDiplomaIdForStudent",
      args: [studentAddress],
    });

    if (tokenId === 0n) {
      return { status: "not_found", studentAddress };
    }

    return verifyDiplomaByTokenId(client, deployment, tokenId, studentAddress);
  } catch (e) {
    return {
      status: "error",
      studentAddress,
      errorMessage: e instanceof Error ? e.message : "Failed to read from chain.",
    };
  }
}

export async function verifyDiplomaByTokenId(
  client: PublicClient,
  deployment: UnivChainDeployment,
  tokenId: bigint,
  studentAddress?: `0x${string}`
): Promise<VerificationReport> {
  try {
    const [valid, diploma, facultyNameOnChain] = await Promise.all([
      client.readContract({
        address: deployment.certification,
        abi: CertificationABI,
        functionName: "isDiplomaValid",
        args: [tokenId],
      }),
      client.readContract({
        address: deployment.certification,
        abi: CertificationABI,
        functionName: "getDiploma",
        args: [tokenId],
      }),
      client.readContract({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "getFacultyName",
      }),
    ]);

    const chainStatus = valid ? "valid" : diploma.revoked ? "revoked" : "not_found";
    const credential = await fetchDiplomaCredential(diploma.metadataURI);

    let signatureValid: boolean | undefined;
    let metadataHashMatch: boolean | undefined;
    let issuerMatchesCredential: boolean | undefined;

    if (credential) {
      const proof = await verifyCredentialProof(client, deployment, credential, {
        onChainIssuer: diploma.issuer,
        expectedStudent: studentAddress,
        onChainDocumentHash: diploma.documentHash,
      });
      signatureValid = proof.signatureValid;
      metadataHashMatch = proof.documentHashMatch;
      issuerMatchesCredential = proof.issuerMatchesChain;
    }

    const cryptographicallyValid =
      credential !== null &&
      signatureValid === true &&
      metadataHashMatch === true &&
      issuerMatchesCredential === true;

    const status =
      chainStatus === "valid" && cryptographicallyValid
        ? "valid"
        : chainStatus === "revoked"
          ? "revoked"
          : chainStatus === "valid" && credential && !cryptographicallyValid
            ? "error"
            : chainStatus;

    return {
      status,
      studentAddress: studentAddress ?? credential?.student,
      tokenId,
      degreeTitle: credential?.degreeTitle,
      major: credential?.major,
      finalAverageDisplay: credential
        ? (Number(credential.finalAverage) / 100).toFixed(2)
        : undefined,
      totalCredits: credential ? BigInt(credential.totalCredits) : undefined,
      documentHash: diploma.documentHash,
      metadataURI: diploma.metadataURI,
      metadataHashMatch,
      signatureValid,
      issuerMatchesCredential,
      issueTimestamp: new Date(Number(diploma.issueTimestamp) * 1000),
      revoked: diploma.revoked,
      facultyName: credential?.facultyName ?? facultyNameOnChain,
      issuerAddress: diploma.issuer,
      certificationAddress: deployment.certification,
      errorMessage:
        status === "error" && credential
          ? "On-chain diploma exists but off-chain signature or document hash failed verification."
          : undefined,
    };
  } catch (e) {
    return {
      status: "error",
      tokenId,
      studentAddress,
      errorMessage: e instanceof Error ? e.message : "Diploma not found or invalid network.",
    };
  }
}
