export const UniversityCoreABI = [
  {
    type: "event",
    name: "StudentEnrollmentRequested",
    inputs: [{ name: "student", type: "address", indexed: false }],
  },
  {
    type: "event",
    name: "StudentEnrollmentRejected",
    inputs: [{ name: "student", type: "address", indexed: false }],
  },
] as const;

export const StudentRegistryABI = [
  {
    type: "event",
    name: "StudentEnrolled",
    inputs: [
      { name: "student", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "function",
    name: "isStudentEnrolled",
    inputs: [{ name: "student", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasStudentGraduated",
    inputs: [{ name: "student", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;

export const FeeManagerABI = [
  {
    type: "function",
    name: "hasPaidFee",
    inputs: [{ name: "student", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
] as const;
