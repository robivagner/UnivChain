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
import {ICertification} from "../../src/interfaces/ICertification.sol";
import {Certification} from "../../src/modules/Certification.sol";
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
    bytes32 constant DIPLOMA_DOC_HASH = keccak256("integration-diploma-pdf");
    string constant DIPLOMA_META_URI = "ipfs://QmIntegrationTest/diploma.json";
    uint256 constant CREDITS_REQUIRED = 180;
    uint256 constant REGISTRATION_FEE = 10 * 10 ** 6; // 10 USDC
    uint8 constant SUBJECT_ECTS = 30;
    uint8 constant SUBJECTS_FOR_GRADUATION = 6;

    function setUp() public {
        mockToken = new MockERC20();

        DeployUniversity deployer = new DeployUniversity();
        (core, registry, gradebook, certification, feeManager) = deployer.runWithAdmin(admin);

        // Assign core roles and establish the initial enrollment fee
        vm.startPrank(admin);
        core.addProfessor(professor);
        core.addDiplomaIssuer(issuer);
        core.configureToken(address(mockToken), REGISTRATION_FEE, 1 * 10 ** 6, 50 * 10 ** 6);
        vm.stopPrank();
    }

    ///////////////////////////////////////////
    /////// Fuzz E2E Academic Flow Test ///////
    ///////////////////////////////////////////

    /// @dev Adds six 30-ECTS subjects and passing grades (180 total), matching Gradebook per-subject limits.
    function _completeCurriculumForGraduation(address who, address prof, uint8 grade) internal {
        vm.startPrank(admin);
        for (uint8 i = 0; i < SUBJECTS_FOR_GRADUATION; i++) {
            core.addSubject(string(abi.encodePacked("Course ", vm.toString(i))), SUBJECT_ECTS, prof);
        }
        vm.stopPrank();

        vm.startPrank(prof);
        for (uint256 subjectId = 1; subjectId <= SUBJECTS_FOR_GRADUATION; subjectId++) {
            core.postGrade(who, subjectId, grade);
        }
        vm.stopPrank();
    }

    function _graduateAndAttach(address who, address iss) internal {
        vm.startPrank(iss);
        core.graduateStudentAndIssueDiploma(who);
        core.attachDiplomaCredential(who, DIPLOMA_DOC_HASH, DIPLOMA_META_URI);
        vm.stopPrank();
    }

    function testFuzz_FullAcademicCycle(
        uint8 rawGrade,
        address studentFuzz,
        address professorFuzz,
        address issuerFuzz
    ) public {
        uint8 grade = uint8(bound(rawGrade, 5, 10));

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

        _completeCurriculumForGraduation(studentFuzz, professorFuzz, grade);

        assertEq(gradebook.getStudentCredits(studentFuzz), CREDITS_REQUIRED);

        // Step 6: Issuer Finalizes Studies
        _graduateAndAttach(studentFuzz, issuerFuzz);

        // Assertions: enrollment closed, diploma minted
        assertFalse(registry.isStudentEnrolled(studentFuzz));
        assertTrue(registry.hasStudentGraduated(studentFuzz));
        assertEq(certification.balanceOf(studentFuzz), 1);

        // Assertions: Metadata Integrity
        uint256 tokenId = certification.getDiplomaIdForStudent(studentFuzz);
        ICertification.Diploma memory diploma = certification.getDiploma(tokenId);

        assertEq(gradebook.getWeightedAverage(studentFuzz), uint256(grade) * 100);
        assertEq(gradebook.getStudentCredits(studentFuzz), CREDITS_REQUIRED);
        assertEq(diploma.issueTimestamp, block.timestamp);
        assertTrue(certification.isDiplomaValid(tokenId));
        assertEq(certification.tokenURI(tokenId), DIPLOMA_META_URI);
        assertEq(diploma.documentHash, DIPLOMA_DOC_HASH);
        assertEq(diploma.issuer, issuerFuzz);
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

        vm.prank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);

        _completeCurriculumForGraduation(student, professor, 10);

        _graduateAndAttach(student, issuer);

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(UniversityCore.UniversityCore__StudentHasAlreadyGraduated.selector, student)
        );
        core.graduateStudentAndIssueDiploma(student);
    }

    function test_AdminRevokeDiplomaThroughCore() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.prank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);

        _completeCurriculumForGraduation(student, professor, 10);

        _graduateAndAttach(student, issuer);

        uint256 tokenId = certification.getDiplomaIdForStudent(student);
        assertTrue(certification.isDiplomaValid(tokenId));

        vm.prank(admin);
        core.revokeDiploma(tokenId);

        assertFalse(certification.isDiplomaValid(tokenId));
        assertTrue(certification.getDiploma(tokenId).revoked);
    }

    /// @notice If graduation policy fails at Certification, identity must remain active and no diploma minted.
    function test_RevertGraduationInsufficientCreditsLeavesStudentEnrolled() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);
        core.addSubject("Intro", SUBJECT_ECTS, professor);
        vm.stopPrank();

        vm.prank(professor);
        core.postGrade(student, 1, 10);

        assertEq(gradebook.getStudentCredits(student), SUBJECT_ECTS);
        assertLt(gradebook.getStudentCredits(student), CREDITS_REQUIRED);

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(
                Certification.Certification__NotEnoughCredits.selector, student, uint256(SUBJECT_ECTS)
            )
        );
        core.graduateStudentAndIssueDiploma(student);

        assertTrue(registry.isStudentEnrolled(student));
        assertFalse(registry.hasStudentGraduated(student));
        assertEq(certification.balanceOf(student), 0);
        assertFalse(certification.hasValidDiploma(student));
    }

    function test_RevertGraduationWhenStudentHasFailedSubject() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.prank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);

        _completeCurriculumForGraduation(student, professor, 10);

        vm.startPrank(admin);
        core.addSubject("Elective", SUBJECT_ECTS, professor);
        vm.stopPrank();

        vm.prank(professor);
        core.postGrade(student, SUBJECTS_FOR_GRADUATION + 1, 4);

        assertEq(gradebook.getStudentCredits(student), CREDITS_REQUIRED);
        assertTrue(gradebook.hasFailedSubject(student));

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(UniversityCore.UniversityCore__StudentHasFailedSubject.selector, student)
        );
        core.graduateStudentAndIssueDiploma(student);

        assertTrue(registry.isStudentEnrolled(student));
        assertFalse(registry.hasStudentGraduated(student));
        assertEq(certification.balanceOf(student), 0);
    }

    function test_RevertGraduationWhenStudentDebtOutstanding() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);
        core.addSubject("Retake Course", SUBJECT_ECTS, professor);
        core.accrueRetakeTax(student, address(mockToken), 1);
        vm.stopPrank();

        vm.prank(professor);
        core.postGrade(student, 1, 10);

        vm.prank(issuer);
        vm.expectRevert(
            abi.encodeWithSelector(UniversityCore.UniversityCore__OutstandingStudentDebt.selector, student)
        );
        core.graduateStudentAndIssueDiploma(student);
    }

    function test_GraduationAfterStudentDebtPaid() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);
        for (uint8 i = 0; i < SUBJECTS_FOR_GRADUATION; i++) {
            core.addSubject(string(abi.encodePacked("Course ", vm.toString(i))), SUBJECT_ECTS, professor);
        }
        core.accrueRetakeTax(student, address(mockToken), 1);
        vm.stopPrank();

        vm.startPrank(professor);
        for (uint256 subjectId = 1; subjectId <= SUBJECTS_FOR_GRADUATION; subjectId++) {
            core.postGrade(student, subjectId, 10);
        }
        vm.stopPrank();

        uint256 owed = feeManager.getStudentDebtOwed(student, address(mockToken));
        mockToken.mint(student, owed);
        vm.startPrank(student);
        mockToken.approve(address(core), owed);
        core.payStudentDebt(address(mockToken), owed);
        vm.stopPrank();

        assertEq(feeManager.getStudentDebtOwed(student, address(mockToken)), 0);

        _graduateAndAttach(student, issuer);

        assertTrue(registry.hasStudentGraduated(student));
    }

    function test_GraduationAfterSemesterTaxPaid() public {
        mockToken.mint(student, REGISTRATION_FEE);
        vm.startPrank(student);
        mockToken.approve(address(core), REGISTRATION_FEE);
        core.requestEnrollment(address(mockToken));
        vm.stopPrank();

        vm.startPrank(admin);
        core.acceptEnrollment(student, STUDENT_HASH);
        for (uint8 i = 0; i < SUBJECTS_FOR_GRADUATION; i++) {
            core.addSubject(string(abi.encodePacked("Course ", vm.toString(i))), SUBJECT_ECTS, professor);
        }
        core.accrueSemesterTax(student, address(mockToken));
        vm.stopPrank();

        vm.startPrank(professor);
        for (uint256 subjectId = 1; subjectId <= SUBJECTS_FOR_GRADUATION; subjectId++) {
            core.postGrade(student, subjectId, 10);
        }
        vm.stopPrank();

        uint256 owed = feeManager.getStudentDebtOwed(student, address(mockToken));
        mockToken.mint(student, owed);
        vm.startPrank(student);
        mockToken.approve(address(core), owed);
        core.payStudentDebt(address(mockToken), owed);
        vm.stopPrank();

        _graduateAndAttach(student, issuer);

        assertTrue(registry.hasStudentGraduated(student));
    }
}
