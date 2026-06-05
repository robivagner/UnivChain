// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IFeeManager} from "../interfaces/IFeeManager.sol";
import {IUniversityCore} from "../interfaces/IUniversityCore.sol";

/**
 * @title FeeManager
 * @notice Treasury module for enrollment registration fees and unified student debt.
 * @dev Registration uses a voucher flow; retake and semester charges accrue into one debt balance per token.
 */
contract FeeManager is IFeeManager {
    using SafeERC20 for IERC20;

    // Errors
    error FeeManager__NotCore(address sender);
    error FeeManager__AddressZero();
    error FeeManager__TokenNotAllowed(address token);
    error FeeManager__TokenNotConfiguredForRetakeTax(address token);
    error FeeManager__TokenNotConfiguredForSemesterTax(address token);
    error FeeManager__FeeAlreadyPaid(address student);
    error FeeManager__FeeNotPaid(address student);
    error FeeManager__NotEnoughFunds(uint256 requested, uint256 available);
    error FeeManager__InvalidSubjectCredits();
    error FeeManager__InvalidPaymentAmount();
    error FeeManager__DebtOverpayment(uint256 requested, uint256 owed);

    // State variables
    IUniversityCore immutable i_coreContract;

    mapping(address token => uint256 registrationFee) public s_registrationFeePerToken;
    mapping(address token => uint256 retakeFeePerCredit) public s_retakeFeePerCreditPerToken;
    mapping(address token => uint256 semesterTax) public s_semesterTaxPerToken;
    mapping(address student => bool hasPaidRegistration) public s_studentHasPaidRegistrationFee;
    mapping(address student => address tokenUsed) public s_studentRegistrationPaymentToken;
    mapping(address student => mapping(address token => uint256 owed)) public s_studentDebtOwed;
    mapping(address student => uint256 tokenSlotsWithDebt) public s_studentDebtTokenCount;

    // Events
    event TokenConfigured(
        address indexed token, uint256 registrationFee, uint256 retakeFeePerCredit, uint256 semesterTax
    );
    event RegistrationFeePaid(address indexed student, address indexed token, uint256 amount);
    event RetakeTaxAccrued(address indexed student, address indexed token, uint256 amount, uint256 newDebtBalance);
    event SemesterTaxAccrued(address indexed student, address indexed token, uint256 amount, uint256 newDebtBalance);
    event StudentDebtPaid(address indexed student, address indexed token, uint256 amount, uint256 remainingDebt);
    event FeeVoucherConsumed(address indexed student);
    event FundsWithdrawn(address indexed token, address indexed destination, uint256 amount);
    event RefundIssued(address indexed student, address indexed token, uint256 amount);

    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert FeeManager__NotCore(msg.sender);
        }
        _;
    }

    constructor(address coreContract) {
        if (coreContract == address(0)) {
            revert FeeManager__AddressZero();
        }
        i_coreContract = IUniversityCore(coreContract);
    }

    /// @inheritdoc IFeeManager
    function configureToken(
        address token,
        uint256 registrationFee,
        uint256 retakeFeePerCredit,
        uint256 semesterTax
    ) external onlyCore {
        s_registrationFeePerToken[token] = registrationFee;
        s_retakeFeePerCreditPerToken[token] = retakeFeePerCredit;
        s_semesterTaxPerToken[token] = semesterTax;
        emit TokenConfigured(token, registrationFee, retakeFeePerCredit, semesterTax);
    }

    /// @inheritdoc IFeeManager
    function accrueRetakeTax(address student, address token, uint8 subjectCredits) external onlyCore {
        if (subjectCredits == 0) {
            revert FeeManager__InvalidSubjectCredits();
        }

        uint256 feePerCredit = s_retakeFeePerCreditPerToken[token];
        if (feePerCredit == 0) {
            revert FeeManager__TokenNotConfiguredForRetakeTax(token);
        }

        uint256 amount = uint256(subjectCredits) * feePerCredit;
        uint256 newBalance = _increaseStudentDebt(student, token, amount);
        emit RetakeTaxAccrued(student, token, amount, newBalance);
    }

    /// @inheritdoc IFeeManager
    function accrueSemesterTax(address student, address token) external onlyCore {
        uint256 amount = s_semesterTaxPerToken[token];
        if (amount == 0) {
            revert FeeManager__TokenNotConfiguredForSemesterTax(token);
        }

        uint256 newBalance = _increaseStudentDebt(student, token, amount);
        emit SemesterTaxAccrued(student, token, amount, newBalance);
    }

    /// @inheritdoc IFeeManager
    function payStudentDebt(address token, address student, uint256 amount) external onlyCore {
        if (amount == 0) {
            revert FeeManager__InvalidPaymentAmount();
        }

        uint256 owed = s_studentDebtOwed[student][token];
        if (amount > owed) {
            revert FeeManager__DebtOverpayment(amount, owed);
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 remaining = _decreaseStudentDebt(student, token, amount);
        emit StudentDebtPaid(student, token, amount, remaining);
    }

    /// @inheritdoc IFeeManager
    function consumeFeeVoucher(address student) external onlyCore {
        if (!s_studentHasPaidRegistrationFee[student]) {
            revert FeeManager__FeeNotPaid(student);
        }

        s_studentHasPaidRegistrationFee[student] = false;
        emit FeeVoucherConsumed(student);
    }

    /// @inheritdoc IFeeManager
    function withdrawFunds(address token, address destination, uint256 amount) external onlyCore {
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        if (amount > contractBalance) {
            revert FeeManager__NotEnoughFunds(amount, contractBalance);
        }

        IERC20(token).safeTransfer(destination, amount);
        emit FundsWithdrawn(token, destination, amount);
    }

    /// @inheritdoc IFeeManager
    function payRegistrationFee(address token, address student) external onlyCore {
        if (s_studentHasPaidRegistrationFee[student]) {
            revert FeeManager__FeeAlreadyPaid(student);
        }

        uint256 requiredFee = s_registrationFeePerToken[token];
        if (requiredFee == 0) {
            revert FeeManager__TokenNotAllowed(token);
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), requiredFee);

        s_studentHasPaidRegistrationFee[student] = true;
        s_studentRegistrationPaymentToken[student] = token;

        emit RegistrationFeePaid(student, token, requiredFee);
    }

    /// @inheritdoc IFeeManager
    function processRefund(address student) external onlyCore {
        if (!s_studentHasPaidRegistrationFee[student]) {
            revert FeeManager__FeeNotPaid(student);
        }

        address token = s_studentRegistrationPaymentToken[student];
        uint256 amount = s_registrationFeePerToken[token];

        s_studentHasPaidRegistrationFee[student] = false;
        s_studentRegistrationPaymentToken[student] = address(0);

        IERC20(token).safeTransfer(student, amount);
        emit RefundIssued(student, token, amount);
    }

    /// @inheritdoc IFeeManager
    function getRegistrationFeeForToken(address token) external view returns (uint256) {
        return s_registrationFeePerToken[token];
    }

    /// @inheritdoc IFeeManager
    function getRetakeFeePerCreditForToken(address token) external view returns (uint256) {
        return s_retakeFeePerCreditPerToken[token];
    }

    /// @inheritdoc IFeeManager
    function getSemesterTaxForToken(address token) external view returns (uint256) {
        return s_semesterTaxPerToken[token];
    }

    /// @inheritdoc IFeeManager
    function getStudentDebtOwed(address student, address token) external view returns (uint256) {
        return s_studentDebtOwed[student][token];
    }

    /// @inheritdoc IFeeManager
    function hasOutstandingDebt(address student) external view returns (bool) {
        return s_studentDebtTokenCount[student] > 0;
    }

    /// @inheritdoc IFeeManager
    function hasPaidFee(address student) external view returns (bool) {
        return s_studentHasPaidRegistrationFee[student];
    }

    /// @inheritdoc IFeeManager
    function getUniversityCoreContract() external view returns (address) {
        return address(i_coreContract);
    }

    function _increaseStudentDebt(address student, address token, uint256 amount) private returns (uint256 newBalance) {
        uint256 previous = s_studentDebtOwed[student][token];
        newBalance = previous + amount;

        if (previous == 0) {
            s_studentDebtTokenCount[student]++;
        }

        s_studentDebtOwed[student][token] = newBalance;
    }

    function _decreaseStudentDebt(address student, address token, uint256 amount) private returns (uint256 remaining) {
        uint256 previous = s_studentDebtOwed[student][token];
        remaining = previous - amount;

        if (remaining == 0) {
            s_studentDebtTokenCount[student]--;
        }

        s_studentDebtOwed[student][token] = remaining;
    }
}
