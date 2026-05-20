// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SoulboundNFT is ERC721 {
    error SoulBoundNFT__NotAuthorized();

    constructor() ERC721("StudentRegistry", "SR") {}

    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0)) {
            revert SoulBoundNFT__NotAuthorized();
        }

        return super._update(to, tokenId, auth);
    }
}
