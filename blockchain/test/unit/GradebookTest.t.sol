// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";

import {Gradebook} from "../../src/modules/Gradebook.sol";

contract GradebookTest is Test {
    Gradebook public gradebook;

    address public core = makeAddr("universityCore");
    address public professor = makeAddr("professorX");
    address public student = makeAddr("studentA");
    address public alice = makeAddr("alice");

    function setUp() public {
        gradebook = new Gradebook(core);

        // Pre-populate the gradebook with some default subjects for testing
        vm.startPrank(core);
        gradebook.addSubject("Blockchain", 6, professor); // Subject ID: 1
        gradebook.addSubject("Algorithms", 4, professor); // Subject ID: 2
        gradebook.addSubject("Mathematics", 5, professor); // Subject ID: 3
        vm.stopPrank();
    }

    ///////////////////////////////////
    /////// Constructor & Setup ///////
    ///////////////////////////////////

    function test_RevertIfConstructorCoreAddressZero() public {
        vm.expectRevert(Gradebook.Gradebook__AddressZero.selector);
        new Gradebook(address(0));
    }

    function test_GetUniversityCoreContract() public view {
        assertEq(gradebook.getUniversityCoreContract(), core);
    }

    ////////////////////////////////
    /////// Add Subject Tests //////
    ////////////////////////////////

    /// @notice Tests if a new subject is correctly appended and metadata is accurately stored.
    function test_AddSubjectIncrementsIdAndSetsMetadata() public {
        vm.prank(core);
        gradebook.addSubject("Physics", 4, professor); // Subject ID: 4

        (string memory name, uint8 credits, address prof, bool isActive) = gradebook.getSubjectMetadata(4);
        assertEq(name, "Physics");
        assertEq(credits, 4);
        assertEq(prof, professor);
        assertTrue(isActive);
    }

    function test_RevertAddSubjectIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotCore.selector, alice));
        gradebook.addSubject("Physics", 4, professor);
    }

    function test_RevertGetSubjectMetadataOutOfBounds() public {
        // We only have 3 subjects initially, plus the 1 from the add subject test (if it ran).
        // 99 is definitively out of bounds.
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__SubjectIdOutOfBounds.selector, 99, 4));
        gradebook.getSubjectMetadata(99);
    }

    ////////////////////////////////////
    /////// Set Subject Activity ///////
    ////////////////////////////////////

    /// @notice Tests if the assigned professor can successfully toggle the active status of their subject.
    function test_SetSubjectActivitySuccess() public {
        vm.prank(core);
        gradebook.setSubjectActivity(professor, 1, false);

        (,,, bool isActive) = gradebook.getSubjectMetadata(1);
        assertFalse(isActive);
    }

    function test_RevertSetSubjectActivityIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotCore.selector, alice));
        gradebook.setSubjectActivity(professor, 1, false);
    }

    function test_RevertSetSubjectActivityOutOfBounds() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__SubjectIdOutOfBounds.selector, 99, 4));
        gradebook.setSubjectActivity(professor, 99, false);
    }

    function test_RevertSetSubjectActivityNotProfessor() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotProfessorOfSubject.selector, alice, 1));
        gradebook.setSubjectActivity(alice, 1, false);
    }

    ////////////////////////////////
    /////// Post Grade Tests ///////
    ////////////////////////////////

    /// @notice Tests if a valid grade is correctly recorded for a student in a specific subject.
    function test_PostGradeSuccess() public {
        vm.prank(core);
        gradebook.postGrade(professor, student, 1, 10);

        // Verify the grade record data
        (uint8 grade, uint256 timestamp, address prof) = gradebook.getStudentGradeRecordOfSubject(student, 1);
        assertEq(grade, 10);
        assertEq(prof, professor);
        assertEq(timestamp, block.timestamp);
    }

    function test_RevertPostGradeIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotCore.selector, alice));
        gradebook.postGrade(professor, student, 1, 10);
    }

    function test_RevertIfGradeAlreadyGiven() public {
        vm.startPrank(core);
        gradebook.postGrade(professor, student, 1, 5);

        // Attempting to overwrite an existing grade should revert
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__GradeAlreadyGiven.selector, student, 1, 7));
        gradebook.postGrade(professor, student, 1, 7);
        vm.stopPrank();
    }

    function test_RevertPostGradeOutOfBounds() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__SubjectIdOutOfBounds.selector, 99, 4));
        gradebook.postGrade(professor, student, 99, 10);
    }

    function test_RevertPostGradeSubjectNotActive() public {
        vm.startPrank(core);
        gradebook.setSubjectActivity(professor, 1, false);

        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__SubjectNotActive.selector, 1));
        gradebook.postGrade(professor, student, 1, 10);
        vm.stopPrank();
    }

    function test_RevertPostGradeNotProfessor() public {
        vm.startPrank(core);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotProfessorOfSubject.selector, alice, 1));
        gradebook.postGrade(alice, student, 1, 10);
        vm.stopPrank();
    }

    function test_RevertIfGradeGreaterThanTen() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__GradeGreaterThanTen.selector, 11));
        gradebook.postGrade(professor, student, 1, 11);
    }

    ///////////////////////////////////
    /////// Weighted Avg Tests ////////
    ///////////////////////////////////

    /// @notice Tests the weighted average calculation logic using static values.
    function test_WeightedAverageCorrectness() public {
        vm.startPrank(core);
        // Subject 1: 6 credits, Grade 10 -> Weighted: 60
        gradebook.postGrade(professor, student, 1, 10);
        // Subject 2: 4 credits, Grade 5  -> Weighted: 20
        gradebook.postGrade(professor, student, 2, 5);
        vm.stopPrank();

        // Total weighted sum = 80. Total credits = 10.
        // Average = (80 * 100) / 10 = 800 (representing 8.00)
        uint256 avg = gradebook.getWeightedAverage(student);
        assertEq(avg, 800);
    }

    function test_WeightedAverageReturnsZeroIfNoCredits() public view {
        assertEq(gradebook.getWeightedAverage(student), 0);
    }

    ///////////////////////////////////
    /////// Fuzz Tests ////////////////
    ///////////////////////////////////

    /// @notice Fuzzes the grade posting flow to ensure the weighted average calculation never overflows
    /// and accurately computes the result for any valid grade inputs, including failed grades.
    function testFuzz_CompleteGradebookFlow(uint8 rawGrade1, uint8 rawGrade2, uint8 rawGrade3) public {
        // Bound grades between 1 and 10 to simulate real-world university grading
        uint8 grade1 = uint8(bound(rawGrade1, 1, 10));
        uint8 grade2 = uint8(bound(rawGrade2, 1, 10));
        uint8 grade3 = uint8(bound(rawGrade3, 1, 10));

        vm.startPrank(core);

        // Post fuzzed grades for the 3 pre-existing subjects
        gradebook.postGrade(professor, student, 1, grade1);
        gradebook.postGrade(professor, student, 2, grade2);
        gradebook.postGrade(professor, student, 3, grade3);

        vm.stopPrank();

        uint256 earnedCredits = 0;
        uint256 attemptedCredits = 0;
        uint256 weightedSum = 0;

        // Subject 1: 6 ECTS
        attemptedCredits += 6;
        weightedSum += uint256(grade1) * 6;
        if (grade1 >= 5) earnedCredits += 6;

        // Subject 2: 4 ECTS
        attemptedCredits += 4;
        weightedSum += uint256(grade2) * 4;
        if (grade2 >= 5) earnedCredits += 4;

        // Subject 3: 5 ECTS
        attemptedCredits += 5;
        weightedSum += uint256(grade3) * 5;
        if (grade3 >= 5) earnedCredits += 5;

        // Verify the accumulated ECTS credits (only passable grades)
        assertEq(gradebook.getStudentCredits(student), earnedCredits);

        // Verify the final weighted average (using ALL attempted credits)
        if (attemptedCredits > 0) {
            uint256 expectedAvg = (weightedSum * 100) / attemptedCredits;
            assertEq(gradebook.getWeightedAverage(student), expectedAvg);
        } else {
            assertEq(gradebook.getWeightedAverage(student), 0);
        }
    }
}
