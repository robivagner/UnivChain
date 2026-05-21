// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IStudentRegistry} from "../interfaces/IStudentRegistry.sol";
import {IUniversityCore} from "../interfaces/IUniversityCore.sol";
import {SoulboundNFT} from "../shared/SoulboundNFT.sol";

/**
 * @title StudentRegistry
 * @notice Manages student on-chain identities by minting non-transferable Soulbound tokens upon enrollment.
 * @dev Inherits custom SoulboundNFT logic and links tightly to UniversityCore for access control.
 */
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
    event StudentGraduated(address indexed student, uint256 indexed tokenId);

    // Modifiers
    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert StudentRegistry__NotCore(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructor sets the tracking rules and links the master routing Hub.
     * @param coreContract The central execution contract managing roles tracking.
     */
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

    /// @inheritdoc IStudentRegistry
    function enrollStudent(address student, bytes32 studentIdHash) external onlyCore {
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

    /// @inheritdoc IStudentRegistry
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

        emit StudentGraduated(student, tokenId);
    }

    /// @inheritdoc IStudentRegistry
    function expellStudent(address student) external onlyCore {
        uint256 tokenId = s_studentToTokenId[student];
        if (tokenId == 0) {
            revert StudentRegistry__InvalidTokenId(tokenId);
        }
        _requireOwned(tokenId);

        s_students[tokenId].isExpelled = true;

        _burn(tokenId);

        emit StudentRevoked(student, tokenId);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    /// @inheritdoc IStudentRegistry
    function getStudentMetadata(uint256 tokenId) external view returns (bytes32, uint256, uint256, bool, bool) {
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
        return balanceOf(student) != 0;
    }

    /// @inheritdoc IStudentRegistry
    function isStudentExpelled(address student) external view returns (bool) {
        uint256 tokenId = s_studentToTokenId[student];
        return s_students[tokenId].isExpelled;
    }

    /// @inheritdoc IStudentRegistry
    function hasStudentGraduated(address student) external view returns (bool) {
        uint256 tokenId = s_studentToTokenId[student];
        return s_students[tokenId].hasGraduated;
    }
}
