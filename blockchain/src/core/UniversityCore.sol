// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {IUniversityCore} from "../interfaces/IUniversityCore.sol";
import {IGradebook} from "../interfaces/IGradebook.sol";
import {ICertification} from "../interfaces/ICertification.sol";
import {IStudentRegistry} from "../interfaces/IStudentRegistry.sol";
import {IFeeManager} from "../interfaces/IFeeManager.sol";

contract UniversityCore is IUniversityCore, AccessControl {
    // Errors

    error UniversityCore__NotInitialized();
    error UniversityCore__AlreadyInitialized();
    error UniversityCore__AddressZero();
    error UniversityCore__SameAddress();
    error UniversityCore__FacultyNameZero();
    error UniversityCore__StudentIsNotEnrolled(address student);
    error UniversityCore__ContractDoesNotSupportIERC721(address verifiedContract);
    error UniversityCore__StudentEnrolledAlready(address student);
    error UniversityCore__StudentAlreadyHasDiploma(address student);
    error UniversityCore__AccountIsNotProfessor(address professor);
    error UniversityCore__StudentHasAlreadyGraduated(address student);
    error UniversityCore__StudentIsExpelled(address student);
    error UniversityCore__FeeNotPaid(address student);

    // State variables
    bytes32 public constant PROFESSOR_ROLE = keccak256("PROFESSOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DIPLOMA_ISSUER_ROLE = keccak256("DIPLOMA_ISSUER_ROLE");

    string public s_facultyName;
    IStudentRegistry public s_studentRegistry;
    IGradebook public s_gradebook;
    ICertification public s_certification;
    IFeeManager public s_feeManager;

    // Events

    event UniversityCoreInitialized(
        address studentRegistry, address gradebook, address certification, address feeManager
    );
    event StudentRegistryContractUpdate(address newStudentRegistryContract, address oldStudentRegistry);
    event GradebookContractUpdate(address newGradebookContract, address oldGradebook);
    event CertificationContractUpdate(address newCertificationContract, address oldCertification);
    event FeeManagerContractUpdate(address newFeeManager, address oldFeeManager);
    event ProfessorAdded(address indexed professor);
    event DiplomaIssuerAdded(address indexed issuer);
    event FacultyNameSet(string facultyName);

    // Modifiers

    modifier coreInitialized() {
        if (
            address(s_studentRegistry) == address(0) || address(s_gradebook) == address(0)
                || address(s_certification) == address(0) || address(s_feeManager) == address(0)
        ) {
            revert UniversityCore__NotInitialized();
        }
        _;
    }

    modifier zeroAddress(address addr) {
        if (addr == address(0)) {
            revert UniversityCore__AddressZero();
        }
        _;
    }

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

    function initializeCore(address studentRegistry, address gradebook, address certification, address feeManager)
        external
        onlyRole(ADMIN_ROLE)
        zeroAddress(studentRegistry)
        zeroAddress(gradebook)
        zeroAddress(certification)
        zeroAddress(feeManager)
    {
        if (
            address(s_studentRegistry) != address(0) || address(s_gradebook) != address(0)
                || address(s_certification) != address(0) || address(s_feeManager) != address(0)
        ) {
            revert UniversityCore__AlreadyInitialized();
        }

        if (!IERC165(studentRegistry).supportsInterface(type(IERC721).interfaceId)) {
            revert UniversityCore__ContractDoesNotSupportIERC721(studentRegistry);
        }
        if (!IERC165(certification).supportsInterface(type(IERC721).interfaceId)) {
            revert UniversityCore__ContractDoesNotSupportIERC721(certification);
        }

        s_studentRegistry = IStudentRegistry(studentRegistry);
        s_gradebook = IGradebook(gradebook);
        s_certification = ICertification(certification);
        s_feeManager = IFeeManager(feeManager);

        emit UniversityCoreInitialized(studentRegistry, gradebook, certification, feeManager);
    }

    function setStudentRegistryContract(address studentRegistry)
        external
        onlyRole(ADMIN_ROLE)
        zeroAddress(studentRegistry)
    {
        IStudentRegistry oldStudentRegistry = s_studentRegistry;

        if (studentRegistry == address(oldStudentRegistry)) {
            revert UniversityCore__SameAddress();
        }
        if (!IERC165(studentRegistry).supportsInterface(type(IERC721).interfaceId)) {
            revert UniversityCore__ContractDoesNotSupportIERC721(studentRegistry);
        }

        s_studentRegistry = IStudentRegistry(studentRegistry);

        emit StudentRegistryContractUpdate(studentRegistry, address(oldStudentRegistry));
    }

    function setGradebookContract(address gradebook) external onlyRole(ADMIN_ROLE) zeroAddress(gradebook) {
        IGradebook oldGradebook = s_gradebook;

        if (gradebook == address(oldGradebook)) {
            revert UniversityCore__SameAddress();
        }

        s_gradebook = IGradebook(gradebook);

        emit GradebookContractUpdate(gradebook, address(oldGradebook));
    }

    function setCertificationContract(address certification) external onlyRole(ADMIN_ROLE) zeroAddress(certification) {
        ICertification oldCertification = s_certification;

        if (certification == address(oldCertification)) {
            revert UniversityCore__SameAddress();
        }
        if (!IERC165(certification).supportsInterface(type(IERC721).interfaceId)) {
            revert UniversityCore__ContractDoesNotSupportIERC721(certification);
        }

        s_certification = ICertification(certification);

        emit CertificationContractUpdate(certification, address(oldCertification));
    }

    function setFeeManagerContract(address feeManager) external onlyRole(ADMIN_ROLE) zeroAddress(feeManager) {
        IFeeManager oldFeeManager = s_feeManager;

        if (feeManager == address(oldFeeManager)) {
            revert UniversityCore__SameAddress();
        }

        s_feeManager = IFeeManager(feeManager);

        emit FeeManagerContractUpdate(feeManager, address(oldFeeManager));
    }

    function addProfessor(address professor) external onlyRole(ADMIN_ROLE) {
        _grantRole(PROFESSOR_ROLE, professor);

        emit ProfessorAdded(professor);
    }

    function addDiplomaIssuer(address issuer) external onlyRole(ADMIN_ROLE) {
        _grantRole(DIPLOMA_ISSUER_ROLE, issuer);

        emit DiplomaIssuerAdded(issuer);
    }

    function setTokenFee(address token, uint256 feeAmount) external onlyRole(ADMIN_ROLE) coreInitialized {
        s_feeManager.setTokenFee(token, feeAmount);
    }

    function withdrawUniversityFunds(address token, address destination, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
        coreInitialized
    {
        s_feeManager.withdrawFunds(token, destination, amount);
    }

    function enrollStudent(address student, bytes32 studentIdHash) external onlyRole(ADMIN_ROLE) coreInitialized {
        IStudentRegistry studentRegistry = s_studentRegistry;
        IFeeManager feeManager = s_feeManager;

        if (studentRegistry.isStudentEnrolled(student) || studentRegistry.hasStudentGraduated(student)) {
            revert UniversityCore__StudentEnrolledAlready(student);
        }
        if (studentRegistry.isStudentExpelled(student)) {
            revert UniversityCore__StudentIsExpelled(student);
        }

        if (!feeManager.hasPaidFee(student)) {
            revert UniversityCore__FeeNotPaid(student);
        }

        feeManager.consumeFeeVoucher(student);
        studentRegistry.enrollStudent(student, studentIdHash);
    }

    function expellStudent(address student) external onlyRole(ADMIN_ROLE) coreInitialized {
        IStudentRegistry studentRegistry = s_studentRegistry;

        if (studentRegistry.isStudentExpelled(student)) {
            revert UniversityCore__StudentIsExpelled(student);
        }
        if (!studentRegistry.isStudentEnrolled(student)) {
            revert UniversityCore__StudentIsNotEnrolled(student);
        }

        studentRegistry.expellStudent(student);
    }

    function addSubject(string memory name, uint8 credits, address professor)
        external
        onlyRole(ADMIN_ROLE)
        coreInitialized
    {
        if (!hasRole(PROFESSOR_ROLE, professor)) {
            revert UniversityCore__AccountIsNotProfessor(professor);
        }

        s_gradebook.addSubject(name, credits, professor);
    }

    function addSubject(string memory name, uint8 credits) external onlyRole(PROFESSOR_ROLE) coreInitialized {
        s_gradebook.addSubject(name, credits, msg.sender);
    }

    function postGrade(address student, uint256 subjectId, uint8 grade)
        external
        onlyRole(PROFESSOR_ROLE)
        coreInitialized
    {
        IStudentRegistry studentRegistry = s_studentRegistry;

        if (studentRegistry.isStudentExpelled(student)) {
            revert UniversityCore__StudentIsExpelled(student);
        }
        if (!studentRegistry.isStudentEnrolled(student)) {
            revert UniversityCore__StudentIsNotEnrolled(student);
        }

        s_gradebook.postGrade(msg.sender, student, subjectId, grade);
    }

    function setSubjectActivity(uint256 subjectId, bool isActive) external onlyRole(PROFESSOR_ROLE) coreInitialized {
        s_gradebook.setSubjectActivity(msg.sender, subjectId, isActive);
    }

    function graduateStudentAndIssueDiploma(address student, string calldata degreeTitle, string calldata major)
        external
        onlyRole(DIPLOMA_ISSUER_ROLE)
        coreInitialized
    {
        IStudentRegistry studentRegistry = s_studentRegistry;
        ICertification certification = s_certification;
        IGradebook gradebook = s_gradebook;

        if (studentRegistry.hasStudentGraduated(student)) {
            revert UniversityCore__StudentHasAlreadyGraduated(student);
        }
        if (studentRegistry.isStudentExpelled(student)) {
            revert UniversityCore__StudentIsExpelled(student);
        }
        if (!studentRegistry.isStudentEnrolled(student)) {
            revert UniversityCore__StudentIsNotEnrolled(student);
        }
        if (certification.hasDiploma(student)) {
            revert UniversityCore__StudentAlreadyHasDiploma(student);
        }

        uint256 credits = gradebook.getStudentCredits(student);
        uint256 weightedAverage = gradebook.getWeightedAverage(student);

        studentRegistry.graduateStudent(student);
        certification.issueDiploma(student, degreeTitle, major, credits, weightedAverage);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function getStudentRegistryContract() external view returns (address) {
        return address(s_studentRegistry);
    }

    function getGradebookContract() external view returns (address) {
        return address(s_gradebook);
    }

    function getCertificationContract() external view returns (address) {
        return address(s_certification);
    }

    function getFacultyName() external view returns (string memory) {
        return s_facultyName;
    }
}
