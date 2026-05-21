// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Core (The Hub)
/// @notice Acts as the central orchestrator and access control layer for the entire UnivChain system.
interface IUniversityCore {
    /// @notice Returns the Keccak-256 hash of the PROFESSOR_ROLE.
    function PROFESSOR_ROLE() external view returns (bytes32);

    /// @notice Returns the Keccak-256 hash of the ADMIN_ROLE.
    function ADMIN_ROLE() external view returns (bytes32);

    /// @notice Returns the Keccak-256 hash of the DIPLOMA_ISSUER_ROLE.
    function DIPLOMA_ISSUER_ROLE() external view returns (bytes32);

    /// @notice Initializes the protocol by linking the external module contracts.
    /// @dev Reverts if already initialized or if any address is zero.
    /// @param studentRegistry The address of the deployed Student Registry contract.
    /// @param gradebook The address of the deployed Gradebook contract.
    /// @param certification The address of the deployed Certification contract.
    /// @param feeManager The address of the deployed Fee Manager contract.
    function initializeCore(address studentRegistry, address gradebook, address certification, address feeManager)
        external;

    /// @notice Updates the address of the Identity module (Student Registry).
    /// @dev Can only be called by an Admin. Checks for zero address and IERC721 interface support.
    /// @param studentRegistry The address of the new Identity contract.
    function setStudentRegistryContract(address studentRegistry) external;

    /// @notice Updates the address of the Gradebook module.
    /// @dev Can only be called by an Admin. Checks for zero address and avoids redundant updates.
    /// @param gradebook The address of the new Gradebook contract.
    function setGradebookContract(address gradebook) external;

    /// @notice Updates the address of the Certification module.
    /// @dev Can only be called by an Admin. Checks for zero address and IERC721 interface support.
    /// @param certification The address of the new Certification contract.
    function setCertificationContract(address certification) external;

    /// @notice Updates the address of the Fee Manager module.
    /// @dev Can only be called by an Admin. Checks for zero address and avoids redundant updates.
    /// @param feeManager The address of the new Fee Manager contract.
    function setFeeManagerContract(address feeManager) external;

    /// @notice Grants the PROFESSOR_ROLE to a specified address.
    /// @dev Can only be called by an Admin. Emits a `ProfessorAdded` event.
    /// @param professor The wallet address to be authorized as a professor.
    function addProfessor(address professor) external;

    /// @notice Grants the DIPLOMA_ISSUER_ROLE to a specified address (e.g., University Secretariat).
    /// @dev Can only be called by an Admin. Emits a `DiplomaIssuerAdded` event.
    /// @param issuer The wallet address authorized to issue diplomas.
    function addDiplomaIssuer(address issuer) external;

    /// @notice Sets or updates the registration fee for a specific ERC20 token.
    /// @dev Can only be called by an Admin. Forwards the configuration to the FeeManager contract.
    /// @param token The address of the ERC20 token (e.g., USDC).
    /// @param feeAmount The exact amount required (including decimals).
    function setTokenFee(address token, uint256 feeAmount) external;

    /// @notice Withdraws accumulated registration fees from the FeeManager to a specified wallet.
    /// @dev Can only be called by an Admin. Checks for zero address on destination.
    /// @param token The address of the ERC20 token to withdraw.
    /// @param destination The wallet address receiving the funds.
    /// @param amount The amount of tokens to withdraw.
    function withdrawUniversityFunds(address token, address destination, uint256 amount) external;

    /// @notice Gateway function to accept a student's enrollment after a successful application review.
    /// @dev Can only be called by an Admin. Consumes the fee voucher and mints the Identity SBT.
    /// @param student Wallet address of the student being admitted.
    /// @param studentIdHash University matriculation number hashed securely.
    function acceptEnrollment(address student, bytes32 studentIdHash) external;

    /// @notice Rejects a pending student registration, triggering an automatic refund of their fee.
    /// @dev Can only be called by an Admin. Requires the student to have an unconsumed paid fee voucher.
    /// @param student Wallet address of the student whose application is rejected.
    function rejectEnrollment(address student) external;

    /// @notice Gateway function to formally expel a student from the university.
    /// @dev Can only be called by an Admin. Marks status as expelled and burns the identity NFT in the Registry.
    /// @param student Wallet address of the student to be expelled.
    function expellStudent(address student) external;

    /// @notice Gateway function for admins to create a new subject and assign it to a professor.
    /// @dev Can only be called by an Admin. Validates that the target professor has the PROFESSOR_ROLE.
    /// @param name The official name of the course.
    /// @param credits Number of ECTS credits associated with the subject.
    /// @param professor The address of the authorized professor leading the course.
    function addSubject(string memory name, uint8 credits, address professor) external;

    /// @notice Gateway function for professors to create their own subject.
    /// @dev Can only be called by an authorized Professor. Automatically assigns `msg.sender` as the instructor.
    /// @param name The official name of the course.
    /// @param credits Number of ECTS credits associated with the subject.
    function addSubject(string memory name, uint8 credits) external;

    /// @notice Gateway function for professors to post grades through the Gradebook module.
    /// @dev Can only be called by an authorized Professor. Verifies student registration status first.
    /// @param student Wallet address of the student being graded.
    /// @param subjectId The unique ID of the subject.
    /// @param grade The numeric grade (1-10).
    function postGrade(address student, uint256 subjectId, uint8 grade) external;

    /// @notice Gateway function to toggle the active status of a subject (e.g., closing it at the end of a semester).
    /// @dev Can only be called by an authorized Professor.
    /// @param subjectId The unique identifier of the subject.
    /// @param isActive Boolean indicating whether grading is currently open for this subject.
    function setSubjectActivity(uint256 subjectId, bool isActive) external;

    /// @notice Gateway function to finalize a student's studies and issue their degree.
    /// @dev Can only be called by a Diploma Issuer. Grabs ECTS/GPA metrics, graduates the student, and mints the Diploma SBT.
    /// @param student The address of the graduating student.
    /// @param degreeTitle The title bestowed (e.g., "Bachelor of Computer Science").
    /// @param major The specific field of study (e.g., "Software Engineering").
    function graduateStudentAndIssueDiploma(address student, string calldata degreeTitle, string calldata major)
        external;

    /// @notice Public permissionless entry point for students to apply and pay their registration fee.
    /// @dev Pulls tokens from student to Core, grants allowance to FeeManager, and registers the payment voucher.
    /// @param token The contract address of the ERC20 token used for payment.
    function requestEnrollment(address token) external;

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
