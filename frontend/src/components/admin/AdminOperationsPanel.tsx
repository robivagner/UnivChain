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
import { TxErrorAlert } from "@/components/shared/TxErrorAlert";
import {
  btnAccentClass,
  btnDangerClass,
  btnGhostClass,
  btnSecondaryClass,
  btnVioletClass,
  formInputMonoClassName,
  messageBoxClass,
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
  const [withdrawToken, setWithdrawToken] = useState(deployment.enrollmentToken ?? "");
  const [withdrawDestination, setWithdrawDestination] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const feeTokenAddress = isAddress(feeToken) ? getAddress(feeToken) : undefined;
  const withdrawTokenAddress = isAddress(withdrawToken) ? getAddress(withdrawToken) : undefined;

  const { data: currentFee } = useReadContract({
    address: deployment.feeManager,
    abi: FeeManagerABI,
    functionName: "getFeeAmountForToken",
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
    setMessage(null);
    setLocalError(null);
    try {
      await runContractTx({ publicClient, invalidate, write });
      setMessage(label);
    } catch (e) {
      setLocalError(formatTxError(e));
    }
  };

  const handleExpel = () => {
    if (!isAddress(expelAddress)) {
      alert("Enter a valid student wallet address.");
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
      alert("Enter a valid diploma token ID (positive integer).");
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

  const handleSetFee = () => {
    if (!feeTokenAddress) {
      alert("Enter a valid ERC-20 token address.");
      return;
    }
    const parsed = Number(feeAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert("Enter a positive fee amount.");
      return;
    }

    void runTx(`Enrollment fee updated for ${feeTokenAddress}.`, () =>
      writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "setTokenFee",
        args: [feeTokenAddress, parseUnits(feeAmount, USDC_DECIMALS)],
      })
    );
  };

  const handleWithdraw = () => {
    if (!withdrawTokenAddress) {
      alert("Enter a valid ERC-20 token address.");
      return;
    }
    if (!isAddress(withdrawDestination)) {
      alert("Enter a valid destination wallet address.");
      return;
    }
    const parsed = Number(withdrawAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      alert("Enter a positive withdrawal amount.");
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
        <h3 className="portal-section-title">Set enrollment fee</h3>
        <p className="text-xs text-uc-muted">
          Configure the registration fee for an accepted payment token (6 decimals, e.g. USDC).
        </p>
        {currentFee !== undefined && feeTokenAddress && (
          <p className="text-xs text-uc-muted">
            Current fee: {formatUnits(currentFee, USDC_DECIMALS)} tokens
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
          placeholder="New fee amount (e.g. 10)"
          value={feeAmount}
          onChange={(e) => setFeeAmount(e.target.value)}
        />
        <button type="button" onClick={handleSetFee} disabled={isPending} className={btnAccentClass}>
          {isPending ? "Processing…" : "Update token fee"}
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-5">
        <h3 className="portal-section-title">Withdraw treasury funds</h3>
        <p className="text-xs text-uc-muted">
          Transfer collected registration fees from the FeeManager contract to a destination wallet.
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

      {message && <p className={messageBoxClass}>{message}</p>}
      {localError && <TxErrorAlert message={localError} />}
    </section>
  );
}
