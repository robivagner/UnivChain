// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

/**
 * @dev Returns true if this contract implements the interface defined by
 * `interfaceId`. See the corresponding
 * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
 * to learn more about how these ids are created.
 *
 * This function call must use less than 30 000 gas.
 */
interface IERC165 {
    /// @notice Query if a contract implements an interface
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @dev Interface identification is specified in ERC-165. This function
    ///  uses less than 30,000 gas.
    /// @return `true` if the contract implements `interfaceID` and
    ///  `interfaceID` is not 0xffffffff, `false` otherwise
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
