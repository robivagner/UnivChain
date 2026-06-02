// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IStudentRegistry} from "../../src/interfaces/IStudentRegistry.sol";

contract MockStudentRegistry is IStudentRegistry {
    mapping(address => bool) private s_enrolled;
    mapping(address => bool) private s_graduated;
    mapping(address => bool) private s_expelled;
    mapping(address => uint256) private s_tokenIds;

    function isStudentEnrolled(address student) external view returns (bool) {
        return s_enrolled[student];
    }

    function hasStudentGraduated(address student) external view returns (bool) {
        return s_graduated[student];
    }

    function isStudentExpelled(address student) external view returns (bool) {
        return s_expelled[student];
    }

    function getStudentTokenId(address student) external view returns (uint256) {
        return s_tokenIds[student];
    }

    function enrollStudent(address student, bytes32) external {
        s_enrolled[student] = true;
    }

    function graduateStudent(address student) external {
        s_graduated[student] = true;
        s_enrolled[student] = false;
    }

    function expellStudent(address student) external {
        s_expelled[student] = true;
        s_enrolled[student] = false;
    }

    function getStudentMetadata(uint256) external view returns (bytes32, uint256, uint256, bool, bool) {
        return (bytes32(0), block.timestamp, 0, false, false);
    }

    function getUniversityCoreContract() external view returns (address) {
        return msg.sender;
    }

    // Test Helpers
    function setMockEnrolled(address student, bool status) external {
        s_enrolled[student] = status;
    }

    function setMockExpelled(address student, bool status) external {
        s_expelled[student] = status;
    }

    function setMockGraduated(address student, bool status) external {
        s_graduated[student] = status;
    }
}
