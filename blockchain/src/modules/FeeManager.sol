// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IFeeManager} from "../interfaces/IFeeManager.sol";
import {IUniversityCore} from "../interfaces/IUniversityCore.sol";

/**
 * @title FeeManager
 * @notice Treasury module responsible for handling stablecoin registration fees and protocol fund isolation.
 * @dev Implements the IFeeManager interface and restricts state-changing operations exclusively to UniversityCore.
 */
contract FeeManager is IFeeManager {
    using SafeERC20 for IERC20;

    // Errors
    error FeeManager__NotCore(address sender);
    error FeeManager__AddressZero();
    error FeeManager__TokenNotAllowed(address token);
    error FeeManager__FeeAlreadyPaid(address student);
    error FeeManager__NotEnoughFunds(uint256 requested, uint256 available);

    // State variables
    IUniversityCore immutable i_coreContract;

    mapping(address token => uint256 feeAmount) public s_tokenFees;
    mapping(address student => bool hasPaid) public s_studentHasPaid;
    mapping(address student => address tokenUsed) public s_studentPaymentToken;

    // Events
    event TokenFeeUpdated(address indexed token, uint256 newFeeAmount);
    event RegistrationFeePaid(address indexed student, address indexed token, uint256 amount);
    event FeeVoucherConsumed(address indexed student);
    event FundsWithdrawn(address indexed token, address indexed destination, uint256 amount);
    event RefundIssued(address indexed student, address indexed token, uint256 amount);

    // Modifiers
    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert FeeManager__NotCore(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructor links this module permanently to the central system registry routing router.
     * @param coreContract The central contract address running the roles tracking layer.
     */
    constructor(address coreContract) {
        if (coreContract == address(0)) {
            revert FeeManager__AddressZero();
        }
        i_coreContract = IUniversityCore(coreContract);
    }

    //////////////////////////////
    /////// Core Functions ///////
    //////////////////////////////

    /// @inheritdoc IFeeManager
    function setTokenFee(address token, uint256 feeAmount) external onlyCore {
        s_tokenFees[token] = feeAmount;
        emit TokenFeeUpdated(token, feeAmount);
    }

    /// @inheritdoc IFeeManager
    function consumeFeeVoucher(address student) external onlyCore {
        s_studentHasPaid[student] = false;
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
        uint256 requiredFee = s_tokenFees[token];

        IERC20(token).safeTransferFrom(msg.sender, address(this), requiredFee);

        s_studentHasPaid[student] = true;
        s_studentPaymentToken[student] = token;

        emit RegistrationFeePaid(student, token, requiredFee);
    }

    /// @inheritdoc IFeeManager
    function processRefund(address student) external onlyCore {
        address token = s_studentPaymentToken[student];
        uint256 amount = s_tokenFees[token];

        s_studentHasPaid[student] = false;
        s_studentPaymentToken[student] = address(0);

        IERC20(token).safeTransfer(student, amount);
        emit RefundIssued(student, token, amount);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    /// @inheritdoc IFeeManager
    function getFeeAmountForToken(address token) external view returns (uint256) {
        return s_tokenFees[token];
    }

    /// @inheritdoc IFeeManager
    function hasPaidFee(address student) external view returns (bool) {
        return s_studentHasPaid[student];
    }

    /// @inheritdoc IFeeManager
    function getUniversityCoreContract() external view returns (address) {
        return address(i_coreContract);
    }
}
