// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC5192} from "../../src/interfaces/IERC5192.sol";

import {Certification} from "../../src/modules/Certification.sol";
import {ICertification} from "../../src/interfaces/ICertification.sol";
import {SoulboundNFT} from "../../src/shared/SoulboundNFT.sol";

contract CertificationTest is Test {
    Certification public certification;

    address public core = makeAddr("universityCore");
    address public issuer = makeAddr("diplomaIssuer");
    address public student = makeAddr("studentAbsolvent");
    address public alice = makeAddr("alice");

    uint256 public constant CREDITS_REQUIRED = 180;
    uint256 public constant MINIMUM_AVERAGE = 500;

    bytes32 public constant DOC_HASH = keccak256("univchain-diploma-json-v1");
    string public constant META_URI = "ipfs://QmUnivChainDiploma/metadata.json";

    function setUp() public {
        certification = new Certification(core, CREDITS_REQUIRED, MINIMUM_AVERAGE);
    }

    function _issueDefaultDiploma(address who, uint256 credits, uint256 avg) internal {
        vm.prank(core);
        certification.issueDiploma(who, credits, avg, DOC_HASH, META_URI, issuer);
    }

    function test_RevertIfConstructorCoreAddressZero() public {
        vm.expectRevert(Certification.Certification__AddressZero.selector);
        new Certification(address(0), CREDITS_REQUIRED, MINIMUM_AVERAGE);
    }

    function test_GetUniversityCoreContract() public view {
        assertEq(certification.getUniversityCoreContract(), core);
    }

    function test_IssueDiplomaSuccess() public {
        uint256 credits = 180;
        uint256 avg = 950;

        _issueDefaultDiploma(student, credits, avg);

        uint256 expectedTokenId = 1;
        assertEq(certification.balanceOf(student), 1);
        assertEq(certification.ownerOf(expectedTokenId), student);
        assertTrue(certification.hasDiploma(student));
        assertTrue(certification.isDiplomaValid(expectedTokenId));
        assertEq(certification.getDiplomaIdForStudent(student), expectedTokenId);
        assertEq(certification.tokenURI(expectedTokenId), META_URI);

        ICertification.Diploma memory diploma = certification.getDiploma(expectedTokenId);
        assertEq(diploma.documentHash, DOC_HASH);
        assertEq(diploma.totalCredits, credits);
        assertEq(diploma.finalAverage, avg);
        assertEq(diploma.issueTimestamp, block.timestamp);
        assertEq(diploma.issuer, issuer);
        assertFalse(diploma.revoked);
    }

    function test_IssueDiplomaWithHashOnlyAnchor() public {
        vm.prank(core);
        certification.issueDiploma(student, 180, 800, DOC_HASH, META_URI, issuer);

        ICertification.Diploma memory diploma = certification.getDiploma(1);
        assertEq(diploma.documentHash, DOC_HASH);
        assertEq(diploma.metadataURI, META_URI);
    }

    function test_IssueDiplomaWithUriOnlyAnchor() public {
        vm.prank(core);
        certification.issueDiploma(student, 180, 800, bytes32(0), META_URI, issuer);

        assertEq(certification.tokenURI(1), META_URI);
        assertEq(certification.getDiploma(1).documentHash, bytes32(0));
    }

    function test_RevertIfInvalidCredentialAnchor() public {
        vm.prank(core);
        vm.expectRevert(Certification.Certification__InvalidCredentialAnchor.selector);
        certification.issueDiploma(student, 180, 800, DOC_HASH, "", issuer);
    }

    function test_RevertIfIssuerAddressZero() public {
        vm.prank(core);
        vm.expectRevert(Certification.Certification__AddressZero.selector);
        certification.issueDiploma(student, 180, 800, DOC_HASH, META_URI, address(0));
    }

    function test_RevertIfStudentAlreadyHasDiploma() public {
        _issueDefaultDiploma(student, 180, 800);

        vm.prank(core);
        vm.expectRevert(
            abi.encodeWithSelector(Certification.Certification__StudentAlreadyHasDiploma.selector, student)
        );
        certification.issueDiploma(student, 180, 800, DOC_HASH, META_URI, issuer);
    }

    function test_RevertIfAverageTooLow() public {
        vm.prank(core);
        vm.expectRevert(
            abi.encodeWithSelector(Certification.Certification__AverageTooLow.selector, student, uint256(499))
        );
        certification.issueDiploma(student, 180, 499, DOC_HASH, META_URI, issuer);
    }

    function test_RevertIfNotEnoughCredits() public {
        vm.prank(core);
        vm.expectRevert(
            abi.encodeWithSelector(Certification.Certification__NotEnoughCredits.selector, student, uint256(175))
        );
        certification.issueDiploma(student, 175, 800, DOC_HASH, META_URI, issuer);
    }

    function test_RevertIfNotCoreAttemptsIssue() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Certification.Certification__NotCore.selector, alice));
        certification.issueDiploma(student, 180, 800, DOC_HASH, META_URI, issuer);
    }

    function test_HasValidDiplomaAfterRevoke() public {
        _issueDefaultDiploma(student, 180, 950);
        uint256 tokenId = 1;

        assertTrue(certification.hasDiploma(student));
        assertTrue(certification.hasValidDiploma(student));

        vm.prank(core);
        certification.revokeDiploma(tokenId);

        assertTrue(certification.hasDiploma(student));
        assertFalse(certification.hasValidDiploma(student));
        assertFalse(certification.isDiplomaValid(tokenId));
    }

    function test_RevokeDiplomaSuccess() public {
        _issueDefaultDiploma(student, 180, 950);
        uint256 tokenId = 1;

        vm.prank(core);
        certification.revokeDiploma(tokenId);

        assertFalse(certification.isDiplomaValid(tokenId));
        assertTrue(certification.hasDiploma(student));
        assertTrue(certification.getDiploma(tokenId).revoked);
    }

    function test_RevertRevokeDiplomaTwice() public {
        _issueDefaultDiploma(student, 180, 950);

        vm.startPrank(core);
        certification.revokeDiploma(1);
        vm.expectRevert(abi.encodeWithSelector(Certification.Certification__DiplomaAlreadyRevoked.selector, 1));
        certification.revokeDiploma(1);
        vm.stopPrank();
    }

    function test_RevertIfStudentAttemptsTransferDiploma() public {
        _issueDefaultDiploma(student, 180, 950);
        uint256 tokenId = certification.getDiplomaIdForStudent(student);

        vm.prank(student);
        vm.expectRevert(SoulboundNFT.SoulBoundNFT__NotAuthorized.selector);
        certification.transferFrom(student, alice, tokenId);
    }

    function test_HasDiplomaReturnsFalseIfNotIssued() public view {
        assertFalse(certification.hasDiploma(alice));
    }

    function test_SupportsInterfaceERC721andERC165() public view {
        assertTrue(certification.supportsInterface(type(IERC721).interfaceId));
        assertTrue(certification.supportsInterface(type(IERC165).interfaceId));
        assertTrue(certification.supportsInterface(0xb45a3c0e));
        assertFalse(certification.supportsInterface(0xffffffff));
    }

    function test_MintEmitsLockedEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IERC5192.Locked(1);

        _issueDefaultDiploma(student, 180, 800);

        assertTrue(certification.locked(1));
    }

    function testFuzz_CompleteDiplomaFlow(uint256 rawCredits, uint256 rawAvg) public {
        uint256 credits = bound(rawCredits, CREDITS_REQUIRED, 500);
        uint256 avg = bound(rawAvg, 500, 1000);

        vm.prank(core);
        certification.issueDiploma(student, credits, avg, DOC_HASH, META_URI, issuer);

        uint256 tokenId = certification.getDiplomaIdForStudent(student);
        assertTrue(certification.isDiplomaValid(tokenId));

        ICertification.Diploma memory diploma = certification.getDiploma(tokenId);
        assertEq(diploma.totalCredits, credits);
        assertEq(diploma.finalAverage, avg);
        assertEq(diploma.documentHash, DOC_HASH);
        assertEq(diploma.issuer, issuer);

        vm.prank(student);
        vm.expectRevert(SoulboundNFT.SoulBoundNFT__NotAuthorized.selector);
        certification.transferFrom(student, alice, tokenId);
    }
}
