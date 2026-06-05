"use client";

import { useMemo } from "react";
import { getAddress, isAddress } from "viem";
import { useChainId, useReadContract, useReadContracts } from "wagmi";
import { CertificationABI } from "@/abi/Certification";
import { FeeManagerABI } from "@/abi/FeeManager";
import { GradebookABI } from "@/abi/Gradebook";
import { StudentRegistryABI } from "@/abi/StudentRegistry";
import { getDeployment } from "@/lib/contracts";

export function useGraduationEligibility(studentInput: string) {
  const chainId = useChainId();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;

  const student = useMemo(() => {
    if (!isAddress(studentInput)) return undefined;
    return getAddress(studentInput);
  }, [studentInput]);

  const enabled = Boolean(deployment && student);

  const contracts = useMemo(() => {
    if (!deployment || !student) return [];

    return [
      {
        address: deployment.studentRegistry,
        abi: StudentRegistryABI,
        functionName: "isStudentEnrolled" as const,
        args: [student] as const,
      },
      {
        address: deployment.studentRegistry,
        abi: StudentRegistryABI,
        functionName: "hasStudentGraduated" as const,
        args: [student] as const,
      },
      {
        address: deployment.studentRegistry,
        abi: StudentRegistryABI,
        functionName: "isStudentExpelled" as const,
        args: [student] as const,
      },
      {
        address: deployment.certification,
        abi: CertificationABI,
        functionName: "hasDiploma" as const,
        args: [student] as const,
      },
      {
        address: deployment.gradebook,
        abi: GradebookABI,
        functionName: "getStudentCredits" as const,
        args: [student] as const,
      },
      {
        address: deployment.gradebook,
        abi: GradebookABI,
        functionName: "getWeightedAverage" as const,
        args: [student] as const,
      },
      {
        address: deployment.certification,
        abi: CertificationABI,
        functionName: "i_creditsRequiredForGraduation" as const,
      },
      {
        address: deployment.certification,
        abi: CertificationABI,
        functionName: "i_minimumAverageForGraduation" as const,
      },
      {
        address: deployment.feeManager,
        abi: FeeManagerABI,
        functionName: "hasOutstandingDebt" as const,
        args: [student] as const,
      },
    ];
  }, [deployment, student]);

  const { data, isLoading } = useReadContracts({
    contracts,
    query: { enabled },
  });

  const { data: studentDebtOwedRaw, isLoading: debtOwedLoading } = useReadContract({
    address: deployment?.feeManager,
    abi: FeeManagerABI,
    functionName: "getStudentDebtOwed",
    args:
      student && deployment?.enrollmentToken
        ? [student, deployment.enrollmentToken]
        : undefined,
    query: { enabled: enabled && Boolean(deployment?.enrollmentToken) },
  });

  const parsed = useMemo(() => {
    if (!data || data.length < 9) return undefined;

    const getBool = (i: number) => data[i]?.status === "success" && data[i].result === true;
    const getUint = (i: number) =>
      data[i]?.status === "success" ? (data[i].result as bigint) : 0n;

    const credits = getUint(4);
    const average = getUint(5);
    const creditsRequired = getUint(6);
    const minAverage = getUint(7);

    const enrolled = getBool(0);
    const graduated = getBool(1);
    const expelled = getBool(2);
    const hasDiploma = getBool(3);

    const creditsOk = credits >= creditsRequired;
    const averageOk = average >= minAverage;
    const hasOutstandingDebt = getBool(8);
    const studentDebtOk = !hasOutstandingDebt;
    const studentDebtOwed = studentDebtOwedRaw ?? 0n;

    const eligible =
      enrolled &&
      !graduated &&
      !expelled &&
      !hasDiploma &&
      creditsOk &&
      averageOk &&
      studentDebtOk;

    return {
      enrolled,
      graduated,
      expelled,
      hasDiploma,
      credits,
      creditsRequired,
      creditsOk,
      average,
      averageDisplay: (Number(average) / 100).toFixed(2),
      minAverage,
      minAverageDisplay: (Number(minAverage) / 100).toFixed(2),
      averageOk,
      hasOutstandingDebt,
      studentDebtOk,
      studentDebtOwed,
      eligible,
    };
  }, [data, studentDebtOwedRaw]);

  return {
    student,
    eligibility: parsed,
    isLoading: enabled && (isLoading || debtOwedLoading),
    deployment,
  };
}
