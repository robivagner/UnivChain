"use client";

import { useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { StudentRegistryABI } from "@/abi/StudentRegistry";
import { FeeManagerABI } from "@/abi/FeeManager";
import { getDeployment } from "@/lib/contracts";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import {
  enrollmentButtonLabel,
  enrollmentStepMessage,
  type EnrollmentFlowPhase,
} from "@/lib/enrollment/enrollmentFlow";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { waitForSuccessfulTx } from "@/lib/wallet/runContractTx";
import { TxErrorAlert } from "@/components/shared/TxErrorAlert";
import {
  alertWarningClass,
  btnSuccessClass,
  btnVioletClass,
  messageBoxClass,
  portalCardClass,
} from "@/lib/ui/portalClasses";

const MOCK_ERC20_MINT_ABI = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const REGISTRATION_FEE_FALLBACK = 10_000_000n; // 10 USDC (6 decimals), matches SetupAnvilDev

export function StudentEnrollmentPanel({ embedded = false }: { embedded?: boolean }) {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const enrollmentToken = deployment?.enrollmentToken;

  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [flowPhase, setFlowPhase] = useState<EnrollmentFlowPhase>("idle");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);

  const isProcessing = flowPhase !== "idle" || isMinting;

  const checksEnabled = Boolean(deployment && address && enrollmentToken);
  const { invalidate } = useLiveContractReads(checksEnabled);

  const { writeContractAsync, isPending, reset } = useWriteContract();

  const readQuery = { enabled: checksEnabled };

  const { data: isEnrolled } = useReadContract({
    address: deployment?.studentRegistry,
    abi: StudentRegistryABI,
    functionName: "isStudentEnrolled",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(deployment && address) },
  });

  const { data: hasPaidFee } = useReadContract({
    address: deployment?.feeManager,
    abi: FeeManagerABI,
    functionName: "hasPaidFee",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(deployment && address) },
  });

  const { data: feeAmount } = useReadContract({
    address: deployment?.feeManager,
    abi: FeeManagerABI,
    functionName: "getFeeAmountForToken",
    args: enrollmentToken ? [enrollmentToken] : undefined,
    query: readQuery,
  });

  const fee = feeAmount ?? 0n;
  const effectiveFee = fee > 0n ? fee : REGISTRATION_FEE_FALLBACK;
  const feeDisplay = formatUnits(effectiveFee, 6);

  const { data: tokenBalance } = useReadContract({
    address: enrollmentToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: readQuery,
  });

  const { data: allowance } = useReadContract({
    address: enrollmentToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && deployment ? [address, deployment.universityCore] : undefined,
    query: { enabled: checksEnabled && Boolean(deployment) },
  });

  const balance = tokenBalance ?? 0n;
  const allowed = allowance ?? 0n;
  const networkConfigured = Boolean(deployment);
  const needsMint = checksEnabled && balance < effectiveFee;
  const needsApprove = checksEnabled && allowed < effectiveFee;
  const alreadyRequested = Boolean(hasPaidFee) && !isEnrolled;
  const alreadyEnrolled = Boolean(isEnrolled);

  const requestDisabled =
    isProcessing ||
    isPending ||
    !isConnected ||
    !networkConfigured ||
    alreadyEnrolled ||
    alreadyRequested ||
    needsMint;

  const requestButtonLabel = enrollmentButtonLabel(flowPhase, {
    alreadyEnrolled,
    alreadyRequested,
    needsApprove,
  });

  const flowStepMessage = enrollmentStepMessage(flowPhase) ?? stepMessage;

  const waitAndRefresh = async (hash: `0x${string}`) => {
    if (!publicClient) return;
    await waitForSuccessfulTx(publicClient, hash);
    await invalidate();
  };

  const handleMintTestUsdc = async () => {
    if (!deployment?.enrollmentToken || !address || !publicClient) return;
    reset();
    setLocalError(null);
    setIsMinting(true);
    setStepMessage("Minting test tokens...");
    try {
      const amount = effectiveFee * 2n;
      const hash = await writeContractAsync({
        address: deployment.enrollmentToken,
        abi: MOCK_ERC20_MINT_ABI,
        functionName: "mint",
        args: [address, amount],
      });
      await waitAndRefresh(hash);
      setStepMessage("Mock USDC received in your wallet.");
    } catch (e) {
      setStepMessage(null);
      setLocalError(formatTxError(e));
    } finally {
      setIsMinting(false);
    }
  };

  const handleRequestEnrollment = async () => {
    if (isProcessing || isPending) return;
    if (!isConnected || !deployment?.enrollmentToken || !address || !publicClient) {
      alert("Connect your wallet on Anvil (31337) and run: make setup-dev");
      return;
    }

    if (fee === 0n) {
      alert("Enrollment token is not configured. Run: make setup-dev");
      return;
    }

    if (isEnrolled) {
      alert("You are already enrolled.");
      return;
    }

    if (hasPaidFee) {
      alert("You already submitted a request. Wait for admin acceptance.");
      return;
    }

    if (balance < effectiveFee) {
      alert("Insufficient balance. Click “Get Mock USDC (test)” first.");
      return;
    }

    reset();
    setLocalError(null);
    setStepMessage(null);

    try {
      let currentAllowance = allowed;

      if (currentAllowance < effectiveFee) {
        setFlowPhase("approve-sign");
        const approveHash = await writeContractAsync({
          address: deployment.enrollmentToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [deployment.universityCore, effectiveFee],
        });
        setFlowPhase("approve-confirm");
        await waitForSuccessfulTx(publicClient, approveHash);
        await invalidate();
        currentAllowance = effectiveFee;
      }

      if (currentAllowance < effectiveFee) {
        throw new Error("USDC approval did not complete. Try again.");
      }

      setFlowPhase("enroll-sign");
      const enrollHash = await writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "requestEnrollment",
        args: [deployment.enrollmentToken],
      });
      setFlowPhase("enroll-confirm");
      await waitForSuccessfulTx(publicClient, enrollHash);
      await invalidate();
      setStepMessage("Request submitted. An admin can accept your enrollment.");
    } catch (e) {
      setStepMessage(null);
      setLocalError(formatTxError(e));
    } finally {
      setFlowPhase("idle");
    }
  };

  if (!enrollmentToken) {
    return (
      <div className={`${alertWarningClass} w-full max-w-md text-sm`}>
        <p className="font-semibold mb-1">Enrollment token missing</p>
        <p>
          Run <span className="font-mono">make setup-dev</span> then{" "}
          <span className="font-mono">make sync-frontend</span> to register Mock USDC.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${portalCardClass} w-full ${embedded ? "" : "max-w-md"}`}
    >
      {!embedded && (
        <>
          <h2 className="portal-page-title !text-xl mb-2">Student: Request enrollment</h2>
          <p className="text-xs text-uc-muted mb-4">
            Pay the fee in Mock USDC; an admin accepts with your matriculation number.
          </p>
        </>
      )}

      <div className="flex flex-col gap-4">
        <div className="text-[10px] text-uc-muted uppercase tracking-wider">
          Network:{" "}
          <span className="font-mono text-uc-cyan">
            {chainId ?? "—"} {networkConfigured ? "✓" : "(not configured)"}
          </span>
        </div>

        {address && (
          <div className="text-[10px] text-uc-muted/80 font-mono break-all">Wallet: {address}</div>
        )}

        <div className="text-xs space-y-1 text-uc-muted">
          <p className="font-mono text-[10px] break-all">Token: {enrollmentToken}</p>
          <p>Fee: {feeDisplay} USDC</p>
          <p>Balance: {formatUnits(balance, 6)} USDC</p>
          <p className={hasPaidFee ? "text-emerald-300" : ""}>
            Request submitted: {hasPaidFee ? "yes" : "no"}
          </p>
          <p className={isEnrolled ? "text-emerald-300" : ""}>
            Enrolled: {isEnrolled ? "yes" : "no"}
          </p>
        </div>

        {needsMint && isConnected && (
          <button
            type="button"
            onClick={handleMintTestUsdc}
            disabled={isProcessing || isPending}
            className={btnVioletClass}
          >
            {isMinting ? "Processing…" : "Get Mock USDC (test)"}
          </button>
        )}

        <button
          type="button"
          onClick={handleRequestEnrollment}
          disabled={requestDisabled}
          className={requestDisabled ? "portal-btn portal-btn-secondary w-full opacity-50 cursor-not-allowed" : btnSuccessClass}
        >
          {requestButtonLabel}
        </button>

        {flowStepMessage && <p className={messageBoxClass}>{flowStepMessage}</p>}

        {localError && <TxErrorAlert message={localError} />}
      </div>
    </div>
  );
}
