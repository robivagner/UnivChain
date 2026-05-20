// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Fee Manager
/// @notice Handles ERC20 payments (stablecoins) for student enrollment registration fees.
interface IFeeManager {
    /// @notice Defines the allowed tokens and their exact required fee amount (accounting for decimals).
    /// @param token The ERC20 token address.
    /// @param feeAmount The amount required to pay the registration fee (0 means token not allowed).
    function setTokenFee(address token, uint256 feeAmount) external;

    /// @notice Allows a student to pay their registration fee using an allowed ERC20 token.
    /// @param token The ERC20 token the student wishes to pay with.
    function payRegistrationFee(address token) external;

    /// @notice Consumes a student's payment voucher during enrollment.
    /// @dev Can only be called by the UniversityCore.
    /// @param student The address of the student whose voucher is being consumed.
    function consumeFeeVoucher(address student) external;

    /// @notice Allows the university to withdraw accumulated fees.
    /// @param token The ERC20 token to withdraw.
    /// @param destination The wallet address receiving the funds.
    /// @param amount The amount to withdraw.
    function withdrawFunds(address token, address destination, uint256 amount) external;

    /// @notice Checks if a student has successfully paid the registration fee.
    function hasPaidFee(address student) external view returns (bool);

    function getUniversityCoreContract() external view returns (address);
}
