// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Certifications
/// @notice Manages the issuance of final academic diplomas as Soulbound Tokens (SBTs).
/// @dev Implemented by the Certification contract to archive immutable academic achievements.
interface ICertification {
    /// @dev On-chain credential record; rich fields (degree title, major, etc.) live in off-chain JSON at `metadataURI`.
    struct Diploma {
        bytes32 documentHash; // optional keccak256 of canonical UTF-8 JSON bytes
        string metadataURI; // ERC-721 token URI (IPFS/HTTPS JSON credential)
        uint256 totalCredits; // ECTS snapshot at graduation
        uint256 finalAverage; // GPA weighted average over passed subjects (× 100, e.g. 950 = 9.50)
        uint256 issueTimestamp; // block.timestamp at mint
        address issuer; // wallet that held DIPLOMA_ISSUER_ROLE at issuance
        bool revoked;
    }

    /// @notice Issues a non-transferable diploma after verifying academic requirements.
    /// @dev Requires non-empty `metadataURI`. `documentHash` is optional (keccak256 of canonical JSON).
    function issueDiploma(
        address student,
        uint256 credits,
        uint256 average,
        bytes32 documentHash,
        string calldata metadataURI,
        address issuer
    ) external;

    /// @notice Marks a diploma as revoked; ownership is retained for auditability.
    /// @param tokenId The token ID to revoke the diploma for.
    function revokeDiploma(uint256 tokenId) external;

    /// @notice Returns the full on-chain diploma record.
    /// @param tokenId The token ID to retrieve the diploma for.
    /// @return diploma The full on-chain diploma record.
    function getDiploma(uint256 tokenId) external view returns (Diploma memory diploma);

    /// @notice True if the token exists, is not revoked, and has an owner.
    /// @param tokenId The token ID to check.
    /// @return isValid True if the diploma is valid.
    function isDiplomaValid(uint256 tokenId) external view returns (bool isValid);

    /// @notice Retrieves the unique Token ID associated with a student address.
    /// @param student The wallet address of the student.
    /// @return tokenId The associated ERC721 token identifier.
    function getDiplomaIdForStudent(address student) external view returns (uint256 tokenId);

    /// @notice Retrieves the address of the central University Core contract orchestrating this module.
    /// @return coreAddress The contract address of UniversityCore.
    function getUniversityCoreContract() external view returns (address coreAddress);

    /// @notice Checks if a student has a diploma.
    /// @param student The wallet address of the student.
    /// @return holdsDiploma True if the student has a diploma.
    function hasDiploma(address student) external view returns (bool holdsDiploma);

    /// @notice True if the student owns a diploma token and it has not been revoked.
    function hasValidDiploma(address student) external view returns (bool);
}
