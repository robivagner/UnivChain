// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IERC4671} from "./IERC4671.sol";

/// @title Interface for University Certifications
/// @notice Manages the issuance of final diplomas as Soulbound Tokens
interface ICertification is IERC4671 {
    struct Diploma {
        uint256 finalAverage; // Weighted average (multiplied by 100)
        uint256 issueDate; // Timestamp
        string degreeTitle; // e.g., "Bachelor of Computer Science"
        string major; // Field of study
    }

    /// @notice Issues a diploma to a student after verifying all academic requirements
    /// @dev Can only be called by UniversityCore
    /// @param student The address of the graduating student
    /// @param degreeTitle The title bestowed (e.g. Bachelor, Master)
    /// @param major The specific field of study
    function issueDiploma(
        address student,
        string calldata degreeTitle,
        string calldata major,
        uint256 credits,
        uint256 average
    ) external;

    /// @notice Returns the diploma details for a specific token ID
    function getDiplomaMetadata(uint256 tokenId) external view returns (uint256, uint256, string memory, string memory);

    function getDiplomaIdForStudent(address student) external view returns (uint256);

    function getUniversityCoreContract() external view returns (address);
}
