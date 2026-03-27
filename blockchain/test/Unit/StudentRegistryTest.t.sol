// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {StudentRegistry} from "../../src/StudentRegistry.sol";

import {IUniversityCore} from "../../src/Interfaces/IUniversityCore.sol";
import {IERC4671} from "../../src/Interfaces/IERC4671.sol";
import {IERC165} from "../../src/Interfaces/IERC165.sol";

contract StudentRegistryTest is Test {
    StudentRegistry public registry;

    address public core = makeAddr("universityCore");
    address public student = makeAddr("student");
    address public intruder = makeAddr("intruder");

    function setUp() public {
        registry = new StudentRegistry(core);
    }

    function test_EnrollStudentSuccess() public {
        vm.prank(core);
        registry.enrollStudent(student, "Faculty of Computer Science", "ID12345");

        assertEq(registry.balanceOf(student), 1);
        assertTrue(registry.hasValid(student));

        (uint256 regDate, string memory faculty, string memory regNum, bool revoked) =
            registry.getStudentMetadata(student);

        assertEq(faculty, "Faculty of Computer Science");
        assertEq(regNum, "ID12345");
        assertFalse(revoked);
        assertEq(regDate, block.timestamp);
    }

    function test_RevertIfNotCoreAttemptsEnroll() public {
        vm.prank(intruder);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__NotCore.selector, intruder));
        registry.enrollStudent(student, "Faculty of Computer Science", "999");
    }

    function test_RevertIfStudentAlreadyRegistered() public {
        vm.startPrank(core);
        registry.enrollStudent(student, "Faculty of Computer Science", "111");

        vm.expectRevert(
            abi.encodeWithSelector(StudentRegistry.StudentRegistry__StudentAlreadyRegistered.selector, student)
        );
        registry.enrollStudent(student, "Faculty of Computer Science", "111");
        vm.stopPrank();
    }

    function test_RevokeSuccess() public {
        vm.prank(core);
        registry.enrollStudent(student, "Faculty of Computer Science", "111");
        uint256 tokenId = registry.s_studentToTokenId(student);

        vm.prank(core);
        registry.revoke(tokenId);

        assertFalse(registry.isValid(tokenId));
        assertFalse(registry.hasValid(student));

        (,,, bool revoked) = registry.getStudentMetadata(student);
        assertTrue(revoked);
    }

    function test_RevertIfRevokingInvalidToken() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__InvalidTokenId.selector, 999));
        registry.revoke(999);
    }

    function test_GetMetadataRevertsForNonExistentStudent() public {
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__StudentNotEnrolled.selector, intruder));
        registry.getStudentMetadata(intruder);
    }

    function test_SupportsInterfaceERC4671andERC165() public view {
        assertTrue(registry.supportsInterface(type(IERC4671).interfaceId));
        assertTrue(registry.supportsInterface(type(IERC165).interfaceId));
        assertFalse(registry.supportsInterface(0xffffffff));
    }
}
