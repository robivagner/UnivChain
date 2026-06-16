// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {IERC5192} from "../../src/interfaces/IERC5192.sol";
import {SoulboundNFT} from "../../src/shared/SoulboundNFT.sol";

contract SoulboundNFTHarness is SoulboundNFT {
    constructor() SoulboundNFT("Harness", "HARN") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }
}

contract SoulboundNFTTest is Test {
    SoulboundNFTHarness public token;
    address public holder = makeAddr("holder");
    address public other = makeAddr("other");

    function setUp() public {
        token = new SoulboundNFTHarness();
    }

    function test_SupportsInterfaceERC5192() public view {
        assertTrue(token.supportsInterface(type(IERC5192).interfaceId));
        assertFalse(token.supportsInterface(0xffffffff));
    }

    function test_MintEmitsLockedAndLockedViewReturnsTrue() public {
        vm.expectEmit(true, false, false, true);
        emit IERC5192.Locked(1);

        token.mint(holder, 1);

        assertTrue(token.locked(1));
        assertEq(token.ownerOf(1), holder);
    }

    function test_RevertTransferBetweenAccounts() public {
        token.mint(holder, 1);

        vm.prank(holder);
        vm.expectRevert(SoulboundNFT.SoulBoundNFT__NotAuthorized.selector);
        token.transferFrom(holder, other, 1);
    }

    function test_RevertLockedQueryForNonexistentToken() public {
        vm.expectRevert(abi.encodeWithSelector(SoulboundNFT.SoulBoundNFT__TokenDoesNotExist.selector, 99));
        token.locked(99);
    }

    function test_RevertLockedQueryAfterBurn() public {
        token.mint(holder, 1);
        token.burn(1);

        vm.expectRevert(abi.encodeWithSelector(SoulboundNFT.SoulBoundNFT__TokenDoesNotExist.selector, 1));
        token.locked(1);
    }
}
