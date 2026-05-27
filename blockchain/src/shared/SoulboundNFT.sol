// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC5192} from "../interfaces/IERC5192.sol";

/// @title SoulboundNFT
/// @notice Non-transferable ERC-721 with EIP-5192 soulbound signaling for wallets and indexers.
contract SoulboundNFT is ERC721, IERC5192 {
    /// @dev EIP-5192 interface id per https://eips.ethereum.org/EIPS/eip-5192
    bytes4 private constant INTERFACE_ID_ERC5192 = 0xb45a3c0e;

    error SoulBoundNFT__NotAuthorized();
    error SoulBoundNFT__TokenDoesNotExist(uint256 tokenId);

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    /// @inheritdoc IERC5192
    function locked(uint256 tokenId) external view returns (bool) {
        if (_ownerOf(tokenId) == address(0)) {
            revert SoulBoundNFT__TokenDoesNotExist(tokenId);
        }
        return true;
    }

    /// @inheritdoc ERC721
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == INTERFACE_ID_ERC5192 || super.supportsInterface(interfaceId);
    }

    /// @inheritdoc ERC721
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0)) {
            revert SoulBoundNFT__NotAuthorized();
        }

        address updated = super._update(to, tokenId, auth);

        if (from == address(0) && to != address(0)) {
            emit Locked(tokenId);
        }

        return updated;
    }
}
