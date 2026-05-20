// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {FeeManager} from "../../src/modules/FeeManager.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract FeeManagerTest is Test {
    FeeManager public feeManager;
    MockERC20 public mockToken;

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

    function test_RevertSetTokenFeeIfTokenIsAddressZero() public {
        vm.expectRevert(FeeManager.FeeManager__AddressZero.selector);
        feeManager.setTokenFee(address(0), REGISTRATION_FEE);
    }

    ///////////////////////////////////
    /////// Pay Registration Fee //////
    ///////////////////////////////////

    function test_PayRegistrationFeeSuccess() public {
        // 1. Core sets the fee
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);

        // 2. Give Alice some Mock USDC and she approves the FeeManager
        mockToken.mint(alice, 100 * 10 ** 6);
        vm.startPrank(alice);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);

        // 3. Alice pays the fee
        vm.expectEmit(true, true, true, true);
        emit RegistrationFeePaid(alice, address(mockToken), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();

        // 4. Verify balances and state
        assertTrue(feeManager.hasPaidFee(alice));
        assertEq(mockToken.balanceOf(alice), 90 * 10 ** 6);
        assertEq(mockToken.balanceOf(address(feeManager)), REGISTRATION_FEE);
    }

    function test_RevertPayRegistrationFeeIfTokenNotAllowed() public {
        vm.startPrank(alice);
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__TokenNotAllowed.selector, address(mockToken)));
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();
    }

    function test_RevertPayRegistrationFeeIfAlreadyPaid() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);
        mockToken.mint(alice, 100 * 10 ** 6);

        vm.startPrank(alice);
        mockToken.approve(address(feeManager), REGISTRATION_FEE * 2);

        feeManager.payRegistrationFee(address(mockToken));

        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__FeeAlreadyPaid.selector, alice));
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();
    }

    function test_RevertPayRegistrationFeeWithoutApproval() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);
        mockToken.mint(alice, 100 * 10 ** 6);

        vm.startPrank(alice);

        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector, address(feeManager), 0, REGISTRATION_FEE
            )
        );
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();
    }

    function test_RevertPayRegistrationFeeWithoutBalance() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);

        vm.startPrank(alice);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);

        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 0, REGISTRATION_FEE)
        );
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();
    }

    ///////////////////////////////////
    /////// Consume Voucher Tests /////
    ///////////////////////////////////

    function test_ConsumeFeeVoucherSuccess() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);
        mockToken.mint(alice, REGISTRATION_FEE);
        vm.startPrank(alice);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();

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
    /////// Withdraw Funds Tests //////
    ///////////////////////////////////

    function test_WithdrawFundsSuccess() public {
        feeManager.setTokenFee(address(mockToken), REGISTRATION_FEE);

        mockToken.mint(alice, REGISTRATION_FEE);
        mockToken.mint(bob, REGISTRATION_FEE);

        vm.prank(alice);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        vm.prank(alice);
        feeManager.payRegistrationFee(address(mockToken));

        vm.prank(bob);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        vm.prank(bob);
        feeManager.payRegistrationFee(address(mockToken));

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

    function test_RevertWithdrawFundsIfDestinationZero() public {
        vm.expectRevert(FeeManager.FeeManager__AddressZero.selector);
        feeManager.withdrawFunds(address(mockToken), address(0), 100);
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
        // 1. Constraints
        // Set a fee between 1 wei and 1 billion tokens (to cover 18 decimal tokens like DAI)
        uint256 feeAmount = bound(rawFeeAmount, 1, 1_000_000_000 * 10 ** 18);

        // Withdraw a random amount that is less than or equal to the contract balance
        uint256 withdrawAmount = bound(rawWithdrawAmount, 1, feeAmount);

        // 2. Core sets the new fuzzed fee
        feeManager.setTokenFee(address(mockToken), feeAmount);

        // 3. Alice receives the exact required amount and approves it
        mockToken.mint(alice, feeAmount);

        vm.startPrank(alice);
        mockToken.approve(address(feeManager), feeAmount);

        // 4. Alice pays the fee
        feeManager.payRegistrationFee(address(mockToken));
        vm.stopPrank();

        // 5. Intermediate state and balance assertions
        assertTrue(feeManager.hasPaidFee(alice));
        assertEq(mockToken.balanceOf(address(feeManager)), feeAmount);
        assertEq(mockToken.balanceOf(alice), 0);

        // 6. Core withdraws the fuzzed amount
        feeManager.withdrawFunds(address(mockToken), treasuryWallet, withdrawAmount);

        // 7. Final assertions (Math must be perfectly accurate)
        assertEq(mockToken.balanceOf(treasuryWallet), withdrawAmount);
        assertEq(mockToken.balanceOf(address(feeManager)), feeAmount - withdrawAmount);
    }
}
