// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IFeeManager} from "../interfaces/IFeeManager.sol";
import {IUniversityCore} from "../interfaces/IUniversityCore.sol";

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

    // Events

    event TokenFeeUpdated(address indexed token, uint256 newFeeAmount);
    event RegistrationFeePaid(address indexed student, address indexed token, uint256 amount);
    event FeeVoucherConsumed(address indexed student);
    event FundsWithdrawn(address indexed token, address indexed destination, uint256 amount);

    // Modifiers

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

    //////////////////////////////
    /////// Core Functions ///////
    //////////////////////////////

    function setTokenFee(address token, uint256 feeAmount) external onlyCore {
        if (token == address(0)) {
            revert FeeManager__AddressZero();
        }
        s_tokenFees[token] = feeAmount;
        emit TokenFeeUpdated(token, feeAmount);
    }

    function consumeFeeVoucher(address student) external onlyCore {
        s_studentHasPaid[student] = false;
        emit FeeVoucherConsumed(student);
    }

    function withdrawFunds(address token, address destination, uint256 amount) external onlyCore {
        if (destination == address(0)) {
            revert FeeManager__AddressZero();
        }
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        if (amount > contractBalance) {
            revert FeeManager__NotEnoughFunds(amount, contractBalance);
        }

        IERC20(token).safeTransfer(destination, amount);
        emit FundsWithdrawn(token, destination, amount);
    }

    ////////////////////////////////
    /////// Student Functions //////
    ////////////////////////////////

    function payRegistrationFee(address token) external {
        uint256 requiredFee = s_tokenFees[token];

        if (requiredFee == 0) {
            revert FeeManager__TokenNotAllowed(token);
        }
        if (s_studentHasPaid[msg.sender]) {
            revert FeeManager__FeeAlreadyPaid(msg.sender);
        }

        s_studentHasPaid[msg.sender] = true;

        // Pull the funds from the student to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), requiredFee);

        emit RegistrationFeePaid(msg.sender, token, requiredFee);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function getFeeAmountForToken(address token) external view returns (uint256) {
        return s_tokenFees[token];
    }

    function hasPaidFee(address student) external view returns (bool) {
        return s_studentHasPaid[student];
    }

    function getUniversityCoreContract() external view returns (address) {
        return address(i_coreContract);
    }
}
