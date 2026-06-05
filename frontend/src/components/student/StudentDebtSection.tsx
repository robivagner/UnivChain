"use client";

import { useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import type { UnivChainDeployment } from "@/constants/contracts";
import { useLiveContractReads } from "@/lib/useLiveContractReads";
import { formatTxError } from "@/lib/wallet/formatTxError";
import { runContractTx, waitForSuccessfulTx } from "@/lib/wallet/runContractTx";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import {
  alertWarningClass,
  btnAccentClass,
  btnGhostClass,
  portalCardClass,
  portalSectionTitleClass,
} from "@/lib/ui/portalClasses";

const USDC_DECIMALS = 6;

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

type Props = {
  deployment: UnivChainDeployment;
  debtOwed: bigint;
};

export function StudentDebtSection({ deployment, debtOwed }: Props) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { invalidate } = useLiveContractReads(true);
  const { writeContractAsync, isPending, reset } = useWriteContract();
  const { notifyError, notifySuccess } = useNotifications();
  const [isMinting, setIsMinting] = useState(false);

  const paymentToken = deployment.enrollmentToken;

  const { data: tokenBalance } = useReadContract({
    address: paymentToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(paymentToken && address) },
  });

  const { data: allowance } = useReadContract({
    address: paymentToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && paymentToken ? [address, deployment.universityCore] : undefined,
    query: { enabled: Boolean(paymentToken && address) },
  });

  if (debtOwed === 0n) {
    return null;
  }

  const owedDisplay = formatUnits(debtOwed, USDC_DECIMALS);
  const balance = tokenBalance ?? 0n;
  const allowed = allowance ?? 0n;
  const needsMint = balance < debtOwed;
  const needsApprove = allowed < debtOwed;

  const handleMintTestUsdc = async () => {
    if (!paymentToken || !address || !publicClient) return;
    reset();
    setIsMinting(true);
    try {
      const amount = debtOwed * 2n;
      const hash = await writeContractAsync({
        address: paymentToken,
        abi: MOCK_ERC20_MINT_ABI,
        functionName: "mint",
        args: [address, amount],
      });
      await waitForSuccessfulTx(publicClient, hash);
      await invalidate();
      notifySuccess("Mock USDC received in your wallet.");
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    } finally {
      setIsMinting(false);
    }
  };

  const handlePayDebt = async () => {
    if (!paymentToken || !address || !publicClient) {
      notifyError("Connect your wallet on the configured network.");
      return;
    }
    if (needsMint) {
      notifyError('Insufficient balance. Click "Get Mock USDC (test)" first.');
      return;
    }

    reset();
    try {
      if (allowed < debtOwed) {
        const approveHash = await writeContractAsync({
          address: paymentToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [deployment.universityCore, debtOwed],
        });
        await waitForSuccessfulTx(publicClient, approveHash);
        await invalidate();
      }

      await runContractTx({
        publicClient,
        invalidate,
        write: () =>
          writeContractAsync({
            address: deployment.universityCore,
            abi: UniversityCoreABI,
            functionName: "payStudentDebt",
            args: [paymentToken, debtOwed],
          }),
      });
      notifySuccess("University debt paid. You can graduate once all other requirements are met.");
    } catch (e) {
      notifyError(formatTxError(e), "Transaction failed");
    }
  };

  return (
    <section className={`${portalCardClass} flex flex-col gap-4 border border-amber-400/20`}>
      <div className={alertWarningClass}>
        <h2 className={portalSectionTitleClass}>Outstanding university debt</h2>
        <p className="text-sm text-uc-muted mt-1">
          You owe retake or semester charges. This balance must be cleared before you can graduate.
        </p>
      </div>

      <div className="text-sm flex flex-col gap-1">
        <p>
          Amount due:{" "}
          <span className="font-mono font-medium text-amber-300">{owedDisplay} tokens</span>
        </p>
        <p className="text-xs text-uc-muted">
          Wallet balance: {formatUnits(balance, USDC_DECIMALS)} · Allowance for Core:{" "}
          {formatUnits(allowed, USDC_DECIMALS)}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {needsMint && paymentToken && (
          <button
            type="button"
            onClick={() => void handleMintTestUsdc()}
            disabled={isMinting || isPending}
            className={btnGhostClass}
          >
            {isMinting ? "Minting…" : "Get Mock USDC (test)"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handlePayDebt()}
          disabled={isPending || isMinting || needsMint}
          className={btnAccentClass}
        >
          {isPending ? "Processing…" : needsApprove ? "Approve & pay debt" : "Pay outstanding debt"}
        </button>
      </div>
    </section>
  );
}
