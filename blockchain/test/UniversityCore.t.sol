// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {UniversityCore} from "../src/UniversityCore.sol";
import {StudentRegistry} from "../src/StudentRegistry.sol";
import {Gradebook} from "../src/Gradebook.sol";
import {Certification} from "../src/Certification.sol";

contract UniversityCoreTest is Test {
    UniversityCore core;
    StudentRegistry registry;
    Gradebook gradebook;
    Certification certification;

    address admin = makeAddr("admin");
    address professor = makeAddr("professor");
    address student = makeAddr("student");
    address alice = makeAddr("alice");

    function setUp() public {
        vm.startPrank(admin);

        core = new UniversityCore("Faculty of Computer Science", admin);

        registry = new StudentRegistry(address(core));
        gradebook = new Gradebook(address(core));
        certification = new Certification(address(core));

        core.setStudentRegistryContract(address(registry));
        core.setGradebookContract(address(gradebook));
        core.setCertificationContract(address(certification));

        vm.stopPrank();
    }

    function test_AdminCanAddProfessor() public {
        vm.prank(admin);
        core.addProfessor(professor);
        assertTrue(core.hasRole(core.PROFESSOR_ROLE(), professor));
    }

    function test_NotAnyoneCanAddProfessor() public {
        vm.prank(alice);
        vm.expectRevert();
        core.addProfessor(alice);
    }

    function test_EnrollStudent() public {
        vm.prank(admin);
        core.enrollStudent(student, "MAT123");

        assertTrue(registry.hasValid(student));
        (uint256 date,,,) = registry.getStudentMetadata(student);
    }

    function test_RevertIfStudentAlreadyEnrolled() public {
        vm.startPrank(admin);
        core.enrollStudent(student, "MAT123");

        vm.expectRevert(abi.encodeWithSelector(UniversityCore.UniversityCore__StudentEnrolledAlready.selector, student));
        core.enrollStudent(student, "MAT456");
        vm.stopPrank();
    }
}
