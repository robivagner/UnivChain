// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {UniversityCore, AccessControl} from "../../src/UniversityCore.sol";
import {StudentRegistry} from "../../src/StudentRegistry.sol";
import {Gradebook} from "../../src/Gradebook.sol";
import {Certification} from "../../src/Certification.sol";

contract UniversityCoreTest is Test {
    UniversityCore core;
    StudentRegistry registry;
    Gradebook gradebook;
    Certification certification;

    address admin = makeAddr("admin");
    address professor = makeAddr("professor");
    address issuer = makeAddr("issuer");
    address alice = makeAddr("alice");

    function setUp() public {
        vm.startPrank(admin);

        core = new UniversityCore("Faculty of Computer Science", admin);

        vm.stopPrank();
    }

    function test_AdminCanAddProfessor() public {
        vm.prank(admin);
        core.addProfessor(professor);
        assertTrue(core.hasRole(core.PROFESSOR_ROLE(), professor));
    }

    function test_RevertOnlyAdminCanAddProfessor() public {
        vm.prank(alice);
        vm.expectRevert();
        core.addProfessor(professor);
    }

    function test_AdminCanAddDiplomaIssuer() public {
        vm.prank(admin);
        core.addDiplomaIssuer(issuer);
        assertTrue(core.hasRole(core.DIPLOMA_ISSUER_ROLE(), issuer));
    }

    function test_RevertOnlyAdminCanAddDiplomaIssuer() public {
        vm.expectRevert();
        core.addProfessor(issuer);
    }

    function test_AdminCanSetStudentRegistryContract() public {
        registry = new StudentRegistry(address(core));

        vm.prank(admin);
        core.setStudentRegistryContract(address(registry));

        assertTrue(core.getStudentRegistryContract() != address(0));
    }

    function test_RevertOnlyAdminCanSetStudentRegistryContract() public {
        registry = new StudentRegistry(address(core));
        vm.expectRevert();
        core.setStudentRegistryContract(address(registry));
    }

    function test_RevertZeroAddressSetStudentRegistryContract() public {
        vm.prank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__AddressZero.selector);
        core.setStudentRegistryContract(address(0));
    }

    function test_RevertSameAddressSetStudentRegistryContract() public {
        registry = new StudentRegistry(address(core));

        vm.prank(admin);
        core.setStudentRegistryContract(address(registry));

        vm.prank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__SameAddress.selector);
        core.setStudentRegistryContract(address(registry));
    }

    function test_AdminCanSetGradebookContract() public {
        gradebook = new Gradebook(address(core));

        vm.prank(admin);
        core.setGradebookContract(address(gradebook));

        assertTrue(core.getGradebookContract() != address(0));
    }

    function test_RevertOnlyAdminCanSetGradebookContract() public {
        gradebook = new Gradebook(address(core));
        vm.expectRevert();
        core.setGradebookContract(address(gradebook));
    }

    function test_RevertZeroAddressSetGradebookContract() public {
        vm.prank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__AddressZero.selector);
        core.setGradebookContract(address(0));
    }

    function test_RevertSameAddressSetGradebookContract() public {
        gradebook = new Gradebook(address(core));

        vm.prank(admin);
        core.setGradebookContract(address(gradebook));

        vm.prank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__SameAddress.selector);
        core.setGradebookContract(address(gradebook));
    }

    function test_AdminCanSetCertificationContract() public {
        certification = new Certification(address(core));

        vm.prank(admin);
        core.setCertificationContract(address(certification));

        assertTrue(core.getCertificationContract() != address(0));
    }

    function test_RevertOnlyAdminCanSetCertificationContract() public {
        certification = new Certification(address(core));
        vm.expectRevert();
        core.setCertificationContract(address(certification));
    }

    function test_RevertZeroAddressSetCertificationContract() public {
        vm.prank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__AddressZero.selector);
        core.setCertificationContract(address(0));
    }

    function test_RevertSameAddressSetCertificationContract() public {
        certification = new Certification(address(core));

        vm.prank(admin);
        core.setCertificationContract(address(certification));

        vm.prank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__SameAddress.selector);
        core.setCertificationContract(address(certification));
    }
}
