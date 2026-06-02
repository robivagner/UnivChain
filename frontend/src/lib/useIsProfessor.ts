import { useAccount, useReadContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { getDeployment } from "@/lib/contracts";

/** True when the connected wallet has PROFESSOR_ROLE on UniversityCore. */
export function useIsProfessor() {
  const { address, chainId, isConnected } = useAccount();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;

  const { data: professorRole } = useReadContract({
    address: deployment?.universityCore,
    abi: UniversityCoreABI,
    functionName: "PROFESSOR_ROLE",
    query: { enabled: Boolean(deployment) },
  });

  const { data: isProfessor, isLoading } = useReadContract({
    address: deployment?.universityCore,
    abi: UniversityCoreABI,
    functionName: "hasRole",
    args: professorRole && address ? [professorRole, address] : undefined,
    query: { enabled: Boolean(deployment && professorRole && address) },
  });

  return {
    isProfessor: Boolean(isConnected && isProfessor),
    isLoading: isConnected && isLoading,
    deployment,
    chainId,
    isConnected,
  };
}
