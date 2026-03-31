export const UniversityCoreABI = [
    {
        "type": "constructor",
        "inputs": [
            {
                "name": "facultyName",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "ADMIN_ROLE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "DEFAULT_ADMIN_ROLE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "DIPLOMA_ISSUER_ROLE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "PROFESSOR_ROLE",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "addDiplomaIssuer",
        "inputs": [
            {
                "name": "issuer",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "addProfessor",
        "inputs": [
            {
                "name": "professor",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "addSubject",
        "inputs": [
            {
                "name": "name",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "credits",
                "type": "uint8",
                "internalType": "uint8"
            },
            {
                "name": "professor",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "addSubject",
        "inputs": [
            {
                "name": "name",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "credits",
                "type": "uint8",
                "internalType": "uint8"
            }
        ],
        "outputs": [],
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
                "name": "registrationNumber",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getCertificationContract",
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
        "name": "getGradebookContract",
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
        "name": "getRoleAdmin",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getStudentRegistryContract",
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
        "name": "grantRole",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "hasRole",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "account",
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
        "name": "issueDiploma",
        "inputs": [
            {
                "name": "student",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "degreeTitle",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "major",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "subjectIds",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "postGrade",
        "inputs": [
            {
                "name": "student",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "subjectId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "grade",
                "type": "uint8",
                "internalType": "uint8"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "renounceRole",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "callerConfirmation",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "revokeRole",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "s_certificationContract",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract ICertification"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_facultyName",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_gradebookContract",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract IGradebook"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_studentRegistryContract",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract IStudentRegistry"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "setCertificationContract",
        "inputs": [
            {
                "name": "certificationContract",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setGradebookContract",
        "inputs": [
            {
                "name": "gradebookContract",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setStudentRegistryContract",
        "inputs": [
            {
                "name": "studentRegistryContract",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setSubjectActivity",
        "inputs": [
            {
                "name": "subjectId",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "isActive",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "supportsInterface",
        "inputs": [
            {
                "name": "interfaceId",
                "type": "bytes4",
                "internalType": "bytes4"
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
        "type": "event",
        "name": "CertificationContractSet",
        "inputs": [
            {
                "name": "newCertificationContract",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "oldCertificationContract",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DiplomaIssuerAdded",
        "inputs": [
            {
                "name": "issuer",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "FacultyNameSet",
        "inputs": [
            {
                "name": "facultyName",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "GradebookContractSet",
        "inputs": [
            {
                "name": "newGradebookContract",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "oldGradebookContract",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ProfessorAdded",
        "inputs": [
            {
                "name": "professor",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RoleAdminChanged",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "previousAdminRole",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "newAdminRole",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RoleGranted",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "sender",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "RoleRevoked",
        "inputs": [
            {
                "name": "role",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "account",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "sender",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "StudentRegistryContractSet",
        "inputs": [
            {
                "name": "newStudentRegistryContract",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "oldStudentRegistryContract",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "AccessControlBadConfirmation",
        "inputs": []
    },
    {
        "type": "error",
        "name": "AccessControlUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "neededRole",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "UniversityCore__AccountIsNotProfessor",
        "inputs": [
            {
                "name": "professor",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "UniversityCore__AddressZero",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UniversityCore__CertificationNotSet",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UniversityCore__ContractDoesNotSupportIERC4671",
        "inputs": [
            {
                "name": "verifiedContract",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "UniversityCore__FacultyNameZero",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UniversityCore__GradebookNotSet",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UniversityCore__SameAddress",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UniversityCore__StudentAlreadyHasDiploma",
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
        "name": "UniversityCore__StudentEnrolledAlready",
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
        "name": "UniversityCore__StudentIsNotEnrolled",
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
        "name": "UniversityCore__StudentRegistryNotSet",
        "inputs": []
    }
] as const;

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
        "name": "balanceOf",
        "inputs": [
            {
                "name": "owner",
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
        "name": "enrollStudent",
        "inputs": [
            {
                "name": "student",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "faculty",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "registrationNumber",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getStudentMetadata",
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
            },
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "",
                "type": "string",
                "internalType": "string"
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
        "name": "hasValid",
        "inputs": [
            {
                "name": "owner",
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
        "name": "isValid",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
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
        "name": "ownerOf",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
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
        "name": "revoke",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "s_balances",
        "inputs": [
            {
                "name": "student",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "balance",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_owners",
        "inputs": [
            {
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "student",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_studentToTokenId",
        "inputs": [
            {
                "name": "student",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "tokenId",
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
                "name": "tokenId",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "registrationDate",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "faculty",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "registrationNumber",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "revoked",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "s_tokenIdCounter",
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
        "name": "supportsInterface",
        "inputs": [
            {
                "name": "interfaceId",
                "type": "bytes4",
                "internalType": "bytes4"
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
        "type": "event",
        "name": "Minted",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Revoked",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "tokenId",
                "type": "uint256",
                "indexed": false,
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
        "name": "StudentRegistry__InvalidTokenId",
        "inputs": [
            {
                "name": "tokenId",
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