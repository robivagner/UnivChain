// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IUniversityCore} from "../interfaces/IUniversityCore.sol";
import {IGradebook} from "../interfaces/IGradebook.sol";

contract Gradebook is IGradebook {
    // Errors

    error Gradebook__NotCore(address sender);
    error Gradebook__AddressZero();
    error Gradebook__SubjectNotActive(uint256 subjectId);
    error Gradebook__NotProfessorOfSubject(address wrongProfessor, uint256 subjectId);
    error Gradebook__GradeGreaterThanTen(uint256 grade);
    error Gradebook__SubjectIdOutOfBounds(uint256 subjectId, uint256 upperBound);
    error Gradebook__GradeAlreadyGiven(address student, uint256 subjectId, uint8 grade);

    // State variables

    uint256 public constant WEIGHTED_AVERAGE_PRECISION = 100;

    IUniversityCore immutable i_coreContract;

    uint256 public s_tokenIdCounter;
    mapping(uint256 subjectId => Subject) public s_subjects;
    mapping(address student => mapping(uint256 subjectId => GradeRecord)) public s_studentGrades;
    mapping(address student => uint256 credits) public s_studentCredits;
    mapping(address student => uint256[] subjectIds) public s_studentSubjectIds;

    // Events

    event SubjectAdded(uint256 indexed subjectId, string name, uint8 credits);
    event GradePosted(address indexed student, uint256 subjectId, uint8 grade);
    event SubjectActivityChanged(uint256 subjectId, bool isActive);

    // Functions

    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert Gradebook__NotCore(msg.sender);
        }
        _;
    }

    constructor(address coreContract) {
        if (coreContract == address(0)) {
            revert Gradebook__AddressZero();
        }

        i_coreContract = IUniversityCore(coreContract);

        s_tokenIdCounter = 1;
    }

    function addSubject(string memory name, uint8 credits, address professor) external onlyCore {
        uint256 subjectId = s_tokenIdCounter++;
        s_subjects[subjectId] = Subject({name: name, credits: credits, professor: professor, isActive: true});
        emit SubjectAdded(subjectId, name, credits);
    }

    function postGrade(address professor, address student, uint256 subjectId, uint8 grade) external onlyCore {
        Subject memory subject = s_subjects[subjectId];
        GradeRecord storage record = s_studentGrades[student][subjectId];

        _postGradeChecks(record, subject, student, professor, subjectId, grade);

        if (grade >= 5) {
            s_studentCredits[student] += subject.credits;
        }

        s_studentSubjectIds[student].push(subjectId);

        record.grade = grade;
        record.timestamp = block.timestamp;
        record.professor = professor;

        emit GradePosted(student, subjectId, grade);
    }

    function setSubjectActivity(address professor, uint256 subjectId, bool isActive) external onlyCore {
        if (subjectId >= s_tokenIdCounter) {
            revert Gradebook__SubjectIdOutOfBounds(subjectId, s_tokenIdCounter);
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

    function getSubjectMetadata(uint256 subjectId) external view returns (string memory, uint8, address, bool) {
        if (subjectId >= s_tokenIdCounter) {
            revert Gradebook__SubjectIdOutOfBounds(subjectId, s_tokenIdCounter);
        }

        Subject memory subject = s_subjects[subjectId];

        return (subject.name, subject.credits, subject.professor, subject.isActive);
    }

    function getStudentGradeRecordOfSubject(address student, uint256 subjectId)
        external
        view
        returns (uint8, uint256, address)
    {
        GradeRecord memory grades = s_studentGrades[student][subjectId];

        return (grades.grade, grades.timestamp, grades.professor);
    }

    function getStudentCredits(address student) external view returns (uint256) {
        return s_studentCredits[student];
    }

    function getUniversityCoreContract() external view returns (address) {
        return address(i_coreContract);
    }

    function getWeightedAverage(address student) external view returns (uint256 average) {
        uint256[] memory subjectIds = s_studentSubjectIds[student];

        uint256 totalCredits;
        uint256 totalWeightedPoints;
        for (uint256 i = 0; i < subjectIds.length; i++) {
            uint256 id = subjectIds[i];
            uint8 grade = s_studentGrades[student][id].grade;
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

    function _postGradeChecks(
        GradeRecord memory record,
        Subject memory subject,
        address student,
        address professor,
        uint256 subjectId,
        uint8 grade
    ) internal view {
        if (record.grade != 0) {
            revert Gradebook__GradeAlreadyGiven(student, subjectId, grade);
        }
        if (subjectId >= s_tokenIdCounter) {
            revert Gradebook__SubjectIdOutOfBounds(subjectId, s_tokenIdCounter);
        }
        if (!subject.isActive) {
            revert Gradebook__SubjectNotActive(subjectId);
        }
        if (professor != subject.professor) {
            revert Gradebook__NotProfessorOfSubject(professor, subjectId);
        }
        if (grade > 10) {
            revert Gradebook__GradeGreaterThanTen(grade);
        }
    }
}
