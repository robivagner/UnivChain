// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Fee Manager
/// @notice Handles ERC20 payments (stablecoins) for student enrollment registration fees.
/// @dev Implemented by the FeeManager contract to act as the treasury hub.
interface IFeeManager {
    /// @notice Defines the allowed tokens and their exact required fee amount (accounting for decimals).
    /// @dev Can only be called by the UniversityCore contract via admin actions.
    /// @param token The ERC20 token address.
    /// @param feeAmount The amount required to pay the registration fee (0 means token not allowed).
    function setTokenFee(address token, uint256 feeAmount) external;

    /// @notice Allows a student to pay their registration fee using an allowed ERC20 token.
    /// @dev Pulls tokens from UniversityCore (which extracts them from the student) into this contract.
    /// @param token The ERC20 token the student wishes to pay with.
    /// @param student The wallet address of the student applying for enrollment.
    function payRegistrationFee(address token, address student) external;

    /// @notice Consumes a student's payment voucher during successful enrollment.
    /// @dev Can only be called by the UniversityCore contract. Resets payment tracking status.
    /// @param student The address of the student whose voucher is being consumed.
    function consumeFeeVoucher(address student) external;

    /// @notice Allows the university administration to withdraw accumulated institutional fees.
    /// @dev Can only be called by the UniversityCore contract via admin actions.
    /// @param token The ERC20 token contract address to withdraw.
    /// @param destination The wallet address receiving the withdrawn funds.
    /// @param amount The exact amount of tokens to transfer.
    function withdrawFunds(address token, address destination, uint256 amount) external;

    /// @notice Reverts a student's payment voucher and transfers the exact paid amount back to them.
    /// @dev Can only be called by the UniversityCore contract when an application is rejected.
    /// @param student The wallet address of the student receiving the refund.
    function processRefund(address student) external;

    /// @notice Checks if a student has successfully paid the registration fee and holds an active voucher.
    /// @param student The wallet address of the student to check.
    /// @return A boolean indicating whether the student has paid and is pending enrollment.
    function hasPaidFee(address student) external view returns (bool);

    /// @notice Retrieves the immutable address of the linked central UniversityCore orchestrator.
    /// @return The contract address of UniversityCore.
    function getUniversityCoreContract() external view returns (address);

    /// @notice Retrieves the required registration fee amount configured for a specific token.
    /// @param token The contract address of the ERC20 token.
    /// @return The fee amount required (0 indicates the token is disabled).
    function getFeeAmountForToken(address token) external view returns (uint256);
}
