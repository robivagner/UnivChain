// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IUniversityCore} from "../interfaces/IUniversityCore.sol";
import {IGradebook} from "../interfaces/IGradebook.sol";
import {ICertification} from "../interfaces/ICertification.sol";
import {IStudentRegistry} from "../interfaces/IStudentRegistry.sol";
import {IFeeManager} from "../interfaces/IFeeManager.sol";

/**
 * @title UniversityCore
 * @notice Core implementation contract serving as the administrative engine of the protocol.
 * @dev Inherits AccessControl for role management and implements the IUniversityCore interface.
 */
contract UniversityCore is IUniversityCore, AccessControl {
    using SafeERC20 for IERC20;

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
    error UniversityCore__StudentAlreadyRequestedEnroll(address student);
    error UniversityCore__TokenIsNotAllowed(address token);

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
    event StudentEnrollmentRequested(address student);
    event StudentEnrollmentRejected(address student);

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

    /**
     * @notice Constructor sets the deployment administration configurations.
     * @param facultyName Name of the deployed university branch.
     * @param owner Address designated as the root protocol administrator.
     */
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
    /////// ADMIN_ROLE functions ///////
    ////////////////////////////////////

    /// @inheritdoc IUniversityCore
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

    /// @inheritdoc IUniversityCore
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

    /// @inheritdoc IUniversityCore
    function setGradebookContract(address gradebook) external onlyRole(ADMIN_ROLE) zeroAddress(gradebook) {
        IGradebook oldGradebook = s_gradebook;

        if (gradebook == address(oldGradebook)) {
            revert UniversityCore__SameAddress();
        }

        s_gradebook = IGradebook(gradebook);

        emit GradebookContractUpdate(gradebook, address(oldGradebook));
    }

    /// @inheritdoc IUniversityCore
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

    /// @inheritdoc IUniversityCore
    function setFeeManagerContract(address feeManager) external onlyRole(ADMIN_ROLE) zeroAddress(feeManager) {
        IFeeManager oldFeeManager = s_feeManager;

        if (feeManager == address(oldFeeManager)) {
            revert UniversityCore__SameAddress();
        }

        s_feeManager = IFeeManager(feeManager);

        emit FeeManagerContractUpdate(feeManager, address(oldFeeManager));
    }

    /// @inheritdoc IUniversityCore
    function addProfessor(address professor) external onlyRole(ADMIN_ROLE) {
        _grantRole(PROFESSOR_ROLE, professor);

        emit ProfessorAdded(professor);
    }

    /// @inheritdoc IUniversityCore
    function addDiplomaIssuer(address issuer) external onlyRole(ADMIN_ROLE) {
        _grantRole(DIPLOMA_ISSUER_ROLE, issuer);

        emit DiplomaIssuerAdded(issuer);
    }

    /// @inheritdoc IUniversityCore
    function setTokenFee(address token, uint256 feeAmount) external onlyRole(ADMIN_ROLE) coreInitialized {
        s_feeManager.setTokenFee(token, feeAmount);
    }

    /// @inheritdoc IUniversityCore
    function withdrawUniversityFunds(address token, address destination, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
        zeroAddress(destination)
        coreInitialized
    {
        s_feeManager.withdrawFunds(token, destination, amount);
    }

    /// @inheritdoc IUniversityCore
    function acceptEnrollment(address student, bytes32 studentIdHash) external onlyRole(ADMIN_ROLE) coreInitialized {
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

    /// @inheritdoc IUniversityCore
    function rejectEnrollment(address student) external onlyRole(ADMIN_ROLE) coreInitialized {
        IFeeManager feeManager = s_feeManager;

        if (!feeManager.hasPaidFee(student)) {
            revert UniversityCore__FeeNotPaid(student);
        }

        feeManager.processRefund(student);

        emit StudentEnrollmentRejected(student);
    }

    /// @inheritdoc IUniversityCore
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

    /// @inheritdoc IUniversityCore
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

    ////////////////////////////////////////
    /////// PROFESSOR_ROLE functions ///////
    ////////////////////////////////////////

    /// @inheritdoc IUniversityCore
    function addSubject(string memory name, uint8 credits) external onlyRole(PROFESSOR_ROLE) coreInitialized {
        s_gradebook.addSubject(name, credits, msg.sender);
    }

    /// @inheritdoc IUniversityCore
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

    /// @inheritdoc IUniversityCore
    function setSubjectActivity(uint256 subjectId, bool isActive) external onlyRole(PROFESSOR_ROLE) coreInitialized {
        s_gradebook.setSubjectActivity(msg.sender, subjectId, isActive);
    }

    /////////////////////////////////////////////
    /////// DIPLOMA_ISSUER_ROLE functions ///////
    /////////////////////////////////////////////

    /// @inheritdoc IUniversityCore
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

    ////////////////////////////////////////
    /////// Permissionless Functions ///////
    ////////////////////////////////////////

    /// @inheritdoc IUniversityCore
    function requestEnrollment(address token) external coreInitialized {
        IStudentRegistry studentRegistry = s_studentRegistry;
        IFeeManager feeManager = s_feeManager;

        if (studentRegistry.isStudentEnrolled(msg.sender) || studentRegistry.hasStudentGraduated(msg.sender)) {
            revert UniversityCore__StudentEnrolledAlready(msg.sender);
        }
        if (feeManager.hasPaidFee(msg.sender)) {
            revert UniversityCore__StudentAlreadyRequestedEnroll(msg.sender);
        }

        uint256 feeAmount = feeManager.getFeeAmountForToken(token);

        if (feeAmount == 0) {
            revert UniversityCore__TokenIsNotAllowed(token);
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), feeAmount);
        IERC20(token).safeIncreaseAllowance(address(feeManager), feeAmount);

        feeManager.payRegistrationFee(token, msg.sender);

        emit StudentEnrollmentRequested(msg.sender);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    /// @inheritdoc IUniversityCore
    function getStudentRegistryContract() external view returns (address) {
        return address(s_studentRegistry);
    }

    /// @inheritdoc IUniversityCore
    function getGradebookContract() external view returns (address) {
        return address(s_gradebook);
    }

    /// @inheritdoc IUniversityCore
    function getCertificationContract() external view returns (address) {
        return address(s_certification);
    }

    /// @inheritdoc IUniversityCore
    function getFacultyName() external view returns (string memory) {
        return s_facultyName;
    }
}
