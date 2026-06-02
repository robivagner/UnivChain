import { formatTxError } from "@/lib/wallet/formatTxError";

export type EnrollmentFlowPhase =
  | "idle"
  | "approve-sign"
  | "approve-confirm"
  | "enroll-sign"
  | "enroll-confirm";

export function enrollmentButtonLabel(
  phase: EnrollmentFlowPhase,
  opts: {
    alreadyEnrolled: boolean;
    alreadyRequested: boolean;
    needsApprove: boolean;
  }
): string {
  if (phase !== "idle") return "Processing…";

  if (opts.alreadyEnrolled) return "Already enrolled";
  if (opts.alreadyRequested) return "Already requested enrollment";
  if (opts.needsApprove) return "Approve & request enrollment";
  return "Request enrollment";
}

export function enrollmentStepMessage(phase: EnrollmentFlowPhase): string | null {
  switch (phase) {
    case "approve-sign":
      return "Sign the USDC approval in your wallet…";
    case "approve-confirm":
      return "Waiting for approval to confirm on-chain…";
    case "enroll-sign":
      return "Sign the enrollment request in your wallet…";
    case "enroll-confirm":
      return "Waiting for enrollment request to confirm…";
    default:
      return null;
  }
}

export { formatTxError };
