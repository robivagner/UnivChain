"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import type { UnivChainDeployment } from "@/constants/contracts";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx } from "@/lib/wallet/runContractTx";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import {
  btnAccentClass,
  btnSecondaryClass,
  formInputMonoClassName,
  portalCardClass,
  portalSectionTitleClass,
} from "@/lib/ui/portalClasses";

type Props = {
  deployment: UnivChainDeployment;
};

export function AdminRolesPanel({ deployment }: Props) {
  const publicClient = usePublicClient();
  const [professorAddress, setProfessorAddress] = useState("");
  const [issuerAddress, setIssuerAddress] = useState("");
  const { notifyError, notifySuccess } = useNotifications();
  const { invalidate } = useLiveContractReads(true);
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const handleAddProfessor = async () => {
    if (!isAddress(professorAddress)) {
      notifyError("Enter a valid professor wallet address.");
      return;
    }
    reset();
    try {
      const granted = getAddress(professorAddress);
      await runContractTx({
        publicClient,
        invalidate,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "addProfessor",
            args: [granted],
          }),
      });
      setProfessorAddress("");
      notifySuccess(`Professor role granted to ${granted}.`);
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  const handleAddIssuer = async () => {
    if (!isAddress(issuerAddress)) {
      notifyError("Enter a valid diploma issuer wallet address.");
      return;
    }
    reset();
    try {
      const granted = getAddress(issuerAddress);
      await runContractTx({
        publicClient,
        invalidate,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "addDiplomaIssuer",
            args: [granted],
          }),
      });
      setIssuerAddress("");
      notifySuccess(`Diploma issuer role granted to ${granted}.`);
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  return (
    <section className={`${portalCardClass} flex flex-col gap-6`}>
      <div>
        <h2 className={portalSectionTitleClass}>Roles</h2>
        <p className="text-xs text-uc-muted">
          Grant on-chain roles. Professors can manage subjects and grades; diploma issuers can
          graduate students.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="portal-section-title">Add professor</h3>
        <input
          className={formInputMonoClassName}
          placeholder="Professor wallet 0x…"
          value={professorAddress}
          onChange={(e) => setProfessorAddress(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAddProfessor}
          disabled={isPending}
          className={btnAccentClass}
        >
          {isPending ? "Processing…" : "Grant PROFESSOR_ROLE"}
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
        <h3 className="portal-section-title">Add diploma issuer</h3>
        <input
          className={formInputMonoClassName}
          placeholder="Issuer wallet 0x…"
          value={issuerAddress}
          onChange={(e) => setIssuerAddress(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAddIssuer}
          disabled={isPending}
          className={btnSecondaryClass}
        >
          {isPending ? "Processing…" : "Grant DIPLOMA_ISSUER_ROLE"}
        </button>
      </div>
    </section>
  );
}
