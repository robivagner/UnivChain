// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title Interface for University Fee Manager
/// @notice Handles enrollment registration fees (voucher flow) and unified student debt (retake + semester taxes).
/// @dev Implemented by the FeeManager contract to act as the treasury hub.
interface IFeeManager {
    /// @notice Configures token payment settings for enrollment and student debt accruals.
    /// @param token The ERC20 token address.
    /// @param registrationFee Enrollment registration fee (0 disables enrollment with this token).
    /// @param retakeFeePerCredit Retake tax per ECTS credit (0 disables retake accrual in this token).
    /// @param semesterTax Fixed semester tax amount (0 disables semester accrual in this token).
    function configureToken(
        address token,
        uint256 registrationFee,
        uint256 retakeFeePerCredit,
        uint256 semesterTax
    ) external;

    /// @notice Allows a student to pay their registration fee using an allowed ERC20 token.
    function payRegistrationFee(address token, address student) external;

    /// @notice Accrues retake tax based on subject credits and the configured fee-per-credit.
    function accrueRetakeTax(address student, address token, uint8 subjectCredits) external;

    /// @notice Accrues one semester tax using the configured fixed semester amount.
    function accrueSemesterTax(address student, address token) external;

    /// @notice Applies a student's payment toward their unified outstanding debt.
    function payStudentDebt(address token, address student, uint256 amount) external;

    function consumeFeeVoucher(address student) external;

    function withdrawFunds(address token, address destination, uint256 amount) external;

    function processRefund(address student) external;

    function hasPaidFee(address student) external view returns (bool hasPaid);

    function hasOutstandingDebt(address student) external view returns (bool hasOutstanding);

    function getStudentDebtOwed(address student, address token) external view returns (uint256 owed);

    function getUniversityCoreContract() external view returns (address core);

    function getRegistrationFeeForToken(address token) external view returns (uint256 registrationFee);

    function getRetakeFeePerCreditForToken(address token) external view returns (uint256 retakeFeePerCredit);

    function getSemesterTaxForToken(address token) external view returns (uint256 semesterTax);
}
