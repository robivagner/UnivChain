// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IERC5192
/// @notice Minimal soulbound extension for ERC-721 (EIP-5192).
/// @dev See https://eips.ethereum.org/EIPS/eip-5192
interface IERC5192 {
    /// @notice Emitted when a token is minted in a locked (non-transferable) state.
    event Locked(uint256 tokenId);

    /// @notice Emitted when a token becomes transferable (not used for permanent SBTs).
    event Unlocked(uint256 tokenId);

    /// @notice Returns whether `tokenId` is locked (non-transferable).
    /// @dev Reverts if the token does not exist.
    function locked(uint256 tokenId) external view returns (bool);
}
