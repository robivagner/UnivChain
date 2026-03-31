// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {Gradebook} from "../../src/Gradebook.sol";

contract GradebookTest is Test {
    Gradebook public gradebook;

    address public core = makeAddr("universityCore");
    address public professor = makeAddr("professorX");
    address public student = makeAddr("studentA");
    address public alice = makeAddr("alice");

    function setUp() public {
        gradebook = new Gradebook(core);

        vm.startPrank(core);
        gradebook.addSubject("Blockchain", 6, professor); // ID 1
        gradebook.addSubject("Algoritmi", 4, professor); // ID 2
        gradebook.addSubject("Mate", 5, professor); // ID 3
        vm.stopPrank();
    }

    function test_AddSubjectIncrementsId() public {
        vm.prank(core);
        gradebook.addSubject("Fizica", 4, professor);

        (string memory name, uint8 credits,,) = gradebook.getSubjectMetadata(4);
        assertEq(name, "Fizica");
        assertEq(credits, 4);
    }

    function test_RevertAddSubjectIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotCore.selector, alice));
        gradebook.addSubject("Fizica", 4, professor);
    }

    function test_RevertPostGradeIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotCore.selector, alice));
        gradebook.postGrade(professor, student, 1, 4);
    }

    function test_RevertSetSubjectActivityIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotCore.selector, alice));
        gradebook.setSubjectActivity(professor, 1, false);
    }

    function test_SetSubjectActivityOnlyProfessor() public {
        vm.prank(core);
        gradebook.setSubjectActivity(professor, 1, false);

        (,,, bool isActive) = gradebook.getSubjectMetadata(1);
        assertFalse(isActive);
    }

    function test_PostGradeUpdatesCreditsOnPass() public {
        vm.startPrank(core);
        gradebook.postGrade(professor, student, 1, 4);
        assertEq(gradebook.getStudentCredits(student), 0);

        gradebook.postGrade(professor, student, 1, 7);
        assertEq(gradebook.getStudentCredits(student), 6);
        vm.stopPrank();
    }

    function test_RevertPostGradeNotProfessor() public {
        vm.startPrank(core);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__NotProfessorOfSubject.selector, student, 1));
        gradebook.postGrade(student, student, 1, 4);
    }

    function test_RevertIfGradeIsInvalid() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(Gradebook.Gradebook__GradeGreaterThanTen.selector, 11));
        gradebook.postGrade(professor, student, 1, 11);
    }

    function test_WeightedAverageCorrectness() public {
        vm.startPrank(core);
        gradebook.postGrade(professor, student, 1, 10);
        gradebook.postGrade(professor, student, 2, 5);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        uint256 avg = gradebook.getWeightedAverage(student, ids);
        assertEq(avg, 800);
    }

    function testFuzz_WeightedAverage(uint8 grade1, uint8 grade2) public {
        vm.assume(grade1 <= 10 && grade1 > 0);
        vm.assume(grade2 <= 10 && grade2 > 0);

        vm.startPrank(core);
        gradebook.postGrade(professor, student, 1, grade1);
        gradebook.postGrade(professor, student, 2, grade2);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        uint256 expectedAvg = (uint256(grade1) * 6 + uint256(grade2) * 4) * 100 / 10;
        assertEq(gradebook.getWeightedAverage(student, ids), expectedAvg);
    }

    function test_WeightedAverageReturnsZeroIfNoCredits() public view {
        uint256[] memory ids = new uint256[](1);
        ids[0] = 3;

        assertEq(gradebook.getWeightedAverage(student, ids), 0);
    }
}
