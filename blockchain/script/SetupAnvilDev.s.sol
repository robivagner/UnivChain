// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console2} from "forge-std/Script.sol";

import {UniversityCore} from "../src/core/UniversityCore.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @notice Local-only helper: deploy Mock USDC and register the enrollment fee on Core.
contract SetupAnvilDev is Script {
  uint256 public constant REGISTRATION_FEE = 10 * 10 ** 6; // 10 mock USDC (6 decimals)

  function run() external returns (MockERC20 token) {
    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address core = vm.envAddress("UNIVERSITY_CORE");

    vm.startBroadcast(deployerPrivateKey);
    token = new MockERC20();
    UniversityCore(core).setTokenFee(address(token), REGISTRATION_FEE);
    vm.stopBroadcast();

    console2.log("MockUSDC", address(token));
    console2.log("UniversityCore", core);
    console2.log("RegistrationFee", REGISTRATION_FEE);
  }
}
