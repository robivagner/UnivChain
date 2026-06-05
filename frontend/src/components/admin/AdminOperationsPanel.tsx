"use client";

import { useState } from "react";
import { erc20Abi, formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { FeeManagerABI } from "@/abi/FeeManager";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import type { UnivChainDeployment } from "@/constants/contracts";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import { formInputClassName } from "@/lib/formInputClassName";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx } from "@/lib/wallet/runContractTx";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import {
  btnAccentClass,
  btnDangerClass,
  btnGhostClass,
  btnSecondaryClass,
  btnVioletClass,
  formInputMonoClassName,
  portalCardClass,
  portalSectionTitleClass,
} from "@/lib/ui/portalClasses";

const USDC_DECIMALS = 6;

type Props = {
  deployment: UnivChainDeployment;
};

export function AdminOperationsPanel({ deployment }: Props) {
  const publicClient = usePublicClient();
  const { invalidate } = useLiveContractReads(true);
  const { writeContractAsync, isPending, reset } = useWriteContract();

  const [expelAddress, setExpelAddress] = useState("");
  const [diplomaTokenId, setDiplomaTokenId] = useState("");
  const [feeToken, setFeeToken] = useState(deployment.enrollmentToken ?? "");
  const [feeAmount, setFeeAmount] = useState("");
  const [retakeFeePerCredit, setRetakeFeePerCredit] = useState("");
  const [semesterTax, setSemesterTax] = useState("");
  const [debtStudent, setDebtStudent] = useState("");
  const [debtToken, setDebtToken] = useState(deployment.enrollmentToken ?? "");
  const [retakeSubjectId, setRetakeSubjectId] = useState("");
  const [withdrawToken, setWithdrawToken] = useState(deployment.enrollmentToken ?? "");
  const [withdrawDestination, setWithdrawDestination] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const { notifyError, notifySuccess } = useNotifications();

  const feeTokenAddress = isAddress(feeToken) ? getAddress(feeToken) : undefined;
  const withdrawTokenAddress = isAddress(withdrawToken) ? getAddress(withdrawToken) : undefined;

  const debtTokenAddress = isAddress(debtToken) ? getAddress(debtToken) : undefined;

  const { data: currentFee } = useReadContract({
    address: deployment.feeManager,
    abi: FeeManagerABI,
    functionName: "getRegistrationFeeForToken",
    args: feeTokenAddress ? [feeTokenAddress] : undefined,
    query: { enabled: Boolean(feeTokenAddress) },
  });

  const { data: currentRetakeFeePerCredit } = useReadContract({
    address: deployment.feeManager,
    abi: FeeManagerABI,
    functionName: "getRetakeFeePerCreditForToken",
    args: feeTokenAddress ? [feeTokenAddress] : undefined,
    query: { enabled: Boolean(feeTokenAddress) },
  });

  const { data: currentSemesterTax } = useReadContract({
    address: deployment.feeManager,
    abi: FeeManagerABI,
    functionName: "getSemesterTaxForToken",
    args: feeTokenAddress ? [feeTokenAddress] : undefined,
    query: { enabled: Boolean(feeTokenAddress) },
  });

  const { data: treasuryBalance } = useReadContract({
    address: withdrawTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [deployment.feeManager],
    query: { enabled: Boolean(withdrawTokenAddress) },
  });

  const runTx = async (label: string, write: () => Promise<`0x${string}`>) => {
    reset();
    try {
      await runContractTx({ publicClient, invalidate, write });
      notifySuccess(label);
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  const handleExpel = () => {
    if (!isAddress(expelAddress)) {
      notifyError("Enter a valid student wallet address.");
      return;
    }
    const student = getAddress(expelAddress);
    if (!confirm(`Expel enrolled student ${student}? This cannot be undone on-chain.`)) {
      return;
    }

    void runTx(`Student ${student} expelled.`, () =>
      writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "expellStudent",
        args: [student],
      }).then((hash) => {
        setExpelAddress("");
        return hash;
      })
    );
  };

  const handleRevokeDiploma = () => {
    const tokenId = diplomaTokenId.trim();
    if (!/^\d+$/.test(tokenId) || BigInt(tokenId) <= 0n) {
      notifyError("Enter a valid diploma token ID (positive integer).");
      return;
    }
    if (!confirm(`Revoke diploma token #${tokenId}? This marks the diploma invalid on-chain.`)) {
      return;
    }

    void runTx(`Diploma token #${tokenId} revoked.`, () =>
      writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "revokeDiploma",
        args: [BigInt(tokenId)],
      }).then((hash) => {
        setDiplomaTokenId("");
        return hash;
      })
    );
  };

  const handleConfigureToken = () => {
    if (!feeTokenAddress) {
      notifyError("Enter a valid ERC-20 token address.");
      return;
    }
    const parsedRegistration = Number(feeAmount);
    const parsedRetake = Number(retakeFeePerCredit);
    if (!Number.isFinite(parsedRegistration) || parsedRegistration <= 0) {
      notifyError("Enter a positive registration fee amount.");
      return;
    }
    const parsedSemester = Number(semesterTax);
    if (!Number.isFinite(parsedRetake) || parsedRetake < 0) {
      notifyError("Enter a valid retake fee per credit (0 or greater).");
      return;
    }
    if (!Number.isFinite(parsedSemester) || parsedSemester < 0) {
      notifyError("Enter a valid semester tax (0 or greater).");
      return;
    }

    void runTx(`Token configuration updated for ${feeTokenAddress}.`, () =>
      writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "configureToken",
        args: [
          feeTokenAddress,
          parseUnits(feeAmount, USDC_DECIMALS),
          parseUnits(retakeFeePerCredit || "0", USDC_DECIMALS),
          parseUnits(semesterTax || "0", USDC_DECIMALS),
        ],
      })
    );
  };

  const handleAccrueRetakeTax = () => {
    if (!isAddress(debtStudent)) {
      notifyError("Enter a valid student wallet address.");
      return;
    }
    if (!debtTokenAddress) {
      notifyError("Enter a valid ERC-20 token address.");
      return;
    }
    const subjectId = retakeSubjectId.trim();
    if (!/^\d+$/.test(subjectId) || BigInt(subjectId) <= 0n) {
      notifyError("Enter a valid subject ID (positive integer).");
      return;
    }

    const student = getAddress(debtStudent);
    void runTx(`Retake tax accrued for ${student} on subject #${subjectId}.`, () =>
      writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "accrueRetakeTax",
        args: [student, debtTokenAddress, BigInt(subjectId)],
      }).then((hash) => {
        setRetakeSubjectId("");
        return hash;
      })
    );
  };

  const handleAccrueSemesterTax = () => {
    if (!isAddress(debtStudent)) {
      notifyError("Enter a valid student wallet address.");
      return;
    }
    if (!debtTokenAddress) {
      notifyError("Enter a valid ERC-20 token address.");
      return;
    }

    const student = getAddress(debtStudent);
    void runTx(`Semester tax accrued for ${student}.`, () =>
      writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "accrueSemesterTax",
        args: [student, debtTokenAddress],
      })
    );
  };

  const handleWithdraw = () => {
    if (!withdrawTokenAddress) {
      notifyError("Enter a valid ERC-20 token address.");
      return;
    }
    if (!isAddress(withdrawDestination)) {
      notifyError("Enter a valid destination wallet address.");
      return;
    }
    const parsed = Number(withdrawAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notifyError("Enter a positive withdrawal amount.");
      return;
    }

    const amount = parseUnits(withdrawAmount, USDC_DECIMALS);
    const destination = getAddress(withdrawDestination);

    void runTx(`Withdrew ${withdrawAmount} tokens to ${destination}.`, () =>
      writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "withdrawUniversityFunds",
        args: [withdrawTokenAddress, destination, amount],
      }).then((hash) => {
        setWithdrawAmount("");
        return hash;
      })
    );
  };

  const fillMaxWithdraw = () => {
    if (treasuryBalance === undefined) return;
    setWithdrawAmount(formatUnits(treasuryBalance, USDC_DECIMALS));
  };

  return (
    <section className={`${portalCardClass} flex flex-col gap-8`}>
      <div>
        <h2 className={portalSectionTitleClass}>Operations</h2>
        <p className="text-xs text-uc-muted">
          Disciplinary actions, diploma revocation, enrollment fee configuration, and treasury
          withdrawals. All calls go through UniversityCore as admin.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
        <h3 className="portal-section-title">Expel student</h3>
        <p className="text-xs text-uc-muted">
          Permanently expel an enrolled student. They must be currently enrolled and not already
          expelled.
        </p>
        <input
          className={formInputMonoClassName}
          placeholder="Student wallet 0x…"
          value={expelAddress}
          onChange={(e) => setExpelAddress(e.target.value)}
        />
        <button type="button" onClick={handleExpel} disabled={isPending} className={btnDangerClass}>
          {isPending ? "Processing…" : "Expel student"}
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
        <h3 className="portal-section-title">Revoke diploma</h3>
        <p className="text-xs text-uc-muted">
          Invalidate a diploma NFT by token ID. Use the ID shown in the student portal or verifier.
        </p>
        <input
          className={formInputClassName}
          placeholder="Diploma token ID"
          value={diplomaTokenId}
          onChange={(e) => setDiplomaTokenId(e.target.value)}
        />
        <button type="button" onClick={handleRevokeDiploma} disabled={isPending} className={btnVioletClass}>
          {isPending ? "Processing…" : "Revoke diploma"}
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
        <h3 className="portal-section-title">Configure payment token</h3>
        <p className="text-xs text-uc-muted">
          Set the enrollment registration fee, retake fee per credit, and semester tax for a token (6
          decimals, e.g. USDC).
        </p>
        {currentFee !== undefined && feeTokenAddress && (
          <p className="text-xs text-uc-muted">
            Current registration fee: {formatUnits(currentFee, USDC_DECIMALS)} tokens
            {currentRetakeFeePerCredit !== undefined && (
              <>
                {" "}
                · Retake fee per credit: {formatUnits(currentRetakeFeePerCredit, USDC_DECIMALS)}{" "}
                tokens
              </>
            )}
            {currentSemesterTax !== undefined && (
              <> · Semester tax: {formatUnits(currentSemesterTax, USDC_DECIMALS)} tokens</>
            )}
          </p>
        )}
        <input
          className={formInputMonoClassName}
          placeholder="Token address 0x…"
          value={feeToken}
          onChange={(e) => setFeeToken(e.target.value)}
        />
        <input
          className={formInputClassName}
          placeholder="Registration fee (e.g. 10)"
          value={feeAmount}
          onChange={(e) => setFeeAmount(e.target.value)}
        />
        <input
          className={formInputClassName}
          placeholder="Retake fee per credit (e.g. 1)"
          value={retakeFeePerCredit}
          onChange={(e) => setRetakeFeePerCredit(e.target.value)}
        />
        <input
          className={formInputClassName}
          placeholder="Semester tax (e.g. 50)"
          value={semesterTax}
          onChange={(e) => setSemesterTax(e.target.value)}
        />
        <button
          type="button"
          onClick={handleConfigureToken}
          disabled={isPending}
          className={btnAccentClass}
        >
          {isPending ? "Processing…" : "Configure token"}
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
        <h3 className="portal-section-title">Accrue student debt</h3>
        <p className="text-xs text-uc-muted">
          Add retake or semester charges to a student&apos;s unified debt balance. Amounts are always
          derived from on-chain configuration.
        </p>
        <input
          className={formInputMonoClassName}
          placeholder="Student wallet 0x…"
          value={debtStudent}
          onChange={(e) => setDebtStudent(e.target.value)}
        />
        <input
          className={formInputMonoClassName}
          placeholder="Token address 0x…"
          value={debtToken}
          onChange={(e) => setDebtToken(e.target.value)}
        />
        <input
          className={formInputClassName}
          placeholder="Subject ID (retake only)"
          value={retakeSubjectId}
          onChange={(e) => setRetakeSubjectId(e.target.value)}
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleAccrueRetakeTax}
            disabled={isPending}
            className={btnSecondaryClass}
          >
            {isPending ? "Processing…" : "Accrue retake tax"}
          </button>
          <button
            type="button"
            onClick={handleAccrueSemesterTax}
            disabled={isPending}
            className={btnSecondaryClass}
          >
            {isPending ? "Processing…" : "Accrue semester tax"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
        <h3 className="portal-section-title">Withdraw treasury funds</h3>
        <p className="text-xs text-uc-muted">
          Transfer collected fees and student debt payments from the FeeManager to a destination wallet.
        </p>
        {treasuryBalance !== undefined && withdrawTokenAddress && (
          <p className="text-xs text-uc-muted">
            Treasury balance: {formatUnits(treasuryBalance, USDC_DECIMALS)} tokens
          </p>
        )}
        <input
          className={formInputMonoClassName}
          placeholder="Token address 0x…"
          value={withdrawToken}
          onChange={(e) => setWithdrawToken(e.target.value)}
        />
        <input
          className={formInputMonoClassName}
          placeholder="Destination wallet 0x…"
          value={withdrawDestination}
          onChange={(e) => setWithdrawDestination(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className={`${formInputClassName} flex-1`}
            placeholder="Amount to withdraw"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <button
            type="button"
            onClick={fillMaxWithdraw}
            disabled={treasuryBalance === undefined || treasuryBalance === 0n}
            className={btnGhostClass}
          >
            Max
          </button>
        </div>
        <button type="button" onClick={handleWithdraw} disabled={isPending} className={btnSecondaryClass}>
          {isPending ? "Processing…" : "Withdraw funds"}
        </button>
      </div>

    </section>
  );
}
