// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Gradebook
/// @notice Manages subjects, ECTS credits tracking, and student grading history securely.
interface IGradebook {
    /// @dev Structure defining an academic course/subject.
    struct Subject {
        string name; // Name of the subject
        uint8 credits; // ECTS (European Credit Transfer and Accumulation System) credits
        address professor; // Address of the professor in charge of grading
        bool isActive; // True if the subject is currently open for grading
    }

    /// @dev Structure defining a singular grade entry for a student.
    struct GradeRecord {
        uint8 grade; // Numeric grade awarded to the student (1-10)
        uint256 timestamp; // Block timestamp of when the grade was posted
        address professor; // Professor who submitted the grade
    }

    /// @notice Registers a new subject into the gradebook.
    /// @dev Can only be called via the UniversityCore contract.
    /// @param name The official name of the course.
    /// @param credits Number of ECTS credits associated with the subject.
    /// @param professor The address of the professor leading the course.
    function addSubject(string calldata name, uint8 credits, address professor) external;

    /// @notice Records a grade for a student in a specific subject.
    /// @dev Verifies that the grade is valid (<=10) and only given once. Adds credits if grade >= 5.
    /// @param professor The address of the professor attempting to post the grade.
    /// @param student The address of the student receiving the grade.
    /// @param subjectId The unique identifier of the subject.
    /// @param grade The numeric grade awarded.
    function postGrade(address professor, address student, uint256 subjectId, uint8 grade) external;

    /// @notice Toggles a subject's availability for grading.
    /// @param professor The address attempting to change the status (must match the subject's professor).
    /// @param subjectId The ID of the subject being updated.
    /// @param isActive True to open grading, false to close it.
    function setSubjectActivity(address professor, uint256 subjectId, bool isActive) external;

    /// @notice Fetches details about a specific registered subject.
    /// @param subjectId The ID of the subject to query.
    /// @return name Name of the subject.
    /// @return credits ECTS credits provided by the subject.
    /// @return professor Assigned professor's wallet address.
    /// @return isActive Current grading status of the subject.
    function getSubjectMetadata(uint256 subjectId)
        external
        view
        returns (string memory name, uint8 credits, address professor, bool isActive);

    /// @notice Calculates the total accumulated ECTS credits for a student.
    /// @param student The address of the student to query.
    /// @return The sum of credits from all passed subjects.
    function getStudentCredits(address student) external view returns (uint256);

    /// @notice Returns the address of the central University Core contract orchestrating this module.
    /// @return The address of the Core contract.
    function getUniversityCoreContract() external view returns (address);

    /// @notice Retrieves a specific grade record for a student.
    /// @param student The address of the student.
    /// @param subjectId The ID of the subject queried.
    /// @return grade The numeric grade received.
    /// @return timestamp The exact time the grade was recorded.
    /// @return professor The address of the professor who graded the student.
    function getStudentGradeRecordOfSubject(address student, uint256 subjectId)
        external
        view
        returns (uint8 grade, uint256 timestamp, address professor);

    /// @notice Computes the overall weighted average grade for a student based on their recorded grades and ECTS credits.
    /// @dev Uses a precision multiplier (e.g., 100) to represent decimals as integers.
    /// @param student The address of the student to calculate the average for.
    /// @return average The calculated weighted average.
    function getWeightedAverage(address student) external view returns (uint256 average);
}
