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

    uint256 public constant REGISTRATION_FEE = 10 * 10 ** 6;
    uint256 public constant RETAKE_FEE_PER_CREDIT = 1 * 10 ** 6;
    uint256 public constant SEMESTER_TAX = 50 * 10 ** 6;
    uint8 public constant SUBJECT_CREDITS = 6;

    event TokenConfigured(
        address indexed token, uint256 registrationFee, uint256 retakeFeePerCredit, uint256 semesterTax
    );
    event RegistrationFeePaid(address indexed student, address indexed token, uint256 amount);
    event FeeVoucherConsumed(address indexed student);
    event FundsWithdrawn(address indexed token, address indexed destination, uint256 amount);
    event RefundIssued(address indexed student, address indexed token, uint256 amount);
    event RetakeTaxAccrued(address indexed student, address indexed token, uint256 amount, uint256 newDebtBalance);
    event SemesterTaxAccrued(address indexed student, address indexed token, uint256 amount, uint256 newDebtBalance);
    event StudentDebtPaid(address indexed student, address indexed token, uint256 amount, uint256 remainingDebt);

    function setUp() public {
        mockToken = new MockERC20();
        feeManager = new FeeManager(core);
    }

    function _configureDefaultToken() internal {
        feeManager.configureToken(address(mockToken), REGISTRATION_FEE, RETAKE_FEE_PER_CREDIT, SEMESTER_TAX);
    }

    function test_RevertIfConstructorCoreAddressZero() public {
        vm.expectRevert(FeeManager.FeeManager__AddressZero.selector);
        new FeeManager(address(0));
    }

    function test_GetUniversityCoreContract() public view {
        assertEq(feeManager.getUniversityCoreContract(), core);
    }

    function test_ConfigureTokenSuccess() public {
        vm.expectEmit(true, true, true, true);
        emit TokenConfigured(address(mockToken), REGISTRATION_FEE, RETAKE_FEE_PER_CREDIT, SEMESTER_TAX);

        _configureDefaultToken();

        assertEq(feeManager.getRegistrationFeeForToken(address(mockToken)), REGISTRATION_FEE);
        assertEq(feeManager.getRetakeFeePerCreditForToken(address(mockToken)), RETAKE_FEE_PER_CREDIT);
        assertEq(feeManager.getSemesterTaxForToken(address(mockToken)), SEMESTER_TAX);
    }

    function test_RevertConfigureTokenIfNotCore() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__NotCore.selector, alice));
        feeManager.configureToken(address(mockToken), REGISTRATION_FEE, RETAKE_FEE_PER_CREDIT, SEMESTER_TAX);
    }

    function test_PayRegistrationFeeSuccess() public {
        _configureDefaultToken();

        mockToken.mint(address(this), REGISTRATION_FEE);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);

        vm.expectEmit(true, true, true, true);
        emit RegistrationFeePaid(alice, address(mockToken), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken), alice);

        assertTrue(feeManager.hasPaidFee(alice));
        assertEq(mockToken.balanceOf(address(feeManager)), REGISTRATION_FEE);
        assertEq(feeManager.s_studentRegistrationPaymentToken(alice), address(mockToken));
    }

    function test_RevertPayRegistrationFeeIfNotCore() public {
        _configureDefaultToken();
        mockToken.mint(alice, REGISTRATION_FEE);

        vm.startPrank(alice);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__NotCore.selector, alice));
        feeManager.payRegistrationFee(address(mockToken), alice);
        vm.stopPrank();
    }

    function test_RevertPayRegistrationFeeIfAlreadyPaid() public {
        _configureDefaultToken();
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

    function test_ConsumeFeeVoucherSuccess() public {
        _configureDefaultToken();
        mockToken.mint(address(this), REGISTRATION_FEE);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken), alice);

        feeManager.consumeFeeVoucher(alice);
        assertFalse(feeManager.hasPaidFee(alice));
    }

    function test_ProcessRefundSuccess() public {
        _configureDefaultToken();
        mockToken.mint(address(this), REGISTRATION_FEE);
        mockToken.approve(address(feeManager), REGISTRATION_FEE);
        feeManager.payRegistrationFee(address(mockToken), alice);

        feeManager.processRefund(alice);

        assertFalse(feeManager.hasPaidFee(alice));
        assertEq(mockToken.balanceOf(alice), REGISTRATION_FEE);
    }

    function test_WithdrawFundsSuccess() public {
        _configureDefaultToken();
        mockToken.mint(address(this), REGISTRATION_FEE * 2);
        mockToken.approve(address(feeManager), REGISTRATION_FEE * 2);

        feeManager.payRegistrationFee(address(mockToken), alice);
        feeManager.payRegistrationFee(address(mockToken), bob);

        uint256 contractBalance = mockToken.balanceOf(address(feeManager));
        feeManager.withdrawFunds(address(mockToken), treasuryWallet, contractBalance);

        assertEq(mockToken.balanceOf(treasuryWallet), contractBalance);
    }

    function test_AccrueRetakeTaxSuccess() public {
        _configureDefaultToken();

        uint256 expected = uint256(SUBJECT_CREDITS) * RETAKE_FEE_PER_CREDIT;

        vm.expectEmit(true, true, false, true);
        emit RetakeTaxAccrued(alice, address(mockToken), expected, expected);
        feeManager.accrueRetakeTax(alice, address(mockToken), SUBJECT_CREDITS);

        assertEq(feeManager.getStudentDebtOwed(alice, address(mockToken)), expected);
        assertTrue(feeManager.hasOutstandingDebt(alice));
    }

    function test_AccrueSemesterTaxSuccess() public {
        _configureDefaultToken();

        vm.expectEmit(true, true, false, true);
        emit SemesterTaxAccrued(alice, address(mockToken), SEMESTER_TAX, SEMESTER_TAX);
        feeManager.accrueSemesterTax(alice, address(mockToken));

        assertEq(feeManager.getStudentDebtOwed(alice, address(mockToken)), SEMESTER_TAX);
        assertTrue(feeManager.hasOutstandingDebt(alice));
    }

    function test_UnifiedDebtCombinesRetakeAndSemester() public {
        _configureDefaultToken();

        uint256 retakeAmount = uint256(SUBJECT_CREDITS) * RETAKE_FEE_PER_CREDIT;
        feeManager.accrueRetakeTax(alice, address(mockToken), SUBJECT_CREDITS);
        feeManager.accrueSemesterTax(alice, address(mockToken));

        assertEq(feeManager.getStudentDebtOwed(alice, address(mockToken)), retakeAmount + SEMESTER_TAX);
    }

    function test_PayStudentDebtSuccess() public {
        _configureDefaultToken();
        feeManager.accrueSemesterTax(alice, address(mockToken));

        uint256 owed = feeManager.getStudentDebtOwed(alice, address(mockToken));
        mockToken.mint(address(this), owed);
        mockToken.approve(address(feeManager), owed);

        vm.expectEmit(true, true, false, true);
        emit StudentDebtPaid(alice, address(mockToken), owed, 0);
        feeManager.payStudentDebt(address(mockToken), alice, owed);

        assertEq(feeManager.getStudentDebtOwed(alice, address(mockToken)), 0);
        assertFalse(feeManager.hasOutstandingDebt(alice));
    }

    function test_RevertAccrueSemesterTaxIfTokenNotConfigured() public {
        vm.expectRevert(
            abi.encodeWithSelector(FeeManager.FeeManager__TokenNotConfiguredForSemesterTax.selector, address(mockToken))
        );
        feeManager.accrueSemesterTax(alice, address(mockToken));
    }

    function test_RevertPayStudentDebtIfOverpayment() public {
        _configureDefaultToken();
        feeManager.accrueSemesterTax(alice, address(mockToken));

        uint256 owed = feeManager.getStudentDebtOwed(alice, address(mockToken));
        vm.expectRevert(abi.encodeWithSelector(FeeManager.FeeManager__DebtOverpayment.selector, owed + 1, owed));
        feeManager.payStudentDebt(address(mockToken), alice, owed + 1);
    }

    function testFuzz_CompleteFeeFlow(uint256 rawFeeAmount, uint256 rawWithdrawAmount) public {
        uint256 feeAmount = bound(rawFeeAmount, 1, 1_000_000_000 * 10 ** 18);
        uint256 withdrawAmount = bound(rawWithdrawAmount, 1, feeAmount);

        feeManager.configureToken(address(mockToken), feeAmount, RETAKE_FEE_PER_CREDIT, SEMESTER_TAX);

        mockToken.mint(address(this), feeAmount);
        mockToken.approve(address(feeManager), feeAmount);
        feeManager.payRegistrationFee(address(mockToken), alice);

        feeManager.withdrawFunds(address(mockToken), treasuryWallet, withdrawAmount);
        assertEq(mockToken.balanceOf(treasuryWallet), withdrawAmount);
    }
}
