// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice A fake ERC20 token (Mock USDC) to test transfer logic.
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    /// @notice Overrides the default 18 decimals to 6, simulating real USDC.
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
