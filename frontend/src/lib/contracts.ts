import { DEPLOYMENTS, type UnivChainDeployment } from "@/constants/contracts";

export function getDeployment(chainId: number | undefined): UnivChainDeployment | undefined {
  if (chainId === undefined) return undefined;
  return DEPLOYMENTS[chainId];
}

export function requireDeployment(chainId: number | undefined): UnivChainDeployment {
  const deployment = getDeployment(chainId);
  if (!deployment) {
    throw new Error(`UnivChain is not configured for network ${chainId ?? "unknown"}.`);
  }
  return deployment;
}
