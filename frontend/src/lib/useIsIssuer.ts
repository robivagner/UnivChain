import { useAccount, useReadContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { getDeployment } from "@/lib/contracts";

/** True when the connected wallet has DIPLOMA_ISSUER_ROLE on UniversityCore. */
export function useIsIssuer() {
  const { address, chainId, isConnected } = useAccount();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;

  const { data: issuerRole } = useReadContract({
    address: deployment?.universityCore,
    abi: UniversityCoreABI,
    functionName: "DIPLOMA_ISSUER_ROLE",
    query: { enabled: Boolean(deployment) },
  });

  const { data: isIssuer, isLoading } = useReadContract({
    address: deployment?.universityCore,
    abi: UniversityCoreABI,
    functionName: "hasRole",
    args: issuerRole && address ? [issuerRole, address] : undefined,
    query: { enabled: Boolean(deployment && issuerRole && address) },
  });

  return {
    isIssuer: Boolean(isConnected && isIssuer),
    isLoading: isConnected && isLoading,
    deployment,
    chainId,
    isConnected,
  };
}
