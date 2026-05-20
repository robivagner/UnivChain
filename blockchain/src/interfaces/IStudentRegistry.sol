// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Identity Management
/// @notice Defines the student structure and core identity functions for Soulbound Tokens.
interface IStudentRegistry {
    /// @dev Core data structure defining a student's academic status.
    struct Student {
        bytes32 studentIdHash; // Secure hash of the physical matriculation number
        uint256 registrationTimestamp; // Epoch timestamp when the student was enrolled
        uint256 graduationTimestamp; // Epoch timestamp when the student graduated (0 if active)
        bool hasGraduated; // True if the student has finished their studies
        bool isExpelled; // True if the student was removed from the university
    }

    /// @notice Issues a new Soulbound NFT to a student, acting as their digital university ID.
    /// @dev Can only be called by the UniversityCore contract.
    /// @param student The wallet address of the student.
    /// @param studentIdHash The hash of the unique university registration ID (matricola).
    function enrollStudent(address student, bytes32 studentIdHash) external;

    /// @notice Finalizes a student's academic journey upon receiving a diploma.
    /// @dev Burns the active student NFT and updates the graduation metadata.
    /// @param student The wallet address of the graduating student.
    function graduateStudent(address student) external;

    /// @notice Revokes a student's academic status.
    /// @dev Burns the student's NFT token and permanently marks 'isExpelled' as true.
    /// @param student The wallet address of the expelled student.
    function expellStudent(address student) external;

    /// @notice Fetches the full metadata record of a student by their Token ID.
    /// @param tokenId The Soulbound NFT token identifier.
    /// @return studentIdHash The hashed matriculation number.
    /// @return registrationTimestamp The time of enrollment.
    /// @return graduationTimestamp The time of graduation (if applicable).
    /// @return hasGraduated Boolean indicating graduation status.
    /// @return isExpelled Boolean indicating expulsion status.
    function getStudentMetadata(uint256 tokenId) external view returns (bytes32, uint256, uint256, bool, bool);

    /// @notice Returns the address of the central University Core contract orchestrating this module.
    /// @return The address of the Core contract.
    function getUniversityCoreContract() external view returns (address);

    /// @notice Checks if a student currently holds an active identity NFT.
    /// @param student The wallet address to query.
    /// @return True if the student is currently enrolled and has an unburned token.
    function isStudentEnrolled(address student) external view returns (bool);

    /// @notice Checks if a student has been expelled from the university.
    /// @param student The wallet address to query.
    /// @return True if the student is marked as expelled.
    function isStudentExpelled(address student) external view returns (bool);

    /// @notice Checks if a student has successfully graduated.
    /// @param student The wallet address to query.
    /// @return True if the student is marked as graduated.
    function hasStudentGraduated(address student) external view returns (bool);
}
