// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {UniversityCore} from "../../src/core/UniversityCore.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {MockStudentRegistry} from "../mocks/MockStudentRegistry.sol";
import {MockGradebook} from "../mocks/MockGradebook.sol";
import {MockCertification} from "../mocks/MockCertification.sol";
import {MockFeeManager} from "../mocks/MockFeeManager.sol";
import {InvalidMockModule} from "../mocks/InvalidMockModule.sol";
import {MockERC721OnlyModule} from "../mocks/MockERC721OnlyModule.sol";

contract UniversityCoreTest is Test {
    UniversityCore public core;
    MockERC20 public mockToken;

    MockStudentRegistry public mockRegistry;
    MockGradebook public mockGradebook;
    MockCertification public mockCertification;
    MockFeeManager public mockFeeManager;
    InvalidMockModule public invalidModule;
    MockERC721OnlyModule public erc721OnlyModule;

    address public admin = makeAddr("admin");
    address public professor = makeAddr("professor");
    address public issuer = makeAddr("issuer");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 public constant REGISTRATION_FEE = 50 * 10 ** 6; // 50 USDC

    event StudentEnrollmentRequested(address student);
    event StudentEnrollmentRejected(address student);
    event ProfessorAdded(address indexed professor);
    event DiplomaIssuerAdded(address indexed issuer);

    function setUp() public {
        mockToken = new MockERC20();
        mockRegistry = new MockStudentRegistry();
        mockGradebook = new MockGradebook();
        mockCertification = new MockCertification();
        mockFeeManager = new MockFeeManager();
        invalidModule = new InvalidMockModule();
        erc721OnlyModule = new MockERC721OnlyModule();

        vm.prank(admin);
        core = new UniversityCore("Faculty of Computer Science", admin);
    }

    function _initializeDefaultCore() internal {
        vm.prank(admin);
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(mockCertification), address(mockFeeManager)
        );
    }

    ///////////////////////////////////
    /////// Constructor Tests /////////
    ///////////////////////////////////

    function test_ConstructorSetsFacultyNameAndAdmin() public view {
        assertEq(core.s_facultyName(), "Faculty of Computer Science");
        assertTrue(core.hasRole(core.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(core.hasRole(core.ADMIN_ROLE(), admin));
    }

    function test_RevertConstructorZeroAddress() public {
        vm.expectRevert(UniversityCore.UniversityCore__AddressZero.selector);
        new UniversityCore("Faculty", address(0));
    }

    function test_RevertConstructorEmptyName() public {
        vm.expectRevert(UniversityCore.UniversityCore__FacultyNameZero.selector);
        new UniversityCore("", admin);
    }

    ///////////////////////////////////
    /////// RBAC (Roles) Tests ////////
    ///////////////////////////////////

    // Testăm acoperirea completă a funcțiilor administrative și a metodelor view simple
    function test_GetFacultyName() public view {
        assertEq(core.getFacultyName(), "Faculty of Computer Science");
    }

    function test_AdminCanAddProfessor() public {
        vm.expectEmit(true, false, false, false);
        emit ProfessorAdded(professor);

        vm.prank(admin);
        core.addProfessor(professor);
        assertTrue(core.hasRole(core.PROFESSOR_ROLE(), professor));
    }

    function test_AdminCanAddDiplomaIssuer() public {
        vm.expectEmit(true, false, false, false);
        emit DiplomaIssuerAdded(issuer);

        vm.prank(admin);
        core.addDiplomaIssuer(issuer);
        assertTrue(core.hasRole(core.DIPLOMA_ISSUER_ROLE(), issuer));
    }

    ///////////////////////////////////
    /////// Initialization Tests //////
    ///////////////////////////////////

    function test_InitializeCoreSuccess() public {
        vm.prank(admin);
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(mockCertification), address(mockFeeManager)
        );

        assertEq(core.getStudentRegistryContract(), address(mockRegistry));
        assertEq(core.getGradebookContract(), address(mockGradebook));
        assertEq(core.getCertificationContract(), address(mockCertification));
    }

    function test_RevertInitializeWithZeroAddress() public {
        vm.startPrank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__AddressZero.selector);
        core.initializeCore(address(0), address(mockGradebook), address(mockCertification), address(mockFeeManager));
        vm.stopPrank();
    }

    function test_RevertInitializeAlreadyInitialized() public {
        _initializeDefaultCore();

        vm.prank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__AlreadyInitialized.selector);
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(mockCertification), address(mockFeeManager)
        );
    }

    function test_RevertInitializeMissingERC721SupportCertification() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversityCore.UniversityCore__ContractDoesNotSupportIERC721.selector, address(invalidModule)
            )
        );
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(invalidModule), address(mockFeeManager)
        );
    }

    function test_RevertInitializeMissingERC5192SupportCertification() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversityCore.UniversityCore__ContractDoesNotSupportIERC5192.selector, address(erc721OnlyModule)
            )
        );
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(erc721OnlyModule), address(mockFeeManager)
        );
    }

    ///////////////////////////////////
    /////// Request Enrollment ///////
    ///////////////////////////////////

    function test_RequestEnrollmentSuccess() public {
        _initializeDefaultCore();
        mockFeeManager.setMockFee(address(mockToken), REGISTRATION_FEE);

        mockToken.mint(alice, REGISTRATION_FEE);

        vm.startPrank(alice);
        mockToken.approve(address(core), REGISTRATION_FEE);

        vm.expectEmit(true, false, false, false);
        emit StudentEnrollmentRequested(alice);

        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        assertEq(mockToken.balanceOf(alice), 0);
        assertEq(mockToken.balanceOf(address(core)), REGISTRATION_FEE);
        assertTrue(mockFeeManager.hasPaidFee(alice));
    }

    function test_RevertRequestEnrollmentTokenNotAllowed() public {
        _initializeDefaultCore();

        vm.startPrank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(UniversityCore.UniversityCore__TokenIsNotAllowed.selector, address(mockToken))
        );
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();
    }

    function test_RevertRequestEnrollmentIfAlreadyPaid() public {
        _initializeDefaultCore();
        mockFeeManager.setMockFee(address(mockToken), REGISTRATION_FEE);
        mockFeeManager.setMockPaid(alice, true);

        vm.startPrank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(UniversityCore.UniversityCore__StudentAlreadyRequestedEnroll.selector, alice)
        );
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();
    }

    function test_RevertRequestEnrollmentIfEnrolledAlready() public {
        _initializeDefaultCore();
        mockRegistry.setMockEnrolled(alice, true);

        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentEnrolledAlready.selector, alice));
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();
    }

    function test_RevertRequestEnrollmentIfGraduatedAlready() public {
        _initializeDefaultCore();
        mockRegistry.setMockGraduated(alice, true);

        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentEnrolledAlready.selector, alice));
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();
    }

    ///////////////////////////////////
    /////// Accept Enrollment /////////
    ///////////////////////////////////

    function test_AcceptEnrollmentSuccess() public {
        _initializeDefaultCore();
        mockFeeManager.setMockPaid(alice, true);

        vm.prank(admin);
        core.acceptEnrollment(alice, bytes32("ID123"));

        assertTrue(mockRegistry.isStudentEnrolled(alice));
        assertFalse(mockFeeManager.hasPaidFee(alice));
    }

    function test_RevertAcceptEnrollmentIfAlreadyEnrolled() public {
        _initializeDefaultCore();
        mockRegistry.setMockEnrolled(alice, true);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentEnrolledAlready.selector, alice));
        core.acceptEnrollment(alice, bytes32("ID123"));
    }

    function test_RevertAcceptEnrollmentIfExpelled() public {
        _initializeDefaultCore();
        mockRegistry.setMockExpelled(alice, true);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentIsExpelled.selector, alice));
        core.acceptEnrollment(alice, bytes32("ID123"));
    }

    function test_RevertAcceptEnrollmentIfFeeNotPaid() public {
        _initializeDefaultCore();
        mockFeeManager.setMockPaid(alice, false);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__FeeNotPaid.selector, alice));
        core.acceptEnrollment(alice, bytes32("ID123"));
    }

    ///////////////////////////////////
    /////// Reject Enrollment /////////
    ///////////////////////////////////

    function test_RejectEnrollmentSuccess() public {
        _initializeDefaultCore();
        mockFeeManager.setMockPaid(alice, true);

        vm.prank(admin);
        vm.expectEmit(true, false, false, false);
        emit StudentEnrollmentRejected(alice);

        core.rejectEnrollment(alice);

        assertFalse(mockFeeManager.hasPaidFee(alice));
    }

    function test_RevertRejectEnrollmentIfFeeNotPaid() public {
        _initializeDefaultCore();
        mockFeeManager.setMockPaid(alice, false);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__FeeNotPaid.selector, alice));
        core.rejectEnrollment(alice);
    }

    ///////////////////////////////////
    /////// Expell Student ////////////
    ///////////////////////////////////

    function test_ExpellStudentSuccess() public {
        _initializeDefaultCore();
        mockRegistry.setMockEnrolled(alice, true);

        vm.prank(admin);
        core.expellStudent(alice);
        assertTrue(mockRegistry.isStudentExpelled(alice));
    }

    function test_RevertExpellStudentIfAlreadyExpelled() public {
        _initializeDefaultCore();
        mockRegistry.setMockExpelled(alice, true);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentIsExpelled.selector, alice));
        core.expellStudent(alice);
    }

    function test_RevertExpellStudentIfNotEnrolled() public {
        _initializeDefaultCore();
        mockRegistry.setMockEnrolled(alice, false);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentIsNotEnrolled.selector, alice));
        core.expellStudent(alice);
    }

    ///////////////////////////////////
    /////// Add Subject (Admin) ///////
    ///////////////////////////////////

    function test_AdminAddSubjectSuccess() public {
        _initializeDefaultCore();
        vm.prank(admin);
        core.addProfessor(professor);

        vm.prank(admin);
        core.addSubject("Distributed Systems", 6, professor);
    }

    function test_RevertAdminAddSubjectNotProfessor() public {
        _initializeDefaultCore();
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__AccountIsNotProfessor.selector, bob));
        core.addSubject("Distributed Systems", 6, bob);
    }

    //////////////////////////////////////////
    /////// CoreInitialized Modifier Tests ///
    //////////////////////////////////////////

    function test_RevertFunctionsIfCoreNotInitialized() public {
        vm.startPrank(admin);

        vm.expectRevert(UniversityCore.UniversityCore__NotInitialized.selector);
        core.acceptEnrollment(alice, bytes32(0));

        vm.expectRevert(UniversityCore.UniversityCore__NotInitialized.selector);
        core.rejectEnrollment(alice);

        vm.expectRevert(UniversityCore.UniversityCore__NotInitialized.selector);
        core.expellStudent(alice);

        vm.expectRevert(UniversityCore.UniversityCore__NotInitialized.selector);
        core.setTokenFee(address(mockToken), 100);

        vm.expectRevert(UniversityCore.UniversityCore__NotInitialized.selector);
        core.withdrawUniversityFunds(address(mockToken), bob, 100);

        vm.stopPrank();
    }
}
