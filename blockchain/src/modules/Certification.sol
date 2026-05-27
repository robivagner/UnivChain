// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {ICertification} from "../interfaces/ICertification.sol";
import {IUniversityCore} from "../interfaces/IUniversityCore.sol";
import {SoulboundNFT} from "../shared/SoulboundNFT.sol";

/**
 * @title Certification
 * @notice Issues soulbound diploma credentials with document anchoring and ERC-721 metadata.
 * @dev Enforces graduation policy, stores an immutable snapshot, and supports revocation.
 */
contract Certification is ICertification, SoulboundNFT {
    // Errors
    error Certification__NotCore(address sender);
    error Certification__AddressZero();
    error Certification__NotEnoughCredits(address student, uint256 credits);
    error Certification__AverageTooLow(address student, uint256 average);
    error Certification__InvalidCredentialAnchor();
    error Certification__StudentAlreadyHasDiploma(address student);
    error Certification__DiplomaDoesNotExist(uint256 tokenId);
    error Certification__DiplomaAlreadyRevoked(uint256 tokenId);

    // State variables
    uint256 public immutable i_creditsRequiredForGraduation;
    uint256 public immutable i_minimumAverageForGraduation;
    IUniversityCore public immutable i_coreContract;

    uint256 public s_tokenIdCounter;
    mapping(uint256 tokenId => Diploma) private s_diplomas;
    mapping(address student => uint256 tokenId) public s_studentToDiplomaId;

    // Events
    event DiplomaIssued(
        address indexed student,
        uint256 indexed tokenId,
        bytes32 documentHash,
        string metadataURI,
        uint256 totalCredits,
        uint256 finalAverage
    );
    event DiplomaRevoked(uint256 indexed tokenId, address indexed revokedBy);

    // Modifiers
    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert Certification__NotCore(msg.sender);
        }
        _;
    }

    /**
     * @param coreContract The hub authorized to issue and revoke credentials.
     * @param creditsRequired Minimum ECTS required to graduate.
     * @param minimumAverageRequired Minimum weighted average (× 100).
     */
    constructor(address coreContract, uint256 creditsRequired, uint256 minimumAverageRequired)
        SoulboundNFT("UnivChain Diploma", "DIP")
    {
        if (coreContract == address(0)) {
            revert Certification__AddressZero();
        }

        i_creditsRequiredForGraduation = creditsRequired;
        i_minimumAverageForGraduation = minimumAverageRequired;
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
        uint256 weightedAverage,
        bytes32 documentHash,
        string calldata metadataURI
    ) external onlyCore {
        if (s_studentToDiplomaId[student] != 0) {
            revert Certification__StudentAlreadyHasDiploma(student);
        }
        if (documentHash == bytes32(0) && bytes(metadataURI).length == 0) {
            revert Certification__InvalidCredentialAnchor();
        }
        if (credits < i_creditsRequiredForGraduation) {
            revert Certification__NotEnoughCredits(student, credits);
        }
        if (weightedAverage < i_minimumAverageForGraduation) {
            revert Certification__AverageTooLow(student, weightedAverage);
        }

        uint256 tokenId = s_tokenIdCounter++;
        s_studentToDiplomaId[student] = tokenId;
        _mint(student, tokenId);

        s_diplomas[tokenId] = Diploma({
            documentHash: documentHash,
            metadataURI: metadataURI,
            totalCredits: credits,
            finalAverage: weightedAverage,
            issueTimestamp: block.timestamp,
            degreeTitle: degreeTitle,
            major: major,
            issuer: address(i_coreContract),
            revoked: false
        });

        emit DiplomaIssued(student, tokenId, documentHash, metadataURI, credits, weightedAverage);
    }

    /// @inheritdoc ICertification
    function revokeDiploma(uint256 tokenId) external onlyCore {
        Diploma storage diploma = s_diplomas[tokenId];
        if (_ownerOf(tokenId) == address(0)) {
            revert Certification__DiplomaDoesNotExist(tokenId);
        }
        if (diploma.revoked) {
            revert Certification__DiplomaAlreadyRevoked(tokenId);
        }

        diploma.revoked = true;
        emit DiplomaRevoked(tokenId, msg.sender);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    /// @inheritdoc ICertification
    function getDiploma(uint256 tokenId) external view returns (Diploma memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert Certification__DiplomaDoesNotExist(tokenId);
        }
        return s_diplomas[tokenId];
    }

    /// @notice ERC-721 metadata URI stored at issuance (typically IPFS JSON).
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert Certification__DiplomaDoesNotExist(tokenId);
        }
        return s_diplomas[tokenId].metadataURI;
    }

    /// @inheritdoc ICertification
    function isDiplomaValid(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) {
            return false;
        }
        return !s_diplomas[tokenId].revoked;
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

    /// @inheritdoc ICertification
    function hasValidDiploma(address student) external view returns (bool) {
        uint256 tokenId = s_studentToDiplomaId[student];
        if (tokenId == 0 || _ownerOf(tokenId) == address(0)) {
            return false;
        }
        return !s_diplomas[tokenId].revoked;
    }
}
