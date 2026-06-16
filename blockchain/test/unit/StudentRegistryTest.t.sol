// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";

import {StudentRegistry} from "../../src/modules/StudentRegistry.sol";

contract StudentRegistryTest is Test {
    StudentRegistry public registry;

    address public core = makeAddr("universityCore");
    address public student = makeAddr("student");
    address public alice = makeAddr("alice");

    bytes32 public constant STUDENT_ID_HASH = keccak256(abi.encode("RO1234"));

    function setUp() public {
        registry = new StudentRegistry(core);
    }

    //////////////////////////////
    /////// Initialization ///////
    //////////////////////////////

    function test_RevertIfConstructorCoreAddressZero() public {
        vm.expectRevert(StudentRegistry.StudentRegistry__AddressZero.selector);
        new StudentRegistry(address(0));
    }

    ////////////////////////////////
    /////// Enroll Functions ///////
    ////////////////////////////////

    function test_EnrollStudentSuccess() public {
        vm.prank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);

        uint256 studentId = registry.getStudentId(student);
        assertEq(studentId, 1);
        assertTrue(registry.isStudentEnrolled(student));
        assertTrue(registry.s_studentIsActive(student));

        (bytes32 hash, uint256 regTimestamp, uint256 gradTimestamp, bool hasGraduated, bool isExpelled) =
            registry.getStudentMetadata(studentId);

        assertEq(hash, STUDENT_ID_HASH);
        assertEq(regTimestamp, block.timestamp);
        assertEq(gradTimestamp, 0);
        assertFalse(hasGraduated);
        assertFalse(isExpelled);
    }

    function test_RevertIfNotCoreAttemptsEnroll() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__NotCore.selector, alice));
        registry.enrollStudent(student, STUDENT_ID_HASH);
    }

    function test_RevertGetStudentMetadataInvalidStudentId() public {
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__InvalidStudentId.selector, 0));
        registry.getStudentMetadata(0);
    }

    //////////////////////////////////
    /////// Graduate Functions ///////
    //////////////////////////////////

    function test_GraduateStudentSuccess() public {
        vm.startPrank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);
        uint256 studentId = registry.getStudentId(student);

        skip(365 days);
        uint256 gradTime = block.timestamp;

        registry.graduateStudent(student);
        vm.stopPrank();

        assertFalse(registry.isStudentEnrolled(student));
        assertFalse(registry.s_studentIsActive(student));
        assertTrue(registry.hasStudentGraduated(student));

        (,, uint256 gradTimestamp, bool hasGraduated, bool isExpelled) = registry.getStudentMetadata(studentId);

        assertEq(gradTimestamp, gradTime);
        assertTrue(hasGraduated);
        assertFalse(isExpelled);
    }

    function test_RevertIfGraduatingNonExistentStudent() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__StudentNotEnrolled.selector, alice));
        registry.graduateStudent(alice);
    }

    function test_RevertIfEnrollingAlreadyEnrolledStudent() public {
        vm.startPrank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);

        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__StudentAlreadyEnrolled.selector, student));
        registry.enrollStudent(student, STUDENT_ID_HASH);
        vm.stopPrank();
    }

    function test_RevertIfReEnrollingExpelledStudent() public {
        vm.startPrank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);
        registry.expellStudent(student);

        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__StudentIsExpelled.selector, student));
        registry.enrollStudent(student, STUDENT_ID_HASH);
        vm.stopPrank();
    }

    function test_RevertIfNotCoreAttemptsGraduate() public {
        vm.prank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__NotCore.selector, alice));
        registry.graduateStudent(student);
    }

    ////////////////////////////////
    /////// Expell Functions ///////
    ////////////////////////////////

    function test_ExpellStudentSuccess() public {
        vm.startPrank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);
        uint256 studentId = registry.getStudentId(student);

        registry.expellStudent(student);
        vm.stopPrank();

        assertFalse(registry.isStudentEnrolled(student));
        assertTrue(registry.isStudentExpelled(student));

        (,,,, bool isExpelled) = registry.getStudentMetadata(studentId);
        assertTrue(isExpelled);
    }

    function test_RevertIfExpellingNonExistentStudent() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__StudentNotEnrolled.selector, alice));
        registry.expellStudent(alice);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function test_GetUniversityCoreContract() public view {
        assertEq(registry.getUniversityCoreContract(), core);
    }

    function test_IsStudentEnrolledReturnsFalseIfNotEnrolled() public view {
        assertFalse(registry.isStudentEnrolled(alice));
    }

    function test_IsStudentExpelledReturnsFalseInitially() public {
        vm.prank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);
        assertFalse(registry.isStudentExpelled(student));
    }

    function test_HasStudentGraduatedReturnsFalseInitially() public {
        vm.prank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);
        assertFalse(registry.hasStudentGraduated(student));
    }

    ///////////////////////////////////
    /////// Fuzz Tests ////////////////
    ///////////////////////////////////

    function testFuzz_CompleteStudentLifecycle(
        address randomStudent,
        bytes32 randomHash,
        uint256 timeJump,
        bool simulateExpulsion
    ) public {
        vm.assume(randomStudent != address(0));
        uint256 skipTime = bound(timeJump, 1 days, 3650 days);

        vm.startPrank(core);
        registry.enrollStudent(randomStudent, randomHash);
        uint256 studentId = registry.getStudentId(randomStudent);

        assertTrue(registry.isStudentEnrolled(randomStudent));

        skip(skipTime);

        if (simulateExpulsion) {
            registry.expellStudent(randomStudent);

            assertTrue(registry.isStudentExpelled(randomStudent));
            assertFalse(registry.isStudentEnrolled(randomStudent));
            assertFalse(registry.hasStudentGraduated(randomStudent));
        } else {
            registry.graduateStudent(randomStudent);

            assertTrue(registry.hasStudentGraduated(randomStudent));
            assertFalse(registry.isStudentEnrolled(randomStudent));
            assertFalse(registry.isStudentExpelled(randomStudent));

            (,, uint256 gradTimestamp,,) = registry.getStudentMetadata(studentId);
            assertEq(gradTimestamp, block.timestamp);
        }
        vm.stopPrank();

        assertFalse(registry.isStudentEnrolled(randomStudent));
    }
}
