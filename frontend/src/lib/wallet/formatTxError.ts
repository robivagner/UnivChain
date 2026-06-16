import { BaseError } from "viem";

/** Human-readable explanations for on-chain custom errors used by UnivChain. */
const FRIENDLY_REVERTS: Record<string, string> = {
  UniversityCore__StudentIsNotEnrolled:
    "That wallet is not an enrolled student. Only enrolled students can receive this action.",
  UniversityCore__StudentIsExpelled: "That student has been expelled and cannot participate.",
  UniversityCore__StudentEnrolledAlready: "That wallet is already enrolled.",
  UniversityCore__StudentHasAlreadyGraduated: "That student has already graduated.",
  UniversityCore__StudentAlreadyHasDiploma: "That student already holds a diploma.",
  UniversityCore__StudentAlreadyRequestedEnroll:
    "That wallet already has a pending enrollment request.",
  UniversityCore__FeeNotPaid: "The student has not paid the enrollment fee.",
  UniversityCore__TokenIsNotAllowed: "This payment token is not accepted for enrollment.",
  UniversityCore__AccountIsNotProfessor: "That address does not have the professor role.",
  UniversityCore__NotInitialized: "UniversityCore is not initialized on this deployment.",
  UniversityCore__AddressZero: "A required address was zero.",
  StudentRegistry__StudentNotEnrolled: "That wallet is not an enrolled student.",
  StudentRegistry__StudentAlreadyEnrolled: "That wallet is already enrolled.",
  StudentRegistry__StudentIsExpelled: "That student has been expelled.",
  StudentRegistry__StudentAlreadyGraduated: "That student has already graduated.",
  Gradebook__NotProfessorOfSubject: "You are not the professor assigned to this subject.",
  Gradebook__SubjectIdOutOfBounds: "That subject ID does not exist.",
  Gradebook__SubjectNotActive: "That subject is inactive.",
  Gradebook__GradeOutOfBounds: "Grade must be between 1 and 10.",
  Gradebook__SubjectNameEmpty: "Subject name cannot be empty.",
  Gradebook__CreditsOutOfBounds: "Credits must be between 1 and 30.",
  Certification__StudentAlreadyHasDiploma: "That student already has a diploma.",
  Certification__NotEnoughCredits: "The student does not have enough credits to graduate.",
  Certification__AverageTooLow: "The student's average is below the graduation minimum.",
  Certification__DiplomaDoesNotExist: "That diploma token ID does not exist.",
  Certification__DiplomaAlreadyRevoked: "That diploma has already been revoked.",
  Certification__InvalidCredentialAnchor: "Metadata URI is required when attaching a credential.",
  Certification__CredentialAlreadyAttached: "This diploma already has credential metadata attached.",
  FeeManager__NotEnoughFunds: "Treasury does not hold enough tokens for this withdrawal.",
  FeeManager__TokenNotAllowed: "This token is not configured for enrollment fees.",
  FeeManager__FeeNotPaid: "No enrollment fee was paid for that student.",
  FeeManager__FeeAlreadyPaid: "That student already paid the enrollment fee.",
};

function extractRevertName(message: string): string | undefined {
  const match = message.match(/\b([A-Za-z]+__\w+)\b/);
  return match?.[1];
}

function collectErrorMessages(error: unknown): string[] {
  if (!(error instanceof BaseError)) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const messages: string[] = [error.shortMessage, error.message];
  let current: Error | undefined =
    error.cause instanceof Error ? error.cause : undefined;

  while (current) {
    if (current instanceof BaseError) {
      messages.push(current.shortMessage, current.message);
    } else {
      messages.push(current.message);
    }
    current = current.cause instanceof Error ? current.cause : undefined;
  }

  return messages;
}

/** Turn wallet/RPC/contract revert errors into actionable messages. */
export function formatTxError(error: unknown): string {
  const messages = collectErrorMessages(error);
  const raw = messages.join("\n");

  if (/nonce too low/i.test(raw)) {
    return [
      "Wallet nonce out of sync with Anvil (not a contract rejection).",
      "In MetaMask: Settings → Advanced → Clear activity tab data for this account, then retry.",
      "Or restart Anvil with make local and reset the account again.",
    ].join(" ");
  }

  if (/user rejected|user denied/i.test(raw)) {
    return "Transaction cancelled in the wallet.";
  }

  for (const message of messages) {
    const revertName = extractRevertName(message);
    if (revertName && FRIENDLY_REVERTS[revertName]) {
      return FRIENDLY_REVERTS[revertName];
    }
  }

  if (/reverted|status:\s*"?reverted"?/i.test(raw)) {
    const revertName = extractRevertName(raw);
    if (revertName) {
      return `Transaction reverted: ${revertName.replace(/__/g, " → ").replace(/_/g, " ")}.`;
    }
    return "Transaction reverted on-chain. Check inputs and student status, then try again.";
  }

  const firstLine = messages.find((m) => m.trim().length > 0)?.trim();
  return firstLine ?? "Transaction failed.";
}
