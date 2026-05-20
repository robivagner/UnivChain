// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {Certification} from "../../src/modules/Certification.sol";
import {SoulboundNFT} from "../../src/shared/SoulboundNFT.sol";

contract CertificationTest is Test {
    Certification public certification;

    address public core = makeAddr("universityCore");
    address public student = makeAddr("studentAbsolvent");
    address public alice = makeAddr("alice");

    uint256 public constant CREDITS_REQUIRED = 180;

    function setUp() public {
        certification = new Certification(core, CREDITS_REQUIRED);
    }

    ///////////////////////////////////
    /////// Constructor & Setup ///////
    ///////////////////////////////////

    function test_RevertIfConstructorCoreAddressZero() public {
        vm.expectRevert(Certification.Certification__AddressZero.selector);
        new Certification(address(0), CREDITS_REQUIRED);
    }

    function test_GetUniversityCoreContract() public view {
        assertEq(certification.getUniversityCoreContract(), core);
    }

    ///////////////////////////////////////
    /////// Issue Diploma Functions ///////
    ///////////////////////////////////////

    /// @notice Tests if a diploma is successfully issued when the student meets the exact credit threshold.
    function test_IssueDiplomaSuccess() public {
        uint256 credits = 180; // Minimum required credits
        uint256 avg = 950; // Grade average (e.g., 9.50 represented as 950)

        vm.prank(core);
        certification.issueDiploma(student, "Bachelor of Computer Science", "Engineering", credits, avg);

        // ERC721 ownership and balance assertions
        uint256 expectedTokenId = 1;
        assertEq(certification.balanceOf(student), 1);
        assertEq(certification.ownerOf(expectedTokenId), student);
        assertTrue(certification.hasDiploma(student));
        assertEq(certification.getDiplomaIdForStudent(student), expectedTokenId);

        // Verify the stored diploma metadata
        (uint256 savedAvg, uint256 issueTimestamp, string memory title, string memory major) =
            certification.getDiplomaMetadata(expectedTokenId);

        assertEq(savedAvg, avg);
        assertEq(title, "Bachelor of Computer Science");
        assertEq(major, "Engineering");
        assertEq(issueTimestamp, block.timestamp);
    }

    /// @notice Tests if a diploma is successfully issued when credits exceed the minimum requirement.
    function test_IssueDiplomaWithMoreCreditsSuccess() public {
        uint256 credits = 210; // Above the minimum required credits

        vm.prank(core);
        certification.issueDiploma(student, "Bachelor of IT", "Information Technology", credits, 900);

        assertEq(certification.balanceOf(student), 1);
        assertTrue(certification.hasDiploma(student));
    }

    function test_RevertIfNotEnoughCredits() public {
        uint256 creditsIncomplete = 175; // Below the 180 required credits threshold

        vm.prank(core);
        vm.expectRevert(
            abi.encodeWithSelector(Certification.Certification__NotEnoughCredits.selector, student, creditsIncomplete)
        );
        certification.issueDiploma(student, "Bachelor of IT", "Information Technology", creditsIncomplete, 800);
    }

    function test_RevertIfNotCoreAttemptsIssue() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Certification.Certification__NotCore.selector, alice));
        certification.issueDiploma(student, "Bachelor of IT", "Information Technology", 180, 800);
    }

    ////////////////////////////////////
    /////// Soulbound Constraint ///////
    ////////////////////////////////////

    /// @notice Ensures the diploma behaves as a Soulbound Token (SBT) and cannot be transferred.
    function test_RevertIfStudentAttemptsTransferDiploma() public {
        // Setup: Issue the diploma to the student first
        vm.startPrank(core);
        certification.issueDiploma(student, "Bachelor of IT", "Information Technology", 180, 950);
        uint256 tokenId = certification.getDiplomaIdForStudent(student);
        vm.stopPrank();

        // Attempting to transfer the diploma should fail
        vm.prank(student);
        vm.expectRevert(SoulboundNFT.SoulBoundNFT__NotAuthorized.selector);
        certification.transferFrom(student, alice, tokenId);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function test_HasDiplomaReturnsFalseIfNotIssued() public view {
        assertFalse(certification.hasDiploma(alice));
    }

    function test_SupportsInterfaceERC721andERC165() public view {
        assertTrue(certification.supportsInterface(type(IERC721).interfaceId));
        assertTrue(certification.supportsInterface(type(IERC165).interfaceId));
        assertFalse(certification.supportsInterface(0xffffffff));
    }

    ///////////////////////////////////
    /////// Fuzz Tests ////////////////
    ///////////////////////////////////

    /// @notice Fuzzes the diploma issuance process with random valid credits and averages,
    /// then verifies metadata integrity and soulbound constraints.
    function testFuzz_CompleteDiplomaFlow(uint256 rawCredits, uint256 rawAvg) public {
        // 1. Constraints
        // Bound credits between the minimum requirement and a reasonable maximum (e.g., 500 ECTS)
        uint256 credits = bound(rawCredits, CREDITS_REQUIRED, 500);

        // Bound the average between a passing grade (5.00 -> 500) and maximum grade (10.00 -> 1000)
        uint256 avg = bound(rawAvg, 500, 1000);

        string memory degreeTitle = "Fuzzed Bachelor Degree";
        string memory major = "Fuzzed Major";

        // 2. Core issues the diploma
        vm.prank(core);
        certification.issueDiploma(student, degreeTitle, major, credits, avg);

        // 3. State and Balance Assertions
        uint256 tokenId = certification.getDiplomaIdForStudent(student);
        assertEq(certification.balanceOf(student), 1);
        assertEq(certification.ownerOf(tokenId), student);
        assertTrue(certification.hasDiploma(student));

        // 4. Verify Metadata Math and Storage Integrity
        (uint256 savedAvg, uint256 issueTimestamp, string memory savedTitle, string memory savedMajor) =
            certification.getDiplomaMetadata(tokenId);

        assertEq(savedAvg, avg);
        assertEq(savedTitle, degreeTitle);
        assertEq(savedMajor, major);
        assertEq(issueTimestamp, block.timestamp);

        // 5. Soulbound Security Check
        vm.prank(student);
        vm.expectRevert(SoulboundNFT.SoulBoundNFT__NotAuthorized.selector);
        certification.transferFrom(student, alice, tokenId);
    }
}
