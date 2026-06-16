export const StudentRegistryABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "coreContract",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "enrollStudent",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "studentIdHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "expellStudent",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getStudentId",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStudentMetadata",
    "inputs": [
      {
        "name": "studentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUniversityCoreContract",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "graduateStudent",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasStudentGraduated",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isStudentEnrolled",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isStudentExpelled",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "s_studentIdCounter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "s_studentIsActive",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "isActive",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "s_studentToId",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "studentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "s_students",
    "inputs": [
      {
        "name": "studentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "studentIdHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "registrationTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "graduationTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "hasGraduated",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "isExpelled",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "StudentEnrolled",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "studentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StudentGraduated",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "studentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "StudentRevoked",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "studentId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "StudentRegistry__AddressZero",
    "inputs": []
  },
  {
    "type": "error",
    "name": "StudentRegistry__InvalidStudentId",
    "inputs": [
      {
        "name": "studentId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "StudentRegistry__NotCore",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "StudentRegistry__StudentAlreadyEnrolled",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "StudentRegistry__StudentAlreadyGraduated",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "StudentRegistry__StudentIsExpelled",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "StudentRegistry__StudentNotEnrolled",
    "inputs": [
      {
        "name": "student",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;
