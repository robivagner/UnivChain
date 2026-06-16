// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ICertification} from "../../src/interfaces/ICertification.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC5192} from "../../src/interfaces/IERC5192.sol";

contract MockCertification is ICertification {
    mapping(address => bool) private s_hasDiploma;

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC721).interfaceId || interfaceId == type(IERC165).interfaceId
            || interfaceId == type(IERC5192).interfaceId;
    }

    function issueDiploma(
        address student,
        uint256,
        uint256,
        bytes32,
        string calldata,
        address
    ) external {
        s_hasDiploma[student] = true;
    }

    function revokeDiploma(uint256) external {}

    function attachDiplomaCredential(uint256, bytes32, string calldata) external {}

    function getDiploma(uint256) external pure returns (Diploma memory) {
        return Diploma({
            documentHash: bytes32(0),
            metadataURI: "ipfs://mock",
            issueTimestamp: 0,
            issuer: address(0),
            revoked: false
        });
    }

    function isDiplomaValid(uint256) external pure returns (bool) {
        return true;
    }

    function hasDiploma(address student) external view returns (bool) {
        return s_hasDiploma[student];
    }

    function hasValidDiploma(address student) external view returns (bool) {
        return s_hasDiploma[student];
    }

    function getDiplomaIdForStudent(address) external pure returns (uint256) {
        return 1;
    }

    function getUniversityCoreContract() external view returns (address) {
        return msg.sender;
    }

    function setMockHasDiploma(address student, bool status) external {
        s_hasDiploma[student] = status;
    }
}
