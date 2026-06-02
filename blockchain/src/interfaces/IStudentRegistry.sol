// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Identity Management
/// @notice Defines the student structure and enrollment lifecycle in contract storage.
/// @dev Implemented by the StudentRegistry contract to manage student status records.
interface IStudentRegistry {
    /// @dev Core data structure defining a student's academic status.
    struct Student {
        bytes32 studentIdHash; // Secure hash of the physical matriculation number
        uint256 registrationTimestamp; // Epoch timestamp when the student was enrolled
        uint256 graduationTimestamp; // Epoch timestamp when the student graduated (0 if active)
        bool hasGraduated; // True if the student has finished their studies
        bool isExpelled; // True if the student was removed from the university
    }

    /// @notice Registers a student as actively enrolled.
    /// @dev Can only be called by the UniversityCore contract.
    /// @param student The wallet address of the student.
    /// @param studentIdHash The hash of the unique university registration ID (matricola).
    function enrollStudent(address student, bytes32 studentIdHash) external;

    /// @notice Finalizes a student's academic journey upon receiving a diploma.
    /// @dev Marks the student inactive and updates graduation metadata.
    /// @param student The wallet address of the graduating student.
    function graduateStudent(address student) external;

    /// @notice Revokes a student's active enrollment due to disciplinary actions.
    /// @dev Marks the student inactive and permanently sets `isExpelled`.
    /// @param student The wallet address of the expelled student.
    function expellStudent(address student) external;

    /// @notice Fetches the full metadata record of a student by their record ID.
    /// @param tokenId The sequential student record identifier.
    /// @return studentIdHash The hashed matriculation number.
    /// @return registrationTimestamp The block timestamp of enrollment.
    /// @return graduationTimestamp The block timestamp of graduation (0 if not graduated).
    /// @return hasGraduated Boolean indicating graduation status.
    /// @return isExpelled Boolean indicating expulsion status.
    function getStudentMetadata(uint256 tokenId)
        external
        view
        returns (
            bytes32 studentIdHash,
            uint256 registrationTimestamp,
            uint256 graduationTimestamp,
            bool hasGraduated,
            bool isExpelled
        );

    /// @notice Returns the address of the central University Core contract orchestrating this module.
    /// @return coreAddress The address of the Core contract.
    function getUniversityCoreContract() external view returns (address coreAddress);

    /// @notice Checks if a student is currently enrolled and active.
    /// @param student The wallet address to query.
    /// @return isEnrolled True if the student is actively enrolled.
    function isStudentEnrolled(address student) external view returns (bool isEnrolled);

    /// @notice Checks if a student has been expelled from the university.
    /// @param student The wallet address to query.
    /// @return isExpelled True if the student is marked as expelled.
    function isStudentExpelled(address student) external view returns (bool isExpelled);

    /// @notice Checks if a student has successfully graduated.
    /// @param student The wallet address to query.
    /// @return hasGraduated True if the student is marked as graduated.
    function hasStudentGraduated(address student) external view returns (bool hasGraduated);

    /// @notice Retrieves the sequential record ID associated with a student address.
    /// @param student The wallet address of the student.
    /// @return tokenId The student record identifier (0 if never registered).
    function getStudentTokenId(address student) external view returns (uint256 tokenId);
}
