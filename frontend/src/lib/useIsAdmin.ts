import { useAccount, useReadContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { getDeployment } from "@/lib/contracts";

/** True when the connected wallet has ADMIN_ROLE on UniversityCore. */
export function useIsAdmin() {
  const { address, chainId, isConnected } = useAccount();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;

  const { data: adminRole } = useReadContract({
    address: deployment?.universityCore,
    abi: UniversityCoreABI,
    functionName: "ADMIN_ROLE",
    query: { enabled: Boolean(deployment) },
  });

  const { data: isAdmin, isLoading } = useReadContract({
    address: deployment?.universityCore,
    abi: UniversityCoreABI,
    functionName: "hasRole",
    args: adminRole && address ? [adminRole, address] : undefined,
    query: { enabled: Boolean(deployment && adminRole && address) },
  });

  return {
    isAdmin: Boolean(isConnected && isAdmin),
    isLoading: isConnected && isLoading,
    deployment,
    chainId,
    isConnected,
  };
}
