import { encodeAbiParameters, keccak256 } from "viem";

/** Matches `keccak256(abi.encode(studentId))` in Solidity tests. */
export function hashStudentMatriculation(studentId: string): `0x${string}` {
  return keccak256(encodeAbiParameters([{ type: "string" }], [studentId.trim()]));
}
