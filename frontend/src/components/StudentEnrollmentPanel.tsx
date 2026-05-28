"use client";

import { useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { UniversityCoreABI } from "@/abi/UniversityCore";
import { StudentRegistryABI } from "@/abi/StudentRegistry";
import { FeeManagerABI } from "@/abi/FeeManager";
import { getDeployment } from "@/lib/contracts";
import { useLiveContractReads } from "@/lib/useLiveContractReads";

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

export function StudentEnrollmentPanel() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const deployment = chainId !== undefined ? getDeployment(chainId) : undefined;
  const enrollmentToken = deployment?.enrollmentToken;

  const [stepMessage, setStepMessage] = useState<string | null>(null);

  const checksEnabled = Boolean(deployment && address && enrollmentToken);
  const { invalidate } = useLiveContractReads(checksEnabled);

  const { writeContractAsync, isPending, error: writeError, reset } = useWriteContract();

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
    isPending ||
    !isConnected ||
    !networkConfigured ||
    alreadyEnrolled ||
    alreadyRequested ||
    needsMint;

  const requestButtonLabel = (() => {
    if (isPending) return "Processing...";
    if (alreadyEnrolled) return "Already enrolled";
    if (alreadyRequested) return "Already requested enrollment";
    if (needsApprove) return "Approve & request enrollment";
    return "Request enrollment";
  })();

  const waitAndRefresh = async (hash: `0x${string}`) => {
    if (!publicClient) return;
    await publicClient.waitForTransactionReceipt({ hash });
    await invalidate();
  };

  const handleMintTestUsdc = async () => {
    if (!deployment?.enrollmentToken || !address || !publicClient) return;
    reset();
    setStepMessage("Minting test tokens...");
    const amount = effectiveFee * 2n;
    const hash = await writeContractAsync({
      address: deployment.enrollmentToken,
      abi: MOCK_ERC20_MINT_ABI,
      functionName: "mint",
      args: [address, amount],
    });
    await waitAndRefresh(hash);
    setStepMessage("Mock USDC received in your wallet.");
  };

  const handleRequestEnrollment = async () => {
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
    try {
      if (allowed < effectiveFee) {
        setStepMessage("Approving fee transfer...");
        const approveHash = await writeContractAsync({
          address: deployment.enrollmentToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [deployment.universityCore, effectiveFee],
        });
        await waitAndRefresh(approveHash);
      }

      setStepMessage("Submitting enrollment request...");
      const enrollHash = await writeContractAsync({
        address: deployment.universityCore,
        abi: UniversityCoreABI,
        functionName: "requestEnrollment",
        args: [deployment.enrollmentToken],
      });
      await waitAndRefresh(enrollHash);
      setStepMessage("Request submitted. An admin can accept your enrollment.");
    } catch {
      setStepMessage(null);
    }
  };

  if (!enrollmentToken) {
    return (
      <div className="p-6 bg-amber-50 rounded-xl border border-amber-200 w-full max-w-md text-sm text-amber-900">
        <p className="font-semibold mb-1">Enrollment token missing</p>
        <p>
          Run <span className="font-mono">make setup-dev</span> then{" "}
          <span className="font-mono">make sync-frontend</span> to register Mock USDC.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200 w-full max-w-md">
      <h2 className="text-xl font-bold mb-2 text-gray-800">Student: Request enrollment</h2>
      <p className="text-xs text-slate-500 mb-4">
        Pay the fee in Mock USDC; an admin accepts with your matriculation number.
      </p>

      <div className="flex flex-col gap-4">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">
          Network:{" "}
          <span className="font-mono text-blue-600">
            {chainId ?? "—"} {networkConfigured ? "✓" : "(not configured)"}
          </span>
        </div>

        {address && (
          <div className="text-[10px] text-gray-400 font-mono break-all">Wallet: {address}</div>
        )}

        <div className="text-xs space-y-1 text-slate-700">
          <p className="font-mono text-[10px] break-all">Token: {enrollmentToken}</p>
          <p>Fee: {feeDisplay} USDC</p>
          <p>Balance: {formatUnits(balance, 6)} USDC</p>
          <p className={hasPaidFee ? "text-green-700" : "text-slate-600"}>
            Request submitted: {hasPaidFee ? "yes" : "no"}
          </p>
          <p className={isEnrolled ? "text-green-700" : "text-slate-600"}>
            Enrolled: {isEnrolled ? "yes" : "no"}
          </p>
        </div>

        {needsMint && isConnected && (
          <button
            type="button"
            onClick={handleMintTestUsdc}
            disabled={isPending}
            className="py-2 rounded font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400"
          >
            {isPending ? "Processing..." : "Get Mock USDC (test)"}
          </button>
        )}

        <button
          type="button"
          onClick={handleRequestEnrollment}
          disabled={requestDisabled}
          className={`py-2 rounded font-semibold transition ${
            requestDisabled
              ? "bg-slate-300 text-slate-600 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {requestButtonLabel}
        </button>

        {stepMessage && (
          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-2">
            {stepMessage}
          </p>
        )}

        {writeError && (
          <div className="p-2 bg-red-50 border border-red-100 rounded">
            <p className="text-red-600 text-[10px] font-mono break-words">{writeError.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
