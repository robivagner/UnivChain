// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {Certification} from "../../src/Certification.sol";

import {IUniversityCore} from "../../src/Interfaces/IUniversityCore.sol";
import {IERC4671} from "../../src/Interfaces/IERC4671.sol";
import {IERC165} from "../../src/Interfaces/IERC165.sol";

contract CertificationTest is Test {
    Certification public certification;

    address public core = makeAddr("universityCore");
    address public student = makeAddr("studentAbsolvent");
    address public intruder = makeAddr("intruder");

    function setUp() public {
        // Facem deploy la contractul de certificare raportat la Core
        certification = new Certification(core);
    }

    function test_IssueDiplomaSuccess() public {
        uint256 credits = 180; // Pragul minim
        uint256 avg = 950; // Media 9.50

        vm.prank(core);
        certification.issueDiploma(student, "Licenta in Calculatoare", "Inginerie", credits, avg);

        // Verificări SBT (Soulbound Token)
        assertEq(certification.balanceOf(student), 1);
        assertTrue(certification.hasValid(student));

        uint256 tokenId = certification.s_studentToDiplomaId(student);
        (uint256 savedAvg, uint256 issueDate, string memory title,) = certification.getDiplomaMetadata(tokenId);

        assertEq(savedAvg, 950);
        assertEq(title, "Licenta in Calculatoare");
        assertEq(issueDate, block.timestamp);
    }

    function test_RevertIfNotEnoughCredits() public {
        uint256 creditsIncomplete = 175; // Sub pragul de 180

        vm.prank(core);
        vm.expectRevert(
            abi.encodeWithSelector(Certification.Certification__NotEnoughCredits.selector, student, creditsIncomplete)
        );

        certification.issueDiploma(student, "Licenta", "IT", creditsIncomplete, 800);
    }

    function test_RevertIfNotCoreAttemptsIssue() public {
        vm.prank(intruder);
        vm.expectRevert(abi.encodeWithSelector(Certification.Certification__NotCore.selector, intruder));
        certification.issueDiploma(student, "Licenta", "IT", 180, 800);
    }

    function test_RevertOwnerOfIfDiplomaDoesNotExist() public {
        vm.expectRevert(abi.encodeWithSelector(Certification.Certification__DiplomaDoesNotExist.selector, 999));
        certification.ownerOf(999);
    }

    function test_SupportsInterfaceERC4671andERC165() public view {
        assertTrue(certification.supportsInterface(type(IERC4671).interfaceId));
        assertTrue(certification.supportsInterface(type(IERC165).interfaceId));
        assertFalse(certification.supportsInterface(0xffffffff));
    }
}
