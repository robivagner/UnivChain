// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IStudentRegistry} from "../interfaces/IStudentRegistry.sol";
import {IUniversityCore} from "../interfaces/IUniversityCore.sol";
import {SoulboundNFT} from "../shared/SoulboundNFT.sol";

contract StudentRegistry is IStudentRegistry, SoulboundNFT {
    // Errors

    error StudentRegistry__NotCore(address sender);
    error StudentRegistry__AddressZero();
    error StudentRegistry__InvalidTokenId(uint256 tokenId);

    // State variables

    IUniversityCore immutable i_coreContract;

    uint256 public s_tokenIdCounter;
    mapping(uint256 tokenId => Student) public s_students;
    mapping(address student => uint256 tokenId) public s_studentToTokenId;

    // Events

    event StudentEnrolled(address indexed student, uint256 indexed tokenId);
    event StudentRevoked(address indexed student, uint256 indexed tokenId);
    event StudentGraduated(address indexed student, uint256 indexed tokendId);

    // Functions

    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert StudentRegistry__NotCore(msg.sender);
        }
        _;
    }

    constructor(address coreContract) SoulboundNFT() {
        if (coreContract == address(0)) {
            revert StudentRegistry__AddressZero();
        }

        i_coreContract = IUniversityCore(coreContract);

        s_tokenIdCounter = 1;
    }

    //////////////////////////////
    /////// Core Functions ///////
    //////////////////////////////

    function enrollStudent(address student, bytes32 studentIdHash) external onlyCore {
        if (student == address(0)) {
            revert StudentRegistry__AddressZero();
        }

        uint256 tokenId = s_tokenIdCounter++;
        s_studentToTokenId[student] = tokenId;
        _mint(student, tokenId);

        s_students[tokenId] = Student({
            studentIdHash: studentIdHash,
            registrationTimestamp: block.timestamp,
            graduationTimestamp: 0,
            hasGraduated: false,
            isExpelled: false
        });

        emit StudentEnrolled(student, tokenId);
    }

    function graduateStudent(address student) external onlyCore {
        uint256 tokenId = s_studentToTokenId[student];
        if (tokenId == 0) {
            revert StudentRegistry__InvalidTokenId(tokenId);
        }
        _requireOwned(tokenId);

        Student storage s = s_students[tokenId];
        s.hasGraduated = true;
        s.graduationTimestamp = block.timestamp;
        _burn(tokenId);

        emit StudentGraduated(_ownerOf(tokenId), tokenId);
    }

    function expellStudent(address student) external onlyCore {
        uint256 tokenId = s_studentToTokenId[student];
        if (tokenId == 0) {
            revert StudentRegistry__InvalidTokenId(tokenId);
        }
        _requireOwned(tokenId);

        s_students[tokenId].isExpelled = true;
        _burn(tokenId);

        emit StudentRevoked(_ownerOf(tokenId), tokenId);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function getStudentMetadata(uint256 tokenId) external view returns (bytes32, uint256, uint256, bool, bool) {
        Student memory s = s_students[tokenId];

        return (s.studentIdHash, s.registrationTimestamp, s.graduationTimestamp, s.hasGraduated, s.isExpelled);
    }

    function getStudentTokenId(address student) external view returns (uint256) {
        return s_studentToTokenId[student];
    }

    function getUniversityCoreContract() external view returns (address) {
        return address(i_coreContract);
    }

    function isStudentEnrolled(address student) external view returns (bool) {
        return balanceOf(student) != 0 ? true : false;
    }

    function isStudentExpelled(address student) external view returns (bool) {
        uint256 tokenId = s_studentToTokenId[student];
        return s_students[tokenId].isExpelled;
    }

    function hasStudentGraduated(address student) external view returns (bool) {
        uint256 tokenId = s_studentToTokenId[student];
        return s_students[tokenId].hasGraduated;
    }
}
