// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IFeeManager} from "../../src/interfaces/IFeeManager.sol";

contract MockFeeManager is IFeeManager {
    mapping(address => bool) private s_paid;
    mapping(address => uint256) private s_registrationFees;
    mapping(address => uint256) private s_retakeFeePerCredit;
    mapping(address => uint256) private s_semesterTax;
    mapping(address => mapping(address => uint256)) private s_debtOwed;
    mapping(address => uint256) private s_debtTokenCount;

    function configureToken(
        address token,
        uint256 registrationFee,
        uint256 retakeFeePerCredit,
        uint256 semesterTax
    ) external {
        s_registrationFees[token] = registrationFee;
        s_retakeFeePerCredit[token] = retakeFeePerCredit;
        s_semesterTax[token] = semesterTax;
    }

    function getRegistrationFeeForToken(address token) external view returns (uint256) {
        return s_registrationFees[token];
    }

    function getRetakeFeePerCreditForToken(address token) external view returns (uint256) {
        return s_retakeFeePerCredit[token];
    }

    function getSemesterTaxForToken(address token) external view returns (uint256) {
        return s_semesterTax[token];
    }

    function hasPaidFee(address student) external view returns (bool) {
        return s_paid[student];
    }

    function hasOutstandingDebt(address student) external view returns (bool) {
        return s_debtTokenCount[student] > 0;
    }

    function getStudentDebtOwed(address student, address token) external view returns (uint256) {
        return s_debtOwed[student][token];
    }

    function payRegistrationFee(address, address student) external {
        s_paid[student] = true;
    }

    function accrueRetakeTax(address student, address token, uint8 subjectCredits) external {
        uint256 amount = uint256(subjectCredits) * s_retakeFeePerCredit[token];
        _increaseDebt(student, token, amount);
    }

    function accrueSemesterTax(address student, address token) external {
        _increaseDebt(student, token, s_semesterTax[token]);
    }

    function payStudentDebt(address token, address student, uint256 amount) external {
        s_debtOwed[student][token] -= amount;
        if (s_debtOwed[student][token] == 0) {
            s_debtTokenCount[student]--;
        }
    }

    function consumeFeeVoucher(address student) external {
        s_paid[student] = false;
    }

    function processRefund(address student) external {
        s_paid[student] = false;
    }

    function withdrawFunds(address, address, uint256) external {}

    function getUniversityCoreContract() external view returns (address) {
        return msg.sender;
    }

    function setMockPaid(address student, bool status) external {
        s_paid[student] = status;
    }

    function setMockFee(address token, uint256 amount) external {
        s_registrationFees[token] = amount;
    }

    function _increaseDebt(address student, address token, uint256 amount) private {
        if (s_debtOwed[student][token] == 0 && amount > 0) {
            s_debtTokenCount[student]++;
        }
        s_debtOwed[student][token] += amount;
    }
}
