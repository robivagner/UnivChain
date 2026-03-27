// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

/// @title Interface for University Gradebook
/// @notice Manages subjects, ECTS credits, and student grading history
interface IGradebook {
    struct Subject {
        string name; // Name of the subject
        uint8 credits; // ECTS (European Credit Transfer and Accumulation System) credits
        address professor; // Address of the professor
        bool isActive; // If the subject is active or not (ex. if we are in 2nd semester but the subject is from the 1st)
    }

    struct GradeRecord {
        uint8 grade; // Grade of the student on a particular subject (from 1-10)
        uint256 timestamp; // Block timestamp of grading
        address professor; // Professor who submitted the grade
    }

    /// @notice Registers a new subject into the gradebook
    /// @param name The official name of the course
    /// @param credits Number of ECTS credits associated with the subject
    /// @param professor The address of the professor leading the course
    function addSubject(string calldata name, uint8 credits, address professor) external;

    /// @notice Records a grade for a student in a specific subject
    /// @dev Also updates the total ECTS credits for the student if the grade is passable (>= 5)
    /// @param professor The address of the professor giving the grade (verified by Core)
    /// @param student The address of the student receiving the grade
    /// @param subjectId The unique identifier of the subject
    /// @param grade The numeric grade awarded
    function postGrade(address professor, address student, uint256 subjectId, uint8 grade) external;

    function setSubjectActivity(address professor, uint256 subjectId, bool isActive) external;

    /// @notice Fetches details about a specific subject
    /// @param subjectId The ID of the subject to query
    /// @return name Name of the subject
    /// @return credits ECTS credits
    /// @return professor Assigned professor's address
    /// @return isActive Current status of the subject
    function getSubjectMetadata(uint256 subjectId)
        external
        view
        returns (string memory name, uint8 credits, address professor, bool isActive);

    function getStudentCredits(address student) external view returns (uint256);

    function getUniversityCoreContract() external view returns (address);

    function getStudentGradeRecordOfSubject(address student, uint256 subjectId)
        external
        view
        returns (uint8, uint256, address);

    function getWeightedAverage(address student, uint256[] calldata subjectIds) external view returns (uint256 average);
}
