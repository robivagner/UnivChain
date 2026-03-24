// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC165} from "./Interfaces/IERC165.sol";
import {IUniversityCore} from "./Interfaces/IUniversityCore.sol";
import {IGradebook} from "./Interfaces/IGradebook.sol";
import {ICertification} from "./Interfaces/ICertification.sol";
import {IStudentRegistry, IERC4671} from "./Interfaces/IStudentRegistry.sol";

contract UniversityCore is IUniversityCore, AccessControl {
    // Errors

    error UniversityCore__AddressZero();
    error UniversityCore__SameAddress();
    error UniversityCore__FacultyNameZero();
    error UniversityCore__StudentIsNotEnrolled(address student);
    error UniversityCore__ContractDoesNotSupportIERC4671(address verifiedContract);

    // State variables
    bytes32 public constant PROFESSOR_ROLE = keccak256("PROFESSOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    string public s_facultyName;
    IStudentRegistry public s_studentRegistryContract;
    IGradebook public s_gradebookContract;
    ICertification public s_certificationContract;

    // Events

    event StudentRegistryContractSet(address newStudentRegistryContract, address oldStudentRegistryContract);
    event GradebookContractSet(address newGradebookContract, address oldGradebookContract);
    event CertificationSet(address newCertificationContract, address oldCertificationContract);
    event ProfessorAdded(address indexed professor);
    event FacultyNameSet(string facultyName);

    // Functions

    constructor(string memory facultyName, address owner) {
        if (owner == address(0)) {
            revert UniversityCore__AddressZero();
        }
        if (bytes(facultyName).length == 0) {
            revert UniversityCore__FacultyNameZero();
        }

        s_facultyName = facultyName;
        emit FacultyNameSet(facultyName);

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(ADMIN_ROLE, owner);
    }

    ////////////////////////////////////
    /////// Role Based Functions ///////
    ////////////////////////////////////

    function setStudentRegistryContract(address studentRegistryContract) external override onlyRole(ADMIN_ROLE) {
        if (studentRegistryContract == address(0)) {
            revert UniversityCore__AddressZero();
        }
        if (studentRegistryContract == address(s_studentRegistryContract)) {
            revert UniversityCore__SameAddress();
        }
        if (!IERC165(studentRegistryContract).supportsInterface(type(IERC4671).interfaceId)) {
            revert UniversityCore__ContractDoesNotSupportIERC4671(studentRegistryContract);
        }

        address oldStudentRegistryContract = address(s_studentRegistryContract);
        s_studentRegistryContract = IStudentRegistry(studentRegistryContract);

        emit StudentRegistryContractSet(studentRegistryContract, oldStudentRegistryContract);
    }

    function setGradebookContract(address gradebookContract) external override onlyRole(ADMIN_ROLE) {
        if (gradebookContract == address(0)) {
            revert UniversityCore__AddressZero();
        }
        if (gradebookContract == address(s_gradebookContract)) {
            revert UniversityCore__SameAddress();
        }

        address oldGradebookContract = address(s_gradebookContract);
        s_gradebookContract = IGradebook(gradebookContract);

        emit GradebookContractSet(gradebookContract, oldGradebookContract);
    }

    function setCertificationContract(address certificationContract) external override onlyRole(ADMIN_ROLE) {
        if (certificationContract == address(0)) {
            revert UniversityCore__AddressZero();
        }
        if (certificationContract == address(s_certificationContract)) {
            revert UniversityCore__SameAddress();
        }
        if (!IERC165(certificationContract).supportsInterface(type(IERC4671).interfaceId)) {
            revert UniversityCore__ContractDoesNotSupportIERC4671(certificationContract);
        }

        address oldCertificationContract = address(s_certificationContract);
        s_certificationContract = ICertification(certificationContract);

        emit CertificationSet(certificationContract, oldCertificationContract);
    }

    function setFacultyName(string memory facultyName) external override onlyRole(ADMIN_ROLE) {
        if (bytes(facultyName).length == 0) {
            revert UniversityCore__FacultyNameZero();
        }

        s_facultyName = facultyName;

        emit FacultyNameSet(facultyName);
    }

    function addProfessor(address professor) external override onlyRole(ADMIN_ROLE) {
        _grantRole(PROFESSOR_ROLE, professor);

        emit ProfessorAdded(professor);
    }

    function enrollStudent(address student, string memory name, string memory faculty, string memory registrationNumber)
        external
        override
        onlyRole(ADMIN_ROLE)
    {
        s_studentRegistryContract.enrollStudent(student, name, faculty, registrationNumber);
    }

    function graduateStudent(address student, string calldata degree, string calldata major)
        external
        override
        onlyRole(ADMIN_ROLE)
    {
        if (!s_studentRegistryContract.hasValid(student)) {
            revert UniversityCore__StudentIsNotEnrolled(student);
        }

        s_certificationContract.issueDiploma(student, degree, major);
    }

    function postGrade(address student, uint256 subjectId, uint8 grade) external override onlyRole(PROFESSOR_ROLE) {
        if (!s_studentRegistryContract.hasValid(student)) {
            revert UniversityCore__StudentIsNotEnrolled(student);
        }

        s_gradebookContract.postGrade(msg.sender, student, subjectId, grade);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function getStudentRegistryContractSetContract() external view override returns (address) {
        return address(s_studentRegistryContract);
    }

    function getGradebookContract() external view override returns (address) {
        return address(s_gradebookContract);
    }

    function getCertificationContract() external view override returns (address) {
        return address(s_certificationContract);
    }
}
