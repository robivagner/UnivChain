// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract InvalidMockModule is IERC165 {
    function supportsInterface(bytes4) external pure returns (bool) {
        return false;
    }
}
