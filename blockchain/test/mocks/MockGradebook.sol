// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IGradebook} from "../../src/interfaces/IGradebook.sol";

contract MockGradebook is IGradebook {
    function addSubject(string calldata, uint8, address) external {}
    function postGrade(address, address, uint256, uint8) external {}
    function setSubjectActivity(address, uint256, bool) external {}

    function getSubjectMetadata(uint256) external pure returns (string memory, uint8, address, bool) {
        return ("Mock Subject", 5, address(0), true);
    }

    function getStudentCredits(address) external pure returns (uint256) {
        return 30;
    }

    function getUniversityCoreContract() external view returns (address) {
        return msg.sender;
    }

    function getStudentGradeRecordOfSubject(address, uint256) external view returns (uint8, uint256, address) {
        return (10, block.timestamp, address(0));
    }

    function getWeightedAverage(address) external pure returns (uint256) {
        return 950;
    }
}
