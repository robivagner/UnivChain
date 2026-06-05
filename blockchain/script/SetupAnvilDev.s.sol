// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";

import {UniversityCore} from "../src/core/UniversityCore.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @notice Local-only helper: deploy Mock USDC and register the enrollment fee on Core.
contract SetupAnvilDev is Script {
  uint256 public constant REGISTRATION_FEE = 10 * 10 ** 6; // 10 mock USDC (6 decimals)
  uint256 public constant RETAKE_FEE_PER_CREDIT = 1 * 10 ** 6; // 1 mock USDC per ECTS

  uint256 public constant SEMESTER_TAX = 50 * 10 ** 6;

  function run() external returns (MockERC20 token) {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address core = vm.envAddress("UNIVERSITY_CORE");

    vm.startBroadcast(deployerPrivateKey);
    token = new MockERC20();
    UniversityCore(core).configureToken(address(token), REGISTRATION_FEE, RETAKE_FEE_PER_CREDIT, SEMESTER_TAX);
    vm.stopBroadcast();

    console2.log("MockUSDC", address(token));
    console2.log("UniversityCore", core);
    console2.log("RegistrationFee", REGISTRATION_FEE);
  }
}
