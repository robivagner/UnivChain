"use client";

import { useState } from "react";
import { getAddress, isAddress } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import type { UnivChainDeployment } from "@/constants/contracts";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import { formInputClassName } from "@/lib/formInputClassName";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx } from "@/lib/wallet/runContractTx";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import {
  btnVioletClass,
  formInputMonoClassName,
  portalCardClass,
  portalSectionTitleClass,
} from "@/lib/ui/portalClasses";

type Props = {
  deployment: UnivChainDeployment;
};

export function AdminAddSubjectPanel({ deployment }: Props) {
  const publicClient = usePublicClient();
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("6");
  const [professor, setProfessor] = useState("");
  const { notifyError, notifySuccess } = useNotifications();
  const { invalidate } = useLiveContractReads(true);
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const handleSubmit = async () => {
    if (!name.trim()) {
      notifyError("Enter a subject name.");
      return;
    }
    if (!isAddress(professor)) {
      notifyError("Enter a valid professor address (must already have PROFESSOR_ROLE).");
      return;
    }
    const creditsNum = Number(credits);
    if (!Number.isInteger(creditsNum) || creditsNum < 1 || creditsNum > 30) {
      notifyError("Credits must be an integer between 1 and 30.");
      return;
    }

    reset();
    try {
      await runContractTx({
        publicClient,
        invalidate,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "addSubject",
            args: [name.trim(), creditsNum, getAddress(professor)],
          }),
      });
      setName("");
      setProfessor("");
      notifySuccess("Subject created and assigned to the professor.");
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  return (
    <section className={`${portalCardClass} flex flex-col gap-3`}>
      <div>
        <h2 className={portalSectionTitleClass}>Add subject (admin)</h2>
        <p className="text-xs text-uc-muted">
          Create a subject and assign it to an existing professor wallet.
        </p>
      </div>
      <input
        className={formInputClassName}
        placeholder="Subject name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className={formInputClassName}
        type="number"
        min={1}
        max={30}
        placeholder="Credits"
        value={credits}
        onChange={(e) => setCredits(e.target.value)}
      />
      <input
        className={formInputMonoClassName}
        placeholder="Professor wallet 0x…"
        value={professor}
        onChange={(e) => setProfessor(e.target.value)}
      />
      <button type="button" onClick={handleSubmit} disabled={isPending} className={btnVioletClass}>
        {isPending ? "Processing…" : "Add subject for professor"}
      </button>
    </section>
  );
}
