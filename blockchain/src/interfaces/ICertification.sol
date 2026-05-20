// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Certifications
/// @notice Manages the issuance of final academic diplomas as Soulbound Tokens (SBTs).
interface ICertification {
    /// @dev Core data structure defining the details of an issued diploma.
    struct Diploma {
        uint256 finalAverage; // The weighted average grade multiplied by a precision factor (e.g., 100)
        uint256 issueTimestamp; // Epoch timestamp of when the diploma was minted
        string degreeTitle; // The degree type (e.g., "Bachelor of Computer Science")
        string major; // The field of specialization
    }

    /// @notice Issues a non-transferable diploma to a student after verifying all academic requirements.
    /// @dev Can only be called by the UniversityCore contract. Reverts if credits are insufficient.
    /// @param student The address of the graduating student receiving the diploma.
    /// @param degreeTitle The title bestowed (e.g., "Bachelor of Science").
    /// @param major The specific field of study (e.g., "Cybersecurity").
    /// @param credits The total ECTS credits the student has accumulated.
    /// @param average The student's final weighted average grade.
    function issueDiploma(
        address student,
        string calldata degreeTitle,
        string calldata major,
        uint256 credits,
        uint256 average
    ) external;

    /// @notice Returns the full details of a specific diploma by its Token ID.
    /// @param tokenId The Soulbound NFT token identifier of the diploma.
    /// @return finalAverage The stored weighted average.
    /// @return issueTimestamp The exact time of issuance.
    /// @return degreeTitle The title of the degree.
    /// @return major The field of study.
    function getDiplomaMetadata(uint256 tokenId) external view returns (uint256, uint256, string memory, string memory);

    /// @notice Finds the Token ID of the diploma belonging to a specific student.
    /// @param student The wallet address of the graduate.
    /// @return The Token ID associated with the student's diploma.
    function getDiplomaIdForStudent(address student) external view returns (uint256);

    /// @notice Returns the address of the central University Core contract orchestrating this module.
    /// @return The address of the Core contract.
    function getUniversityCoreContract() external view returns (address);

    /// @notice Checks if a specific address has been issued a diploma.
    /// @param student The wallet address to query.
    /// @return True if the address owns a diploma SBT, false otherwise.
    function hasDiploma(address student) external view returns (bool);
}
