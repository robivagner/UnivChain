import type { PublicClient } from "viem";
import { CertificationABI } from "@/abi/Certification";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import type { UnivChainDeployment } from "@/constants/contracts";
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
    const [valid, diploma, facultyName] = await Promise.all([
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

    const status = valid ? "valid" : diploma.revoked ? "revoked" : "not_found";

    return {
      status,
      studentAddress,
      tokenId,
      degreeTitle: diploma.degreeTitle,
      major: diploma.major,
      finalAverageDisplay: (Number(diploma.finalAverage) / 100).toFixed(2),
      totalCredits: diploma.totalCredits,
      documentHash: diploma.documentHash,
      metadataURI: diploma.metadataURI,
      issueTimestamp: new Date(Number(diploma.issueTimestamp) * 1000),
      revoked: diploma.revoked,
      facultyName,
      issuerCoreAddress: diploma.issuer,
      certificationAddress: deployment.certification,
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
