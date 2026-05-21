// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

import {DeployUniversity} from "../../script/DeployUniversity.s.sol";
import {UniversityCore} from "../../src/core/UniversityCore.sol";
import {StudentRegistry} from "../../src/modules/StudentRegistry.sol";
import {Gradebook} from "../../src/modules/Gradebook.sol";
import {Certification} from "../../src/modules/Certification.sol";
import {FeeManager} from "../../src/modules/FeeManager.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract IntegrationTest is Test {
    UniversityCore public core;
    StudentRegistry public registry;
    Gradebook public gradebook;
    Certification public certification;
    FeeManager public feeManager;
    MockERC20 public mockToken;

    address public admin = makeAddr("admin");
    address public professor = makeAddr("professor");
    address public issuer = makeAddr("issuer");
    address public student = makeAddr("student");

    bytes32 constant STUDENT_HASH = keccak256(abi.encode("RO-1234"));
    uint256 constant CREDITS_REQUIRED = 180;
    uint256 constant REGISTRATION_FEE = 10 * 10 ** 6; // 10 USDC

    function setUp() public {
        mockToken = new MockERC20();

        DeployUniversity deployer = new DeployUniversity();
        (core, registry, gradebook, certification, feeManager) = deployer.runWithAdmin(admin);

        // Assign core roles and establish the initial enrollment fee
        vm.startPrank(admin);
        core.addProfessor(professor);
        core.addDiplomaIssuer(issuer);
        core.setTokenFee(address(mockToken), REGISTRATION_FEE);
        vm.stopPrank();
    }

    ///////////////////////////////////////////
    /////// Fuzz E2E Academic Flow Test ///////
    ///////////////////////////////////////////

    function testFuzz_FullAcademicCycle(
        uint8 rawGrade1,
        uint8 rawGrade2,
        uint8 rawCredits1,
        uint8 rawCredits2,
        address studentFuzz,
        address professorFuzz,
        address issuerFuzz
    ) public {
        // Step 1: Input Bounds & Constraints
        uint8 grade1 = uint8(bound(rawGrade1, 5, 10));
        uint8 grade2 = uint8(bound(rawGrade2, 5, 10));
        uint8 credits1 = uint8(bound(rawCredits1, 80, 120));

        uint8 minCredits2 = uint8(CREDITS_REQUIRED - credits1);
        uint8 credits2 = uint8(bound(rawCredits2, minCredits2, 100));

        // Address constraints to prevent collisions
        vm.assume(studentFuzz != address(0));
        vm.assume(professorFuzz != address(0));
        vm.assume(issuerFuzz != address(0));
        vm.assume(studentFuzz != professorFuzz);
        vm.assume(studentFuzz != issuerFuzz);
        vm.assume(professorFuzz != issuerFuzz);
        vm.assume(studentFuzz != admin);
        vm.assume(studentFuzz != address(core));
        vm.assume(studentFuzz != address(feeManager));

        // Assign fuzzed roles
        vm.startPrank(admin);
        core.addProfessor(professorFuzz);
        core.addDiplomaIssuer(issuerFuzz);
        vm.stopPrank();

        // Step 2: Student Requests Enrollment (Hibrid Payment Flow via Core)
        mockToken.mint(studentFuzz, REGISTRATION_FEE);
        vm.startPrank(studentFuzz);
        mockToken.approve(address(core), REGISTRATION_FEE); // Student approves Core
        core.requestEnrollment(address(mockToken)); // Route through Core
        vm.stopPrank();

        // Assert tokens are secured inside the FeeManager
        assertEq(mockToken.balanceOf(address(feeManager)), REGISTRATION_FEE);
        assertTrue(feeManager.hasPaidFee(studentFuzz));

        // Step 3: Admin Accepts Enrollment
        vm.prank(admin);
        core.acceptEnrollment(studentFuzz, STUDENT_HASH);
        assertTrue(registry.isStudentEnrolled(studentFuzz));

        // Step 4: Admin Creates Subjects
        vm.startPrank(admin);
        core.addSubject("Advanced Blockchain", credits1, professorFuzz);
        core.addSubject("Cyber Security", credits2, professorFuzz);
        vm.stopPrank();

        // Step 5: Professor Posts Grades
        vm.startPrank(professorFuzz);
        core.postGrade(studentFuzz, 1, grade1);
        core.postGrade(studentFuzz, 2, grade2);
        vm.stopPrank();

        uint256 expectedCredits = uint256(credits1) + uint256(credits2);
        assertEq(gradebook.getStudentCredits(studentFuzz), expectedCredits);

        // Step 6: Issuer Finalizes Studies
        vm.prank(issuerFuzz);
        core.graduateStudentAndIssueDiploma(studentFuzz, "B.Sc. Engineer", "Computer Science");

        // Assertions: Identity burned, Diploma minted
        assertFalse(registry.isStudentEnrolled(studentFuzz));
        assertTrue(registry.hasStudentGraduated(studentFuzz));
        assertEq(certification.balanceOf(studentFuzz), 1);

        // Assertions: Metadata Integrity
        uint256 tokenId = certification.getDiplomaIdForStudent(studentFuzz);
        uint256 expectedAvg =
            (uint256(grade1) * uint256(credits1) + uint256(grade2) * uint256(credits2)) * 100 / expectedCredits;

        (uint256 savedAvg, uint256 issueTime, string memory title, string memory major) =
            certification.getDiplomaMetadata(tokenId);

        assertEq(savedAvg, expectedAvg);
        assertEq(title, "B.Sc. Engineer");
        assertEq(major, "Computer Science");
        assertEq(issueTime, block.timestamp);
    }

    ///////////////////////////////////////////
    /////// Integration Edge Cases ////////////
    ///////////////////////////////////////////

    /// @notice Validates the rejection and automatic refund cycle.
    function test_RejectEnrollmentAndRefundFlow() public {
        mockToken.mint(student, REGISTRATION_FEE);

        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        // Verify state is locked in pending registration
        assertTrue(feeManager.hasPaidFee(student));
        assertEq(mockToken.balanceOf(address(feeManager)), REGISTRATION_FEE);

        // Admin rejects application
        vm.prank(admin);
        core.rejectEnrollment(student);

        // Assertions: Funds returned to student wallet and vouchers cleared
        assertFalse(feeManager.hasPaidFee(student));
        assertEq(mockToken.balanceOf(student), REGISTRATION_FEE);
        assertEq(mockToken.balanceOf(address(feeManager)), 0);
        assertFalse(registry.isStudentEnrolled(student));
    }

    /// @notice Tests the complete expulsion flow, ensuring an expelled student cannot be graded.
    function test_ExpellStudentFullFlow() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);
        assertTrue(registry.isStudentEnrolled(student));

        core.expellStudent(student);
        vm.stopPrank();

        assertFalse(registry.isStudentEnrolled(student));
        assertTrue(registry.isStudentExpelled(student));

        // Attempt grading an expelled student
        vm.startPrank(admin);
        core.addSubject("Math", 5, professor);
        vm.stopPrank();

        vm.prank(professor);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentIsExpelled.selector, student));
        core.postGrade(student, 1, 10);
    }

    function test_RevertEnrollStudentNotAdmin() public {
        vm.prank(student);
        vm.expectRevert();
        core.acceptEnrollment(student, STUDENT_HASH);
    }

    function test_RevertEnrollStudentWithoutPayingFee() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__FeeNotPaid.selector, student));
        core.acceptEnrollment(student, STUDENT_HASH);
    }

    function test_RevertEnrollStudentTwice() public {
        mockToken.mint(student, REGISTRATION_FEE);

        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);

        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentEnrolledAlready.selector, student));
        core.acceptEnrollment(student, STUDENT_HASH);
        vm.stopPrank();
    }

    function test_RevertPostGradeNotProfessor() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);
        core.addSubject("Advanced Programming", 6, professor);
        vm.stopPrank();

        vm.prank(student);
        vm.expectRevert();
        core.postGrade(student, 1, 10);
    }

    function test_RevertPostGradeStudentNotEnrolled() public {
        vm.prank(admin);
        core.addSubject("Advanced Programming", 6, professor);

        vm.prank(professor);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentIsNotEnrolled.selector, student));
        core.postGrade(student, 1, 10);
    }

    function test_RevertIssueDiplomaStudentAlreadyHasDiploma() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);
        core.addSubject("OOP", uint8(CREDITS_REQUIRED), professor);
        vm.stopPrank();

        vm.prank(professor);
        core.postGrade(student, 1, 10);

        vm.prank(issuer);
        core.graduateStudentAndIssueDiploma(student, "Engineer", "Computer Science");

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(UniversityCore.UniversityCore__StudentHasAlreadyGraduated.selector, student)
        );
        core.graduateStudentAndIssueDiploma(student, "Engineer", "Computer Science");
    }
}
