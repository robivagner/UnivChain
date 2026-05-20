// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {StudentRegistry} from "../../src/modules/StudentRegistry.sol";
import {SoulboundNFT} from "../../src/shared/SoulboundNFT.sol";

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

    /// @notice Verifies that a student can be successfully enrolled and their Soulbound Identity NFT is minted.
    function test_EnrollStudentSuccess() public {
        vm.prank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);

        // Verify ERC721 properties
        uint256 tokenId = registry.getStudentTokenId(student);
        assertEq(tokenId, 1);
        assertEq(registry.balanceOf(student), 1);
        assertEq(registry.ownerOf(tokenId), student);
        assertTrue(registry.isStudentEnrolled(student));

        // Verify the stored internal state of the student record
        (bytes32 hash, uint256 regTimestamp, uint256 gradTimestamp, bool hasGraduated, bool isExpelled) =
            registry.getStudentMetadata(tokenId);

        assertEq(hash, STUDENT_ID_HASH);
        assertEq(regTimestamp, block.timestamp);
        assertEq(gradTimestamp, 0);
        assertFalse(hasGraduated);
        assertFalse(isExpelled);
    }

    function test_RevertIfEnrollWithAddressZero() public {
        vm.prank(core);
        vm.expectRevert(StudentRegistry.StudentRegistry__AddressZero.selector);
        registry.enrollStudent(address(0), STUDENT_ID_HASH);
    }

    function test_RevertIfNotCoreAttemptsEnroll() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__NotCore.selector, alice));
        registry.enrollStudent(student, STUDENT_ID_HASH);
    }

    //////////////////////////////////
    /////// Graduate Functions ///////
    //////////////////////////////////

    /// @notice Ensures graduating a student updates their status correctly and securely burns their Identity NFT.
    function test_GraduateStudentSuccess() public {
        vm.startPrank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);
        uint256 tokenId = registry.getStudentTokenId(student);

        // Advance blockchain time to simulate the passage of an academic year
        skip(365 days);
        uint256 gradTime = block.timestamp;

        registry.graduateStudent(student);
        vm.stopPrank();

        // NFT is burned upon graduation based on the _burn logic in the contract
        assertEq(registry.balanceOf(student), 0);
        assertTrue(registry.hasStudentGraduated(student));

        // Verify the updated metadata confirms the graduation timestamp
        (,, uint256 gradTimestamp, bool hasGraduated, bool isExpelled) = registry.getStudentMetadata(tokenId);

        assertEq(gradTimestamp, gradTime);
        assertTrue(hasGraduated);
        assertFalse(isExpelled);
    }

    function test_RevertIfGraduatingNonExistentStudent() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__InvalidTokenId.selector, 0));
        registry.graduateStudent(alice);
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

    /// @notice Tests if the expulsion mechanism correctly burns the Identity NFT and flags the student.
    function test_ExpellStudentSuccess() public {
        vm.startPrank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);
        uint256 tokenId = registry.getStudentTokenId(student);

        registry.expellStudent(student);
        vm.stopPrank();

        // NFT must be burned upon expulsion
        assertEq(registry.balanceOf(student), 0);
        assertTrue(registry.isStudentExpelled(student));

        (,,,, bool isExpelled) = registry.getStudentMetadata(tokenId);
        assertTrue(isExpelled);
    }

    function test_RevertIfExpellingNonExistentStudent() public {
        vm.prank(core);
        vm.expectRevert(abi.encodeWithSelector(StudentRegistry.StudentRegistry__InvalidTokenId.selector, 0));
        registry.expellStudent(alice);
    }

    ////////////////////////////////////
    /////// Soulbound Constraint ///////
    ////////////////////////////////////

    /// @notice Verifies the core security assumption: a university ID NFT cannot be transferred.
    function test_RevertIfStudentAttemptsTransfer() public {
        vm.startPrank(core);
        registry.enrollStudent(student, STUDENT_ID_HASH);
        uint256 tokenId = registry.getStudentTokenId(student);
        vm.stopPrank();

        vm.prank(student);
        vm.expectRevert(SoulboundNFT.SoulBoundNFT__NotAuthorized.selector);
        registry.transferFrom(student, alice, tokenId);
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

    function test_SupportsInterfaceERC721andERC165() public view {
        assertTrue(registry.supportsInterface(type(IERC721).interfaceId));
        assertTrue(registry.supportsInterface(type(IERC165).interfaceId));
        assertFalse(registry.supportsInterface(0xffffffff));
    }

    ///////////////////////////////////
    /////// Fuzz Tests ////////////////
    ///////////////////////////////////

    /// @notice A complete lifecycle fuzz test validating enrollment, time passage, and final state changes
    /// (graduation or expulsion) with dynamic inputs.
    function testFuzz_CompleteStudentLifecycle(
        address randomStudent,
        bytes32 randomHash,
        uint256 timeJump,
        bool simulateExpulsion
    ) public {
        // Bound constraints to prevent address zero issues and extreme time travels
        vm.assume(randomStudent != address(0));
        uint256 skipTime = bound(timeJump, 1 days, 3650 days); // 1 to 10 years

        // 1. Enrollment
        vm.startPrank(core);
        registry.enrollStudent(randomStudent, randomHash);
        uint256 tokenId = registry.getStudentTokenId(randomStudent);

        assertTrue(registry.isStudentEnrolled(randomStudent));
        assertEq(registry.ownerOf(tokenId), randomStudent);

        // Simulate time passing (e.g., student studying)
        skip(skipTime);

        // 2. Lifecycle End (Graduation OR Expulsion based on fuzzing param)
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

            // Check if the graduation timestamp recorded properly
            (,, uint256 gradTimestamp,,) = registry.getStudentMetadata(tokenId);
            assertEq(gradTimestamp, block.timestamp);
        }
        vm.stopPrank();

        // 3. Final Security Assertion: In both lifecycle ends, the NFT MUST be burned
        assertEq(registry.balanceOf(randomStudent), 0);
    }
}
