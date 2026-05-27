// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {FeeManager} from "../../src/modules/FeeManager.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract FeeManagerTest is Test {
    FeeManager public feeManager;
    MockERC20 public mockToken;

    // The test contract acts as the UniversityCore hub (msg.sender == core)
    address public core = address(this);
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public treasuryWallet = makeAddr("universityTreasury");

    uint256 public constant REGISTRATION_FEE = 10 * 10 ** 6; // 10 USDC

    // Events to expect
    event TokenFeeUpdated(address indexed token, uint256 newFeeAmount);
    event RegistrationFeePaid(address indexed student, address indexed token, uint256 amount);
    event FeeVoucherConsumed(address indexed student);
    event FundsWithdrawn(address indexed token, address indexed destination, uint256 amount);
    event RefundIssued(address indexed student, address indexed token, uint256 amount);

    function setUp() public {
        mockToken = new MockERC20();
        feeManager = new FeeManager(core);
    }

    ///////////////////////////////////
    /////// Constructor & Setup ///////
    ///////////////////////////////////

    function test_RevertIfConstructorCoreAddressZero() public {
        vm.expectRevert(FeeManager.FeeManager__AddressZero.selector);
        new FeeManager(address(0));
    }

    function test_GetUniversityCoreContract() public view {
        assertEq(feeManager.getUniversityCoreContract(), core);
    }

    ///////////////////////////////////
    /////// Set Token Fee Tests ///////
    ///////////////////////////////////

    function test_SetTokenFeeSuccess() public {
        vm.expectEmit(true, true, true, true);
        emit TokenFeeUpdated(address(mockToken), REGISTRATION_FEE);

        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);

        assertEq(feeManager.getFeeAmountForToken(address(mockToken)), REGISTRATION_FEE);
    }

    function test_RevertSetTokenFeeIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__NotCore.selector, alice));
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);
    }

    ///////////////////////////////////
    /////// Pay Registration Fee //////
    ///////////////////////////////////

    function test_PayRegistrationFeeSuccess() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);

        // Simulate UniversityCore capturing funds from Alice first
        mockToken.mint(address(this), REGISTRATION_FEE);
        // Core approves FeeManager to pull the tokens
        mockToken.approve(address(feeManager), REGISTRATION_FEE);

        // Core calls FeeManager to register Alice's payment
        vm.expectEmit(true, true, true, true);
        emit RegistrationFeePaid(alice, address(mockToken), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken), alice);

        // Verify state changes inside FeeManager
        assertTrue(feeManager.hasPaidFee(alice));
        assertEq(mockToken.balanceOf(address(this)), 0);
        assertEq(mockToken.balanceOf(address(feeManager)), REGISTRATION_FEE);
        assertEq(feeManager.s_studentPaymentToken(alice), address(mockToken));
    }

    function test_RevertPayRegistrationFeeIfNotCore() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);

        mockToken.mint(alice, REGISTRATION_FEE);

        vm.startPrank(alice);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);

        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__NotCore.selector, alice));
        feeManager.payRegistrationFee(address(mockToken), alice);
        vm.stopPrank();
    }

    function test_RevertPayRegistrationFeeIfAlreadyPaid() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);
        mockToken.mint(address(this), REGISTRATION_FEE * 2);
        mockToken.approve(address(feeManager), REGISTRATION_FEE * 2);

        feeManager.payRegistrationFee(address(mockToken), alice);

        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__FeeAlreadyPaid.selector, alice));
        feeManager.payRegistrationFee(address(mockToken), alice);
    }

    function test_RevertPayRegistrationFeeIfTokenNotAllowed() public {
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__TokenNotAllowed.selector, address(mockToken)));
        feeManager.payRegistrationFee(address(mockToken), alice);
    }

    function test_RevertConsumeVoucherIfNotPaid() public {
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__FeeNotPaid.selector, alice));
        feeManager.consumeFeeVoucher(alice);
    }

    function test_RevertProcessRefundIfNotPaid() public {
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__FeeNotPaid.selector, bob));
        feeManager.processRefund(bob);
    }

    function test_RevertPayRegistrationFeeWithoutAllowance() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);
        mockToken.mint(address(this), REGISTRATION_FEE);

        // No approval is given to feeManager from the Core
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector, address(feeManager), 0, REGISTRATION_FEE
            )
        );
        feeManager.payRegistrationFee(address(mockToken), alice);
    }

    ///////////////////////////////////
    /////// Consume Voucher Tests /////
    ///////////////////////////////////

    function test_ConsumeFeeVoucherSuccess() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);
        mockToken.mint(address(this), REGISTRATION_FEE);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken), alice);

        assertTrue(feeManager.hasPaidFee(alice));

        vm.expectEmit(true, false, false, false);
        emit FeeVoucherConsumed(alice);

        feeManager.consumeFeeVoucher(alice);

        assertFalse(feeManager.hasPaidFee(alice));
    }

    function test_RevertConsumeVoucherIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__NotCore.selector, alice));
        feeManager.consumeFeeVoucher(bob);
    }

    ///////////////////////////////////
    /////// Process Refund Tests //////
    ///////////////////////////////////

    function test_ProcessRefundSuccess() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);
        mockToken.mint(address(this), REGISTRATION_FEE);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken), alice);

        vm.expectEmit(true, true, false, true);
        emit RefundIssued(alice, address(mockToken), REGISTRATION_FEE);

        feeManager.processRefund(alice);

        assertFalse(feeManager.hasPaidFee(alice));
        assertEq(feeManager.s_studentPaymentToken(alice), address(0));
        assertEq(mockToken.balanceOf(alice), REGISTRATION_FEE);
        assertEq(mockToken.balanceOf(address(feeManager)), 0);
    }

    function test_RevertProcessRefundIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__NotCore.selector, alice));
        feeManager.processRefund(bob);
    }

    ///////////////////////////////////
    /////// Withdraw Funds Tests //////
    ///////////////////////////////////

    function test_WithdrawFundsSuccess() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);

        mockToken.mint(address(this), REGISTRATION_FEE * 2);
        mockToken.approve(address(feeManager), REGISTRATION_FEE * 2);

        feeManager.payRegistrationFee(address(mockToken), alice);
        feeManager.payRegistrationFee(address(mockToken), bob);

        uint256 contractBalance = mockToken.balanceOf(address(feeManager));
        assertEq(contractBalance, REGISTRATION_FEE * 2);

        vm.expectEmit(true, true, false, true);
        emit FundsWithdrawn(address(mockToken), treasuryWallet, contractBalance);

        feeManager.withdrawFunds(address(mockToken), treasuryWallet, contractBalance);

        assertEq(mockToken.balanceOf(address(feeManager)), 0);
        assertEq(mockToken.balanceOf(treasuryWallet), contractBalance);
    }

    function test_RevertWithdrawFundsIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__NotCore.selector, alice));
        feeManager.withdrawFunds(address(mockToken), treasuryWallet, 100);
    }

    function test_RevertWithdrawFundsIfNotEnoughFunds() public {
        uint256 fakeAmount = 1_000_000 * 10 ** 6;

        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__NotEnoughFunds.selector, fakeAmount, 0));
        feeManager.withdrawFunds(address(mockToken), treasuryWallet, fakeAmount);
    }

    ///////////////////////////////////
    /////// Fuzz Tests ////////////////
    ///////////////////////////////////

    function testFuzz_CompleteFeeFlow(uint256 rawFeeAmount, uint256 rawWithdrawAmount) public {
        uint256 feeAmount = bound(rawFeeAmount, 1, 1_000_000_000 * 10 ** 18);
        uint256 withdrawAmount = bound(rawWithdrawAmount, 1, feeAmount);

        feeManager.setTokenFee(address(mockToken), feeAmount);

        mockToken.mint(address(this), feeAmount);
        mockToken.approve(address(feeManager), feeAmount);

        feeManager.payRegistrationFee(address(mockToken), alice);

        assertTrue(feeManager.hasPaidFee(alice));
        assertEq(mockToken.balanceOf(address(feeManager)), feeAmount);
        assertEq(mockToken.balanceOf(address(this)), 0);

        feeManager.withdrawFunds(address(mockToken), treasuryWallet, withdrawAmount);

        assertEq(mockToken.balanceOf(treasuryWallet), withdrawAmount);
        assertEq(mockToken.balanceOf(address(feeManager)), feeAmount - withdrawAmount);
    }
}
