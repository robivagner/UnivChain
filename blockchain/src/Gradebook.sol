// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IUniversityCore} from "./Interfaces/IUniversityCore.sol";
import {IGradebook} from "./Interfaces/IGradebook.sol";

contract Gradebook is IGradebook {
    // Errors

    error Gradebook__NotCore(address sender);
    error Gradebook__AddressZero();
    error Gradebook__SubjectNotActive(uint256 subjectId);
    error Gradebook__NotProfessorOfSubject(address wrongProfessor, uint256 subjectId);
    error Gradebook__GradeGreaterThanTen(uint256 grade);
    error Gradebook__SubjectIdOutOfBounds(uint256 subjectId, uint256 upperBound);

    // State variables

    IUniversityCore immutable i_coreContract;

    uint256 public s_subjectId;

    mapping(uint256 subjectId => Subject) public s_subjects;
    mapping(address student => mapping(uint256 subjectId => GradeRecord)) public s_studentGrades;
    mapping(address student => uint256 credits) public s_studentCredits;

    // Events

    event SubjectAdded(uint256 indexed subjectId, string name, uint8 credits);
    event GradePosted(address indexed student, uint256 subjectId, uint8 grade);

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
        s_subjectId = 1;
    }

    function addSubject(string memory name, uint8 credits, address professor) external override onlyCore {
        uint256 subjectId = s_subjectId++;
        s_subjects[subjectId] = Subject({name: name, credits: credits, professor: professor, isActive: true});
        emit SubjectAdded(subjectId, name, credits);
    }

    function postGrade(address professor, address student, uint256 subjectId, uint8 grade) external override onlyCore {
        Subject memory subject = s_subjects[subjectId];
        if (!subject.isActive) {
            revert Gradebook__SubjectNotActive(subjectId);
        }
        if (professor != subject.professor) {
            revert Gradebook__NotProfessorOfSubject(professor, subjectId);
        }
        if (grade > 10) {
            revert Gradebook__GradeGreaterThanTen(grade);
        }

        // if the student got a passable grade and he did not have a grade before or was not passing add the ects credits to the total
        if (grade >= 5 && s_studentGrades[student][subjectId].grade < 5) {
            s_studentCredits[student] += subject.credits;
        } else if (grade < 5 && s_studentGrades[student][subjectId].grade >= 5) {
            s_studentCredits[student] -= subject.credits;
        }

        s_studentGrades[student][subjectId] =
            GradeRecord({grade: grade, timestamp: block.timestamp, professor: professor});

        emit GradePosted(student, subjectId, grade);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function getSubjectMetadata(uint256 subjectId)
        external
        view
        override
        returns (string memory, uint8, address, bool)
    {
        if (subjectId >= s_subjectId) {
            revert Gradebook__SubjectIdOutOfBounds(subjectId, s_subjectId);
        }

        Subject memory subject = s_subjects[subjectId];

        return (subject.name, subject.credits, subject.professor, subject.isActive);
    }

    function getStudentCredits(address student) external view override returns (uint256) {
        return s_studentCredits[student];
    }

    //TODO maybe add a function that calculates current weighted average of the student?
}
