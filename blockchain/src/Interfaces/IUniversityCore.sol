// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Core (The Hub)
/// @notice Acts as the central orchestrator and access control layer for the entire system
interface IUniversityCore {
    /// @notice Returns the hash of the PROFESSOR_ROLE
    function PROFESSOR_ROLE() external view returns (bytes32);

    /// @notice Returns the hash of the ADMIN_ROLE
    function ADMIN_ROLE() external view returns (bytes32);

    /// @notice Updates the address of the Identity module
    /// @param studentRegistryContract The address of the new Identity contract
    function setStudentRegistryContract(address studentRegistryContract) external;

    /// @notice Updates the address of the Gradebook module
    /// @param gradebookContract The address of the new Gradebook contract
    function setGradebookContract(address gradebookContract) external;

    /// @notice Updates the address of the Certification module
    /// @param certificationContract The address of the new Certification contract
    function setCertificationContract(address certificationContract) external;

    function addProfessor(address professor) external;

    function addDiplomaIssuer(address issuer) external;

    /// @notice Gateway function to mint a student identity through the Identity module
    /// @param student Wallet address of the student
    /// @param registrationNumber University matriculation number
    function enrollStudent(address student, string calldata registrationNumber) external;

    function addSubject(string memory name, uint8 credits, address professor) external;

    /// @notice Gateway function for professors to post grades through the Gradebook module
    /// @dev Verifies that the student has a valid identity before proceeding
    /// @param student Wallet address of the student
    /// @param subjectId The unique ID of the subject
    /// @param grade The numeric grade (1-10)
    function postGrade(address student, uint256 subjectId, uint8 grade) external;

    function setSubjectActivity(uint256 subjectId, bool isActive) external;

    function issueDiploma(
        address student,
        string calldata degreeTitle,
        string calldata major,
        uint256[] calldata subjectIds
    ) external;

    function getStudentRegistryContract() external view returns (address);

    function getGradebookContract() external view returns (address);

    function getCertificationContract() external view returns (address);
}
