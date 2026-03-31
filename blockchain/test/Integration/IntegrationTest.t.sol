// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {DeployUniversity} from "../../script/DeployUniversity.s.sol";
import {UniversityCore} from "../../src/UniversityCore.sol";
import {StudentRegistry} from "../../src/StudentRegistry.sol";
import {Gradebook} from "../../src/Gradebook.sol";
import {Certification} from "../../src/Certification.sol";

contract IntegrationTest is Test {
    UniversityCore core;
    StudentRegistry registry;
    Gradebook gradebook;
    Certification certification;

    address admin = makeAddr("admin");
    address professor = makeAddr("profesor");
    address student = makeAddr("student");

    function setUp() public {
        DeployUniversity deployer = new DeployUniversity();
        (core, registry, gradebook, certification) = deployer.runWithAdmin(admin);
    }

    function test_FullAcademicCycle() public {
        vm.prank(admin);
        core.enrollStudent(student, "RO123");

        vm.startPrank(admin);
        core.addProfessor(professor);
        core.addSubject("Object Oriented Programming", 100, professor);
        core.addSubject("Advanced Programming", 80, professor);
        vm.stopPrank();

        vm.startPrank(professor);
        core.postGrade(student, 1, 10);
        core.postGrade(student, 2, 8);
        vm.stopPrank();

        uint256[] memory subjects = new uint256[](2);
        subjects[0] = 1;
        subjects[1] = 2;

        vm.prank(admin);
        core.issueDiploma(student, "Engineer", "Computer Science", subjects);

        assertEq(certification.balanceOf(student), 1);

        uint256 tokenId = certification.getDiplomaIdForStudent(student);
        (uint256 avg,, string memory title,) = certification.getDiplomaMetadata(tokenId);

        // 9.11
        assertEq(avg, 911);
        assertEq(title, "Engineer");

        console.log("Average graduated with:", avg);
    }

    function test_RevertEnrollStudentNotAdmin() public {
        vm.prank(student);
        vm.expectRevert();
        core.enrollStudent(student, "RO123");
    }

    function test_RevertEnrollStudentTwice() public {
        vm.prank(admin);
        core.enrollStudent(student, "RO123");

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentEnrolledAlready.selector, student));
        core.enrollStudent(student, "RO123");
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
        vm.prank(admin);
        core.enrollStudent(student, "RO123");

        vm.startPrank(admin);
        core.addProfessor(professor);
        core.addSubject("Advanced Programming", 6, professor);
        vm.stopPrank();

        vm.prank(student);
        vm.expectRevert();
        core.postGrade(student, 1, 10);
    }

    function test_RevertPostGradeStudentNotEnrolled() public {
        vm.startPrank(admin);
        core.addProfessor(professor);
        core.addSubject("Advanced Programming", 6, professor);
        vm.stopPrank();

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
        uint256[] memory subjects = new uint256[](2);
        subjects[0] = 1;
        subjects[1] = 2;

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentIsNotEnrolled.selector, student));
        core.issueDiploma(student, "Engineer", "Computer Science", subjects);
    }

    function test_RevertIssueDiplomaStudentAlreadyHasDiploma() public {
        vm.prank(admin);
        core.enrollStudent(student, "RO123");

        vm.startPrank(admin);
        core.addProfessor(professor);
        core.addSubject("Object Oriented Programming", 100, professor);
        core.addSubject("Advanced Programming", 80, professor);
        vm.stopPrank();

        vm.startPrank(professor);
        core.postGrade(student, 1, 10);
        core.postGrade(student, 2, 8);
        vm.stopPrank();

        uint256[] memory subjects = new uint256[](2);
        subjects[0] = 1;
        subjects[1] = 2;

        vm.prank(admin);
        core.issueDiploma(student, "Engineer", "Computer Science", subjects);

        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(UniversityCore.UniversityCore__StudentAlreadyHasDiploma.selector, student)
        );
        core.issueDiploma(student, "Engineer", "Computer Science", subjects);
    }
}
