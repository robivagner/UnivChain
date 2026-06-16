import type { TypedDataDomain } from "viem";
import type { UnivChainDeployment } from "@/constants/contracts";
import { DIPLOMA_CREDENTIAL_VERSION, type DiplomaSignableFields } from "./types";

export const DIPLOMA_EIP712_TYPES = {
  DiplomaCredential: [
    { name: "version", type: "string" },
    { name: "issuer", type: "address" },
    { name: "student", type: "address" },
    { name: "degreeTitle", type: "string" },
    { name: "major", type: "string" },
    { name: "facultyName", type: "string" },
    { name: "validFrom", type: "string" },
    { name: "totalCredits", type: "uint256" },
    { name: "finalAverage", type: "uint256" },
    { name: "chainId", type: "uint256" },
    { name: "certificationContract", type: "address" },
    { name: "studentIdHash", type: "bytes32" },
  ],
} as const;

export function getEip712Domain(
  deployment: UnivChainDeployment,
  chainId: number
): TypedDataDomain {
  return {
    name: "UnivChain Diploma",
    version: "1",
    chainId,
    verifyingContract: deployment.certification,
  };
}

export function buildSignableFields(input: {
  issuer: `0x${string}`;
  student: `0x${string}`;
  degreeTitle: string;
  major: string;
  facultyName: string;
  validFrom: string;
  chainId: number;
  certificationContract: `0x${string}`;
  studentIdHash?: `0x${string}` | null;
  totalCredits: bigint;
  finalAverage: bigint;
}): DiplomaSignableFields {
  return {
    version: DIPLOMA_CREDENTIAL_VERSION,
    issuer: input.issuer,
    student: input.student,
    degreeTitle: input.degreeTitle,
    major: input.major,
    facultyName: input.facultyName,
    validFrom: input.validFrom,
    chainId: BigInt(input.chainId),
    certificationContract: input.certificationContract,
    studentIdHash: input.studentIdHash ?? ("0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`),
    totalCredits: input.totalCredits,
    finalAverage: input.finalAverage,
  };
}
