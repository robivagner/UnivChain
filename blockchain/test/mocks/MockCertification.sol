// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ICertification} from "../../src/interfaces/ICertification.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract MockCertification is ICertification {
    mapping(address => bool) private s_hasDiploma;

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC721).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    function issueDiploma(address student, string calldata, string calldata, uint256, uint256) external {
        s_hasDiploma[student] = true;
    }

    function hasDiploma(address student) external view returns (bool) {
        return s_hasDiploma[student];
    }

    function getDiplomaIdForStudent(address student) external pure returns (uint256) {
        return 1;
    }

    function getUniversityCoreContract() external view returns (address) {
        return msg.sender;
    }

    function getDiplomaMetadata(uint256) external view returns (uint256, uint256, string memory, string memory) {
        return (950, block.timestamp, "B.Sc.", "CS");
    }

    // Test Helper
    function setMockHasDiploma(address student, bool status) external {
        s_hasDiploma[student] = status;
    }
}
