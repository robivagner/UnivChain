// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Gradebook
/// @notice Manages subjects, ECTS credits tracking, and student grading history securely.
/// @dev Implemented by the Gradebook contract to manage institutional academic logs.
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
    /// @dev Can only be called via the UniversityCore contract. Generates a unique sequential subject ID.
    /// @param name The official name of the course.
    /// @param credits Number of ECTS credits associated with the subject.
    /// @param professor The address of the professor leading the course.
    function addSubject(string calldata name, uint8 credits, address professor) external;

    /// @notice Records or updates a grade for a student in a specific subject.
    /// @dev First post requires an active subject; updates are allowed when inactive (retakes). Credits and
    /// weighted average follow the latest grade. Adds credits when grade >= 5.
    /// @param professor The address of the professor attempting to post the grade.
    /// @param student The address of the student receiving the grade.
    /// @param subjectId The unique identifier of the subject.
    /// @param grade The numeric grade awarded.
    function postGrade(address professor, address student, uint256 subjectId, uint8 grade) external;

    /// @notice Toggles a subject's availability for grading.
    /// @dev Verifies that the message sender matches the assigned subject professor.
    /// @param professor The address attempting to change the status.
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
    /// @dev Credits are incremented exclusively when a grade of 5 or higher is obtained.
    /// @param student The address of the student to query.
    /// @return credits Total sum of ECTS credits from all passed subjects.
    function getStudentCredits(address student) external view returns (uint256 credits);

    /// @notice Lists subject IDs for which a student has at least one grade entry recorded.
    /// @param student The address of the student to query.
    /// @return subjectIds Array of subject IDs with grade records for the student.
    function getStudentSubjectIds(address student) external view returns (uint256[] memory subjectIds);

    /// @notice Returns the address of the central University Core contract orchestrating this module.
    /// @return coreAddress The contract address of UniversityCore.
    function getUniversityCoreContract() external view returns (address coreAddress);

    /// @notice Retrieves a specific grade record for a student in a given subject.
    /// @param student The address of the student.
    /// @param subjectId The ID of the subject queried.
    /// @return grade The numeric grade received (1-10, 0 if ungraded).
    /// @return timestamp The exact block timestamp the grade was recorded.
    /// @return professor The address of the professor who graded the student.
    function getStudentGradeRecordOfSubject(address student, uint256 subjectId)
        external
        view
        returns (uint8 grade, uint256 timestamp, address professor);

    /// @notice Computes the weighted average over passed subjects only (grade >= 5).
    /// @dev Uses the same ECTS weights as credit accumulation. Precision multiplier 100 (e.g., 9.50 as 950).
    /// @param student The address of the student to calculate the average for.
    /// @return average The calculated weighted average scaled by the precision factor.
    function getWeightedAverage(address student) external view returns (uint256 average);

    /// @notice Returns true if the student has at least one graded subject with a failing mark (grade < 5).
    /// @dev Graduation requires every recorded subject to be passed; retakes that raise the grade clear the flag.
    /// @param student The address of the student to query.
    /// @return hasFailed True when any subject grade is below the passing threshold.
    function hasFailedSubject(address student) external view returns (bool hasFailed);
}
