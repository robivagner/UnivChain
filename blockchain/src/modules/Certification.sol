// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {ICertification} from "../interfaces/ICertification.sol";
import {IUniversityCore} from "../interfaces/IUniversityCore.sol";
import {SoulboundNFT} from "../shared/SoulboundNFT.sol";

/**
 * @title Certification
 * @notice Issues and stores academic diplomas as non-transferable Soulbound tokens upon graduation.
 * @dev Inherits custom SoulboundNFT logic and enforces institutional ECTS credit minimum limits.
 */
contract Certification is ICertification, SoulboundNFT {
    // Errors
    error Certification__NotCore(address sender);
    error Certification__AddressZero();
    error Certification__NotEnoughCredits(address student, uint256 credits);

    // State variables
    uint256 public immutable i_creditsRequiredForGraduation;
    IUniversityCore immutable i_coreContract;

    uint256 public s_tokenIdCounter;
    mapping(uint256 => Diploma) public s_diplomas;
    mapping(address => uint256) public s_studentToDiplomaId;

    // Events
    event DiplomaIssued(address indexed student, uint256 indexed tokenId);

    // Modifiers
    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert Certification__NotCore(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructor sets graduation benchmarks and links the central master router.
     * @param coreContract The central contract managing authorization access control.
     * @param creditsRequired The strict ECTS credit limit threshold required to graduate.
     */
    constructor(address coreContract, uint256 creditsRequired) SoulboundNFT() {
        if (coreContract == address(0)) {
            revert Certification__AddressZero();
        }

        i_creditsRequiredForGraduation = creditsRequired;
        i_coreContract = IUniversityCore(coreContract);
        s_tokenIdCounter = 1;
    }

    //////////////////////////////
    /////// Core Functions ///////
    //////////////////////////////

    /// @inheritdoc ICertification
    function issueDiploma(
        address student,
        string calldata degreeTitle,
        string calldata major,
        uint256 credits,
        uint256 weightedAverage
    ) external onlyCore {
        if (credits < i_creditsRequiredForGraduation) {
            revert Certification__NotEnoughCredits(student, credits);
        }

        uint256 tokenId = s_tokenIdCounter++;
        s_studentToDiplomaId[student] = tokenId;
        _mint(student, tokenId);

        s_diplomas[tokenId] = Diploma({
            degreeTitle: degreeTitle, finalAverage: weightedAverage, issueTimestamp: block.timestamp, major: major
        });

        emit DiplomaIssued(student, tokenId);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    /// @inheritdoc ICertification
    function getDiplomaMetadata(uint256 tokenId)
        external
        view
        returns (uint256, uint256, string memory, string memory)
    {
        Diploma memory diploma = s_diplomas[tokenId];
        return (diploma.finalAverage, diploma.issueTimestamp, diploma.degreeTitle, diploma.major);
    }

    /// @inheritdoc ICertification
    function getDiplomaIdForStudent(address student) external view returns (uint256) {
        return s_studentToDiplomaId[student];
    }

    /// @inheritdoc ICertification
    function getUniversityCoreContract() external view returns (address) {
        return address(i_coreContract);
    }

    /// @inheritdoc ICertification
    function hasDiploma(address student) external view returns (bool) {
        return balanceOf(student) != 0;
    }
}
