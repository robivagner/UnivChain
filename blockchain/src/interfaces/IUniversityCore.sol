// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Core (The Hub)
/// @notice Acts as the central orchestrator and access control layer for the entire UnivChain system.
interface IUniversityCore {
    /// @notice Returns the Keccak-256 hash of the PROFESSOR_ROLE.
    function PROFESSOR_ROLE() external view returns (bytes32);

    /// @notice Returns the Keccak-256 hash of the ADMIN_ROLE.
    function ADMIN_ROLE() external view returns (bytes32);

    /// @notice Initializes the protocol by linking the external module contracts.
    /// @dev Reverts if already initialized or if any address is zero.
    /// @param studentRegistry The address of the deployed Student Registry contract.
    /// @param gradebook The address of the deployed Gradebook contract.
    /// @param certification The address of the deployed Certification contract.
    /// @param feeManager The address of the deployed Fee Manager contract.
    function initializeCore(address studentRegistry, address gradebook, address certification, address feeManager)
        external;

    /// @notice Updates the address of the Identity module (Student Registry).
    /// @param studentRegistry The address of the new Identity contract.
    function setStudentRegistryContract(address studentRegistry) external;

    /// @notice Updates the address of the Gradebook module.
    /// @param gradebook The address of the new Gradebook contract.
    function setGradebookContract(address gradebook) external;

    /// @notice Updates the address of the Certification module.
    /// @param certification The address of the new Certification contract.
    function setCertificationContract(address certification) external;

    /// @notice Updates the address of the Fee Manager module.
    /// @param feeManager The address of the new Fee Manager contract.
    function setFeeManagerContract(address feeManager) external;

    /// @notice Grants the PROFESSOR_ROLE to a specified address.
    /// @param professor The wallet address to be authorized as a professor.
    function addProfessor(address professor) external;

    /// @notice Grants the DIPLOMA_ISSUER_ROLE to a specified address (e.g., University Secretariat).
    /// @param issuer The wallet address authorized to issue diplomas.
    function addDiplomaIssuer(address issuer) external;

    /// @notice Sets or updates the registration fee for a specific ERC20 token.
    /// @dev Can only be called by an Admin.
    /// @param token The address of the ERC20 token (e.g., USDC).
    /// @param feeAmount The exact amount required (including decimals).
    function setTokenFee(address token, uint256 feeAmount) external;

    /// @notice Withdraws accumulated registration fees to a specified wallet.
    /// @dev Can only be called by an Admin.
    /// @param token The address of the ERC20 token to withdraw.
    /// @param destination The wallet address receiving the funds.
    /// @param amount The amount of tokens to withdraw.
    function withdrawUniversityFunds(address token, address destination, uint256 amount) external;

    /// @notice Gateway function to mint a student identity through the Student Registry.
    /// @dev Can only be called by an Admin. Requires the student to have paid the fee first.
    /// @param student Wallet address of the student.
    /// @param studentIdHash University matriculation number hashed securely.
    function enrollStudent(address student, bytes32 studentIdHash) external;

    /// @notice Gateway function to formally expell a student from the university.
    /// @dev Burns the student's identity NFT in the Registry.
    /// @param student Wallet address of the student to be expelled.
    function expellStudent(address student) external;

    /// @notice Gateway function for admins to create a new subject and assign it to a professor.
    /// @param name The official name of the course.
    /// @param credits Number of ECTS credits associated with the subject.
    /// @param professor The address of the authorized professor leading the course.
    function addSubject(string memory name, uint8 credits, address professor) external;

    /// @notice Gateway function for professors to create their own subject.
    /// @dev Automatically assigns `msg.sender` as the professor for this subject.
    /// @param name The official name of the course.
    /// @param credits Number of ECTS credits associated with the subject.
    function addSubject(string memory name, uint8 credits) external;

    /// @notice Gateway function for professors to post grades through the Gradebook module.
    /// @dev Verifies that the student has a valid identity and is not expelled/graduated before proceeding.
    /// @param student Wallet address of the student.
    /// @param subjectId The unique ID of the subject.
    /// @param grade The numeric grade (1-10).
    function postGrade(address student, uint256 subjectId, uint8 grade) external;

    /// @notice Gateway function to toggle the active status of a subject (e.g., closing it at the end of a semester).
    /// @param subjectId The unique identifier of the subject.
    /// @param isActive Boolean indicating whether grading is currently open for this subject.
    function setSubjectActivity(uint256 subjectId, bool isActive) external;

    /// @notice Gateway function to finalize a student's studies and issue their degree.
    /// @dev Automatically triggers `graduateStudent` in the Registry and `issueDiploma` in the Certification contract.
    /// @param student The address of the graduating student.
    /// @param degreeTitle The title bestowed (e.g., "Bachelor of Computer Science").
    /// @param major The specific field of study (e.g., "Software Engineering").
    function graduateStudentAndIssueDiploma(address student, string calldata degreeTitle, string calldata major)
        external;

    /// @notice Retrieves the current address of the linked Student Registry contract.
    /// @return The contract address.
    function getStudentRegistryContract() external view returns (address);

    /// @notice Retrieves the current address of the linked Gradebook contract.
    /// @return The contract address.
    function getGradebookContract() external view returns (address);

    /// @notice Retrieves the current address of the linked Certification contract.
    /// @return The contract address.
    function getCertificationContract() external view returns (address);

    /// @notice Retrieves the official name of the faculty/university.
    /// @return The name string.
    function getFacultyName() external view returns (string memory);
}
