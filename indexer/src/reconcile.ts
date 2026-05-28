import type { PublicClient } from "viem";
import { getAddress } from "viem";
import { FeeManagerABI, StudentRegistryABI } from "./abi.js";
import type { IndexerConfig } from "./types.js";

export async function isStillPendingOnChain(
  client: PublicClient,
  config: IndexerConfig,
  student: `0x${string}`
): Promise<boolean> {
  const normalized = getAddress(student);
  const [hasPaidFee, isEnrolled, hasGraduated] = await Promise.all([
    client.readContract({
      address: config.feeManager,
      abi: FeeManagerABI,
      functionName: "hasPaidFee",
      args: [normalized],
    }),
    client.readContract({
      address: config.studentRegistry,
      abi: StudentRegistryABI,
      functionName: "isStudentEnrolled",
      args: [normalized],
    }),
    client.readContract({
      address: config.studentRegistry,
      abi: StudentRegistryABI,
      functionName: "hasStudentGraduated",
      args: [normalized],
    }),
  ]);

  return hasPaidFee && !isEnrolled && !hasGraduated;
}
