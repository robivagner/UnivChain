// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IFeeManager} from "../../src/interfaces/IFeeManager.sol";

contract MockFeeManager is IFeeManager {
    mapping(address => bool) private s_paid;
    mapping(address => uint256) private s_tokenFees;

    function getFeeAmountForToken(address token) external view returns (uint256) {
        return s_tokenFees[token];
    }

    function hasPaidFee(address student) external view returns (bool) {
        return s_paid[student];
    }

    function payRegistrationFee(address, address student) external {
        s_paid[student] = true;
    }

    function consumeFeeVoucher(address student) external {
        s_paid[student] = false;
    }

    function processRefund(address student) external {
        s_paid[student] = false;
    }

    function setTokenFee(address token, uint256 amount) external {
        s_tokenFees[token] = amount;
    }
    function withdrawFunds(address, address, uint256) external {}

    function getUniversityCoreContract() external view returns (address) {
        return msg.sender;
    }

    // Test Helpers
    function setMockPaid(address student, bool status) external {
        s_paid[student] = status;
    }

    function setMockFee(address token, uint256 amount) external {
        s_tokenFees[token] = amount;
    }
}
