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
        // The deploy script handles passing CREDITS_REQUIRED and linking all 4 modules.
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

    /// @notice A massive Fuzz test validating the entire student lifecycle:
    /// 1. Paying the fee via FeeManager.
    /// 2. Enrollment via Core.
    /// 3. Grading via Gradebook.
    /// 4. Graduation via Certification.
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

        // Address constraints to prevent role collisions and zero address reverts
        vm.assume(studentFuzz != address(0));
        vm.assume(professorFuzz != address(0));
        vm.assume(issuerFuzz != address(0));
        vm.assume(studentFuzz != professorFuzz);
        vm.assume(studentFuzz != issuerFuzz);
        vm.assume(professorFuzz != issuerFuzz);

        // Assign fuzzed roles
        vm.startPrank(admin);
        core.addProfessor(professorFuzz);
        core.addDiplomaIssuer(issuerFuzz);
        vm.stopPrank();

        // Step 2: Student Pays Registration Fee
        // Mint mock tokens to the fuzzed student and approve the fee manager
        mockToken.mint(studentFuzz, REGISTRATION_FEE);
        vm.startPrank(studentFuzz);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();

        // Step 3: Admin Enrolls Student
        vm.prank(admin);
        core.enrollStudent(studentFuzz, STUDENT_HASH);
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

    /// @notice Tests the complete expulsion flow, ensuring an expelled student cannot be graded.
    function test_ExpellStudentFullFlow() public {
        // Setup: Student must pay before enrollment
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.enrollStudent(student, STUDENT_HASH);
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
        core.enrollStudent(student, STUDENT_HASH);
    }

    function test_RevertEnrollStudentWithoutPayingFee() public {
        // Admin attempts to enroll a student who bypassed the FeeManager
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__FeeNotPaid.selector, student));
        core.enrollStudent(student, STUDENT_HASH);
    }

    function test_RevertEnrollStudentTwice() public {
        mockToken.mint(student, REGISTRATION_FEE * 2);

        vm.startPrank(student);
        mockToken.approve(address(feeManager), REGISTRATION_FEE * 2);
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.enrollStudent(student, STUDENT_HASH);

        // Attempting to enroll the active student again
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentEnrolledAlready.selector, student));
        core.enrollStudent(student, STUDENT_HASH);
        vm.stopPrank();
    }

    function test_RevertAddSubjectNotProfessor() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__AccountIsNotProfessor.selector, student));
        core.addSubject("Subject", 6, student);

        vm.prank(student);
        vm.expectRevert();
        core.addSubject("Subject", 6);
    }

    function test_RevertPostGradeNotProfessor() public {
        // Pre-enrollment requirements
        mockToken.mint(student, REGISTRATION_FEE);
        vm.prank(student);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        vm.prank(student);
        feeManager.payRegistrationFee(address(mockToken));

        vm.startPrank(admin);
        core.enrollStudent(student, STUDENT_HASH);
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

    function test_RevertSetSubjectActivityNotProfessor() public {
        vm.prank(student);
        vm.expectRevert();
        core.setSubjectActivity(0, true);
    }

    function test_RevertIssueDiplomaStudentNotEnrolled() public {
        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentIsNotEnrolled.selector, student));
        core.graduateStudentAndIssueDiploma(student, "Engineer", "Computer Science");
    }

    function test_RevertIssueDiplomaNotIssuerRole() public {
        vm.prank(admin);
        vm.expectRevert();
        core.graduateStudentAndIssueDiploma(student, "Engineer", "Computer Science");
    }

    function test_RevertIssueDiplomaStudentAlreadyHasDiploma() public {
        // Complete the prerequisites for graduation
        mockToken.mint(student, REGISTRATION_FEE);
        vm.prank(student);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        vm.prank(student);
        feeManager.payRegistrationFee(address(mockToken));

        vm.startPrank(admin);
        core.enrollStudent(student, STUDENT_HASH);
        core.addSubject("OOP", uint8(CREDITS_REQUIRED), professor);
        vm.stopPrank();

        vm.prank(professor);
        core.postGrade(student, 1, 10);

        vm.prank(issuer);
        core.graduateStudentAndIssueDiploma(student, "Engineer", "Computer Science");

        // Attempt to issue a secondary diploma
        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(UniversityCore.UniversityCore__StudentHasAlreadyGraduated.selector, student)
        );
        core.graduateStudentAndIssueDiploma(student, "Engineer", "Computer Science");
    }
}
