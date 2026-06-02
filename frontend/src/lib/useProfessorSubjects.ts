"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { getAddress } from "viem";
import { GradebookABI } from "@/abi/Gradebook";
import { getDeployment } from "@/lib/contracts";

export type ProfessorSubject = {
  subjectId: bigint;
  name: string;
  credits: number;
  professor: `0x${string}`;
  isActive: boolean;
};

export function useProfessorSubjects() {
  const { address, chainId } = useAccount();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const gradebook = deployment?.gradebook;

  const { data: counter, isLoading: counterLoading } = useReadContract({
    address: gradebook,
    abi: GradebookABI,
    functionName: "s_tokenIdCounter",
    query: { enabled: Boolean(gradebook) },
  });

  const subjectIds = useMemo(() => {
    if (counter === undefined || counter <= 1n) return [];
    const ids: bigint[] = [];
    for (let id = 1n; id < counter; id++) ids.push(id);
    return ids;
  }, [counter]);

  const { data: metadataResults, isLoading: metadataLoading } = useReadContracts({
    contracts: subjectIds.map((subjectId) => ({
      address: gradebook!,
      abi: GradebookABI,
      functionName: "getSubjectMetadata" as const,
      args: [subjectId] as const,
    })),
    query: { enabled: Boolean(gradebook && subjectIds.length > 0) },
  });

  const subjects = useMemo((): ProfessorSubject[] => {
    if (!address || !metadataResults) return [];
    const normalized = getAddress(address).toLowerCase();
    const list: ProfessorSubject[] = [];

    metadataResults.forEach((result, index) => {
      if (result.status !== "success" || !result.result) return;
      const [name, credits, professor, isActive] = result.result;
      if (getAddress(professor).toLowerCase() !== normalized) return;
      list.push({
        subjectId: subjectIds[index],
        name,
        credits: Number(credits),
        professor: getAddress(professor),
        isActive,
      });
    });

    return list.sort((a, b) => Number(a.subjectId - b.subjectId));
  }, [address, metadataResults, subjectIds]);

  return {
    subjects,
    isLoading: counterLoading || (subjectIds.length > 0 && metadataLoading),
    deployment,
    gradebook,
  };
}
