"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { CertificationABI } from "@/abi/Certification";
import { GradebookABI } from "@/abi/Gradebook";
import { StudentRegistryABI } from "@/abi/StudentRegistry";
import { FeeManagerABI } from "@/abi/FeeManager";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { getDeployment } from "@/lib/contracts";
import { parseStudentMetadata } from "@/lib/student/studentProfileUtils";

export function useStudentProfile() {
  const { address, chainId } = useAccount();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const enabled = Boolean(deployment && address);

  const registry = deployment?.studentRegistry;
  const gradebook = deployment?.gradebook;
  const certification = deployment?.certification;
  const feeManager = deployment?.feeManager;

  const { data: isEnrolled, isLoading: l1 } = useReadContract({
    address: registry,
    abi: StudentRegistryABI,
    functionName: "isStudentEnrolled",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const { data: isExpelled, isLoading: l2 } = useReadContract({
    address: registry,
    abi: StudentRegistryABI,
    functionName: "isStudentExpelled",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const { data: hasGraduated, isLoading: l3 } = useReadContract({
    address: registry,
    abi: StudentRegistryABI,
    functionName: "hasStudentGraduated",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const { data: studentTokenId, isLoading: l4 } = useReadContract({
    address: registry,
    abi: StudentRegistryABI,
    functionName: "getStudentTokenId",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const { data: hasPaidFee, isLoading: l5 } = useReadContract({
    address: feeManager,
    abi: FeeManagerABI,
    functionName: "hasPaidFee",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const hasStudentRecord =
    Boolean(isEnrolled) ||
    Boolean(hasGraduated) ||
    (studentTokenId !== undefined && studentTokenId > 0n);

  const { data: credits, isLoading: l6 } = useReadContract({
    address: gradebook,
    abi: GradebookABI,
    functionName: "getStudentCredits",
    args: address ? [address] : undefined,
    query: { enabled: enabled && hasStudentRecord },
  });

  const { data: weightedAverage, isLoading: l7 } = useReadContract({
    address: gradebook,
    abi: GradebookABI,
    functionName: "getWeightedAverage",
    args: address ? [address] : undefined,
    query: { enabled: enabled && hasStudentRecord },
  });

  const { data: hasDiploma, isLoading: l8 } = useReadContract({
    address: certification,
    abi: CertificationABI,
    functionName: "hasDiploma",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const { data: hasValidDiploma, isLoading: l9 } = useReadContract({
    address: certification,
    abi: CertificationABI,
    functionName: "hasValidDiploma",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const { data: diplomaTokenId, isLoading: l10 } = useReadContract({
    address: certification,
    abi: CertificationABI,
    functionName: "getDiplomaIdForStudent",
    args: address ? [address] : undefined,
    query: { enabled: enabled && Boolean(hasDiploma) },
  });

  const tokenIdForMetadata =
    studentTokenId !== undefined && studentTokenId > 0n ? studentTokenId : undefined;

  const { data: studentMetadata, isLoading: l11 } = useReadContract({
    address: registry,
    abi: StudentRegistryABI,
    functionName: "getStudentMetadata",
    args: tokenIdForMetadata !== undefined ? [tokenIdForMetadata] : undefined,
    query: { enabled: Boolean(registry && tokenIdForMetadata !== undefined) },
  });

  const { data: creditsRequired, isLoading: l12 } = useReadContract({
    address: certification,
    abi: CertificationABI,
    functionName: "i_creditsRequiredForGraduation",
    query: { enabled: Boolean(certification) },
  });

  const { data: minAverage, isLoading: l13 } = useReadContract({
    address: certification,
    abi: CertificationABI,
    functionName: "i_minimumAverageForGraduation",
    query: { enabled: Boolean(certification) },
  });

  const { data: facultyName, isLoading: l14 } = useReadContract({
    address: deployment?.universityCore,
    abi: UniversityCoreABI,
    functionName: "getFacultyName",
    query: { enabled: Boolean(deployment?.universityCore) },
  });

  const parsedMetadata = useMemo(
    () => parseStudentMetadata(studentMetadata),
    [studentMetadata]
  );

  const averageDisplay = useMemo(() => {
    if (weightedAverage === undefined) return undefined;
    return (Number(weightedAverage) / 100).toFixed(2);
  }, [weightedAverage]);

  const minAverageDisplay = useMemo(() => {
    if (minAverage === undefined) return undefined;
    return (Number(minAverage) / 100).toFixed(2);
  }, [minAverage]);

  const creditsOk =
    creditsRequired !== undefined && credits !== undefined
      ? credits >= creditsRequired
      : undefined;

  const averageOk =
    weightedAverage !== undefined && minAverage !== undefined
      ? weightedAverage >= minAverage
      : undefined;

  const graduationEligible =
    hasStudentRecord &&
    !Boolean(isExpelled) &&
    !Boolean(hasGraduated) &&
    !Boolean(hasDiploma) &&
    creditsOk === true &&
    averageOk === true;

  const isLoading =
    l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9 || l10 || l11 || l12 || l13 || l14;

  return {
    deployment,
    isEnrolled: Boolean(isEnrolled),
    isExpelled: Boolean(isExpelled),
    hasGraduated: Boolean(hasGraduated),
    hasPaidFee: Boolean(hasPaidFee),
    hasStudentRecord,
    studentTokenId,
    studentMetadata: parsedMetadata,
    facultyName,
    credits: credits ?? 0n,
    weightedAverage,
    averageDisplay,
    creditsRequired: creditsRequired ?? 0n,
    minAverage: minAverage ?? 0n,
    minAverageDisplay,
    creditsOk,
    averageOk,
    graduationEligible,
    hasDiploma: Boolean(hasDiploma),
    hasValidDiploma: Boolean(hasValidDiploma),
    diplomaTokenId: diplomaTokenId && diplomaTokenId > 0n ? diplomaTokenId : undefined,
    isLoading: enabled && isLoading,
  };
}
