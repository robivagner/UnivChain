// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC165} from "./Interfaces/IERC165.sol";
import {IERC4671} from "./Interfaces/IERC4671.sol";
import "./Identity.sol";

contract Gradebook is AccessControl {
    // Errors

    // State variables

    Identity public identityContract;

    struct Subject {
        string name;
        // ECTS (European Credit Transfer and Accumulation System) credits
        uint8 credits;
        address professor;
        bool isActive;
    }

    struct GradeRecord {
        uint8 grade;
        uint256 timestamp;
        address professor;
    }

    mapping(string subjectCode => Subject) public subjects;
    mapping(address student => mapping(string subjectCode => GradeRecord)) public studentGrades;
    mapping(address student => uint256 credits) public studentCredits;

    // Events

    event SubjectAdded(string subjectCode, string name, uint8 credits);
    event GradePosted(address indexed student, string subjectCode, uint8 grade);

    // Functions

    constructor(address _identityContract) {
        require(_identityContract != address(0), "Identity contract is zero address.");
        // Verify ERC-165 support for the expected Identity interface.
        require(
            IERC165(_identityContract).supportsInterface(type(IERC4671).interfaceId),
            "Identity contract must implement IERC4671."
        );

        identityContract = Identity(_identityContract);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function addSubject(string memory subjectCode, string memory name, uint8 credits, address professor)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        subjects[subjectCode] = Subject({name: name, credits: credits, professor: professor, isActive: true});
        emit SubjectAdded(subjectCode, name, credits);
    }

    function postGrade(address student, string memory subjectCode, uint8 grade) external {
        Subject memory subject = subjects[subjectCode];
        require(subject.isActive, "Subject is not active.");
        require(msg.sender == subject.professor, "Sender is not the professor of the subject.");
        require(
            identityContract.hasRole(identityContract.PROFESSOR_ROLE(), msg.sender),
            "Not an authorized professor in the Identity contract."
        );
        require(identityContract.hasValid(student), "Student does not exist.");
        require(grade <= 10, "Grade can't be greater then 10.");

        // if the student got a passable grade and he did not have a grade before or was not passing add the ects credits to the total
        if (grade >= 5 && studentGrades[student][subjectCode].grade < 5) {
            studentCredits[student] += subject.credits;
        } else if (grade < 5 && studentGrades[student][subjectCode].grade >= 5) {
            studentCredits[student] -= subject.credits;
        }

        studentGrades[student][subjectCode] =
            GradeRecord({grade: grade, timestamp: block.timestamp, professor: msg.sender});

        emit GradePosted(student, subjectCode, grade);
    }

    //TODO maybe add a function that calculates current weighted average of the student?
}
