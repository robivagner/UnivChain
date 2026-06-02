export const GradebookABI = [
  {
    type: "function",
    name: "s_tokenIdCounter",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "s_studentSubjectIds",
    inputs: [{ name: "student", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
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
  {
    type: "function",
    name: "getStudentCredits",
    inputs: [{ name: "student", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWeightedAverage",
    inputs: [{ name: "student", type: "address" }],
    outputs: [{ name: "average", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
