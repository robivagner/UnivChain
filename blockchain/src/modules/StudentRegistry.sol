// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IStudentRegistry} from "../interfaces/IStudentRegistry.sol";
import {IUniversityCore} from "../interfaces/IUniversityCore.sol";

/**
 * @title StudentRegistry
 * @notice Manages student on-chain enrollment status and identity metadata in contract storage.
 * @dev Only UniversityCore may mutate records. Diplomas remain soulbound NFTs in Certification.
 */
contract StudentRegistry is IStudentRegistry {
    // Errors
    error StudentRegistry__NotCore(address sender);
    error StudentRegistry__AddressZero();
    error StudentRegistry__InvalidTokenId(uint256 tokenId);
    error StudentRegistry__StudentAlreadyEnrolled(address student);
    error StudentRegistry__StudentAlreadyGraduated(address student);
    error StudentRegistry__StudentIsExpelled(address student);
    error StudentRegistry__StudentNotEnrolled(address student);

    // State variables
    IUniversityCore immutable i_coreContract;

    uint256 public s_tokenIdCounter;
    mapping(uint256 tokenId => Student) public s_students;
    mapping(address student => uint256 tokenId) public s_studentToTokenId;
    mapping(address student => bool isActive) public s_studentIsActive;

    // Events
    event StudentEnrolled(address indexed student, uint256 indexed tokenId);
    event StudentRevoked(address indexed student, uint256 indexed tokenId);
    event StudentGraduated(address indexed student, uint256 indexed tokenId);

    // Modifiers
    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert StudentRegistry__NotCore(msg.sender);
        }
        _;
    }

    /**
     * @notice Links this module to the central hub that orchestrates enrollment workflows.
     * @param coreContract The central execution contract managing roles tracking.
     */
    constructor(address coreContract) {
        if (coreContract == address(0)) {
            revert StudentRegistry__AddressZero();
        }

        i_coreContract = IUniversityCore(coreContract);
        s_tokenIdCounter = 1;
    }

    //////////////////////////////
    /////// Core Functions ///////
    //////////////////////////////

    /// @inheritdoc IStudentRegistry
    function enrollStudent(address student, bytes32 studentIdHash) external onlyCore {
        _assertCanEnroll(student);

        uint256 tokenId = s_tokenIdCounter++;
        s_studentToTokenId[student] = tokenId;
        s_studentIsActive[student] = true;

        s_students[tokenId] = Student({
            studentIdHash: studentIdHash,
            registrationTimestamp: block.timestamp,
            graduationTimestamp: 0,
            hasGraduated: false,
            isExpelled: false
        });

        emit StudentEnrolled(student, tokenId);
    }

    /// @inheritdoc IStudentRegistry
    function graduateStudent(address student) external onlyCore {
        uint256 tokenId = _requireActiveStudent(student);

        Student storage s = s_students[tokenId];
        if (s.hasGraduated) {
            revert StudentRegistry__StudentAlreadyGraduated(student);
        }
        s.hasGraduated = true;
        s.graduationTimestamp = block.timestamp;
        s_studentIsActive[student] = false;

        emit StudentGraduated(student, tokenId);
    }

    /// @inheritdoc IStudentRegistry
    function expellStudent(address student) external onlyCore {
        uint256 tokenId = _requireActiveStudent(student);

        if (s_students[tokenId].isExpelled) {
            revert StudentRegistry__StudentIsExpelled(student);
        }

        s_students[tokenId].isExpelled = true;
        s_studentIsActive[student] = false;

        emit StudentRevoked(student, tokenId);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    /// @inheritdoc IStudentRegistry
    function getStudentMetadata(uint256 tokenId) external view returns (bytes32, uint256, uint256, bool, bool) {
        if (tokenId == 0 || tokenId >= s_tokenIdCounter) {
            revert StudentRegistry__InvalidTokenId(tokenId);
        }
        Student memory s = s_students[tokenId];
        return (s.studentIdHash, s.registrationTimestamp, s.graduationTimestamp, s.hasGraduated, s.isExpelled);
    }

    /// @inheritdoc IStudentRegistry
    function getStudentTokenId(address student) external view returns (uint256) {
        return s_studentToTokenId[student];
    }

    /// @inheritdoc IStudentRegistry
    function getUniversityCoreContract() external view returns (address) {
        return address(i_coreContract);
    }

    /// @inheritdoc IStudentRegistry
    function isStudentEnrolled(address student) external view returns (bool) {
        return s_studentIsActive[student];
    }

    /// @inheritdoc IStudentRegistry
    function isStudentExpelled(address student) external view returns (bool) {
        uint256 tokenId = s_studentToTokenId[student];
        if (tokenId == 0) {
            return false;
        }
        return s_students[tokenId].isExpelled;
    }

    /// @inheritdoc IStudentRegistry
    function hasStudentGraduated(address student) external view returns (bool) {
        uint256 tokenId = s_studentToTokenId[student];
        if (tokenId == 0) {
            return false;
        }
        return s_students[tokenId].hasGraduated;
    }

    /////////////////////////////////
    /////// Private Functions ///////
    /////////////////////////////////

    function _assertCanEnroll(address student) private view {
        if (s_studentIsActive[student]) {
            revert StudentRegistry__StudentAlreadyEnrolled(student);
        }

        uint256 existingId = s_studentToTokenId[student];
        if (existingId == 0) {
            return;
        }

        Student memory prior = s_students[existingId];
        if (prior.isExpelled) {
            revert StudentRegistry__StudentIsExpelled(student);
        }
        if (prior.hasGraduated) {
            revert StudentRegistry__StudentAlreadyGraduated(student);
        }
    }

    function _requireActiveStudent(address student) private view returns (uint256 tokenId) {
        tokenId = s_studentToTokenId[student];
        if (tokenId == 0 || !s_studentIsActive[student]) {
            revert StudentRegistry__StudentNotEnrolled(student);
        }
    }
}
