// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IUniversityCore} from "../interfaces/IUniversityCore.sol";
import {IGradebook} from "../interfaces/IGradebook.sol";

/**
 * @title Gradebook
 * @notice Academic recording engine storing subjects, evaluating student marks, and keeping ECTS balances.
 * @dev Implements the IGradebook interface and handles multi-layered parameter assertions.
 */
contract Gradebook is IGradebook {
    // Errors
    error Gradebook__NotCore(address sender);
    error Gradebook__AddressZero();
    error Gradebook__SubjectNotActive(uint256 subjectId);
    error Gradebook__NotProfessorOfSubject(address wrongProfessor, uint256 subjectId);
    error Gradebook__GradeOutOfBounds(uint256 grade);
    error Gradebook__SubjectIdOutOfBounds(uint256 subjectId, uint256 subjectIdCounter);
    error Gradebook__CreditsOutOfBounds(uint8 credits);
    error Gradebook__SubjectNameEmpty();

    // State variables
    uint256 public constant WEIGHTED_AVERAGE_PRECISION = 100;
    uint8 public constant PASSING_GRADE = 5;
    uint8 public constant MIN_SUBJECT_CREDITS = 1;
    uint8 public constant MAX_SUBJECT_CREDITS = 30;

    IUniversityCore immutable i_coreContract;

    uint256 public s_subjectIdCounter;
    mapping(uint256 subjectId => Subject) public s_subjects;
    mapping(address student => mapping(uint256 subjectId => GradeRecord)) public s_studentGrades;
    mapping(address student => uint256 credits) public s_studentCredits;
    mapping(address student => uint256[] subjectIds) public s_studentSubjectIds;

    // Events
    event SubjectAdded(uint256 indexed subjectId, string name, uint8 credits);
    event GradePosted(address indexed student, uint256 subjectId, uint8 grade);
    event SubjectActivityChanged(uint256 subjectId, bool isActive);

    // Modifiers
    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert Gradebook__NotCore(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructor sets up tracking registries and links the core permissions contract.
     * @param coreContract Central master configuration directory address.
     */
    constructor(address coreContract) {
        if (coreContract == address(0)) {
            revert Gradebook__AddressZero();
        }

        i_coreContract = IUniversityCore(coreContract);
        s_subjectIdCounter = 1;
    }

    //////////////////////////////
    /////// Core Functions ///////
    //////////////////////////////

    /// @inheritdoc IGradebook
    function addSubject(string memory name, uint8 credits, address professor) external onlyCore {
        if (bytes(name).length == 0) {
            revert Gradebook__SubjectNameEmpty();
        }
        if (credits < MIN_SUBJECT_CREDITS || credits > MAX_SUBJECT_CREDITS) {
            revert Gradebook__CreditsOutOfBounds(credits);
        }
        if (professor == address(0)) {
            revert Gradebook__AddressZero();
        }

        uint256 subjectId = s_subjectIdCounter++;
        s_subjects[subjectId] = Subject({name: name, credits: credits, professor: professor, isActive: true});
        emit SubjectAdded(subjectId, name, credits);
    }

    /// @inheritdoc IGradebook
    function postGrade(address professor, address student, uint256 subjectId, uint8 grade) external onlyCore {
        Subject memory subject = s_subjects[subjectId];
        GradeRecord storage record = s_studentGrades[student][subjectId];

        _validateGradePost(subject, professor, subjectId, grade);

        uint8 oldGrade = record.grade;
        bool isUpdate = oldGrade != 0;

        if (!isUpdate && !subject.isActive) {
            revert Gradebook__SubjectNotActive(subjectId);
        }

        if (!isUpdate) {
            s_studentSubjectIds[student].push(subjectId);
        }

        _adjustStudentCredits(student, subject.credits, oldGrade, grade);

        record.grade = grade;
        record.timestamp = block.timestamp;
        record.professor = professor;

        emit GradePosted(student, subjectId, grade);
    }

    /// @inheritdoc IGradebook
    function setSubjectActivity(address professor, uint256 subjectId, bool isActive) external onlyCore {
        if (subjectId >= s_subjectIdCounter) {
            revert Gradebook__SubjectIdOutOfBounds(subjectId, s_subjectIdCounter);
        }

        Subject storage subject = s_subjects[subjectId];
        if (professor != subject.professor) {
            revert Gradebook__NotProfessorOfSubject(professor, subjectId);
        }

        subject.isActive = isActive;

        emit SubjectActivityChanged(subjectId, isActive);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    /// @inheritdoc IGradebook
    function getSubjectMetadata(uint256 subjectId) external view returns (string memory, uint8, address, bool) {
        if (subjectId >= s_subjectIdCounter) {
            revert Gradebook__SubjectIdOutOfBounds(subjectId, s_subjectIdCounter);
        }

        Subject memory subject = s_subjects[subjectId];
        return (subject.name, subject.credits, subject.professor, subject.isActive);
    }

    /// @inheritdoc IGradebook
    function getStudentGradeRecordOfSubject(address student, uint256 subjectId)
        external
        view
        returns (uint8, uint256, address)
    {
        GradeRecord memory grades = s_studentGrades[student][subjectId];
        return (grades.grade, grades.timestamp, grades.professor);
    }

    /// @inheritdoc IGradebook
    function getStudentCredits(address student) external view returns (uint256) {
        return s_studentCredits[student];
    }

    /// @inheritdoc IGradebook
    function getStudentSubjectIds(address student) external view returns (uint256[] memory) {
        return s_studentSubjectIds[student];
    }

    /// @inheritdoc IGradebook
    function getUniversityCoreContract() external view returns (address) {
        return address(i_coreContract);
    }

    /// @inheritdoc IGradebook
    function getWeightedAverage(address student) external view returns (uint256 average) {
        uint256[] memory subjectIds = s_studentSubjectIds[student];

        uint256 totalCredits;
        uint256 totalWeightedPoints;
        for (uint256 i = 0; i < subjectIds.length; i++) {
            uint256 id = subjectIds[i];
            uint8 grade = s_studentGrades[student][id].grade;

            if (grade < PASSING_GRADE) {
                continue;
            }

            uint8 credits = s_subjects[id].credits;
            totalWeightedPoints += uint256(grade) * uint256(credits);
            totalCredits += uint256(credits);
        }

        if (totalCredits == 0) {
            return 0;
        }

        return (totalWeightedPoints * WEIGHTED_AVERAGE_PRECISION) / totalCredits;
    }

    //////////////////////////////////
    /////// Internal Functions ///////
    //////////////////////////////////

    /**
     * @notice Validates professor, bounds, and grade range for posting or updating a mark.
     */
    function _validateGradePost(Subject memory subject, address professor, uint256 subjectId, uint8 grade)
        internal
        view
    {
        if (subjectId >= s_subjectIdCounter) {
            revert Gradebook__SubjectIdOutOfBounds(subjectId, s_subjectIdCounter);
        }
        if (professor != subject.professor) {
            revert Gradebook__NotProfessorOfSubject(professor, subjectId);
        }
        if (grade > 10 || grade < 1) {
            revert Gradebook__GradeOutOfBounds(grade);
        }
    }

    /**
     * @notice Adjusts accumulated ECTS when a grade is first posted or updated (e.g. after a retake).
     */
    function _adjustStudentCredits(address student, uint8 subjectCredits, uint8 oldGrade, uint8 newGrade) internal {
        if (oldGrade >= PASSING_GRADE) {
            s_studentCredits[student] -= subjectCredits;
        }
        if (newGrade >= PASSING_GRADE) {
            s_studentCredits[student] += subjectCredits;
        }
    }
}
