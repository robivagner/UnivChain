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

export const GradebookABI = [
  {
    type: "event",
    name: "SubjectAdded",
    inputs: [
      { name: "subjectId", type: "uint256", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "credits", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GradePosted",
    inputs: [
      { name: "student", type: "address", indexed: true },
      { name: "subjectId", type: "uint256", indexed: false },
      { name: "grade", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SubjectActivityChanged",
    inputs: [
      { name: "subjectId", type: "uint256", indexed: false },
      { name: "isActive", type: "bool", indexed: false },
    ],
  },
  {
    type: "function",
    name: "getSubjectMetadata",
    inputs: [{ name: "subjectId", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "credits", type: "uint8" },
      { name: "professor", type: "address" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getStudentGradeRecordOfSubject",
    inputs: [
      { name: "student", type: "address" },
      { name: "subjectId", type: "uint256" },
    ],
    outputs: [
      { name: "grade", type: "uint8" },
      { name: "timestamp", type: "uint256" },
      { name: "professor", type: "address" },
    ],
    stateMutability: "view",
  },
] as const;
