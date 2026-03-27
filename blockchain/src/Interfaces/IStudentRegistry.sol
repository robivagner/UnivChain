// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC4671} from "./IERC4671.sol";

/// @title Interface for University Identity Management
/// @notice Defines the student structure and core identity functions for Soulbound Tokens (ERC-4671)
interface IStudentRegistry is IERC4671 {
    struct Student {
        uint256 registrationDate;
        string faculty;
        string registrationNumber;
        bool revoked;
    }

    /// @notice Issues a new Identity Soulbound Token to a student
    /// @dev Can only be called by the UniversityCore contract
    /// @param student The wallet address of the student
    /// @param faculty The faculty the student is enrolled in
    /// @param registrationNumber The unique university registration ID (matricola)
    function enrollStudent(address student, string calldata faculty, string calldata registrationNumber) external;

    /// @notice Revokes a student's identity token (e.g., in case of expulsion)
    /// @dev Marks the 'revoked' status as true in the Student struct
    /// @param tokenId The unique ID of the token to be revoked
    function revoke(uint256 tokenId) external;

    function getStudentMetadata(address student) external view returns (uint256, string memory, string memory, bool);

    function getUniversityCoreContract() external view returns (address);
}
