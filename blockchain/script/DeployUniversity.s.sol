// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";

import {UniversityCore} from "../src/core/UniversityCore.sol";
import {StudentRegistry} from "../src/modules/StudentRegistry.sol";
import {Gradebook} from "../src/modules/Gradebook.sol";
import {Certification} from "../src/modules/Certification.sol";
import {FeeManager} from "../src/modules/FeeManager.sol";

contract DeployUniversity is Script {
    uint256 public constant CREDITS_REQUIRED = 180;

    /// @dev Call from `forge script` (uses broadcast). `admin` is `msg.sender` at entry.
    function run() external returns (UniversityCore, StudentRegistry, Gradebook, Certification, FeeManager) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        (
            UniversityCore core,
            StudentRegistry registry,
            Gradebook gradebook,
            Certification certification,
            FeeManager feeManager
        ) = _deploy(admin, false);
        vm.stopBroadcast();

        return (core, registry, gradebook, certification, feeManager);
    }

    /// @dev For tests: pass the account that should own `UniversityCore` admin roles. No broadcast (prank-compatible).
    function runWithAdmin(address admin)
        external
        returns (UniversityCore, StudentRegistry, Gradebook, Certification, FeeManager)
    {
        return _deploy(admin, true);
    }

    /// @param usePrankForAdminCalls In `forge test`, the script contract is the caller unless we prank. In
    /// `forge script --broadcast`, prank is forbidden while broadcasting; calls already use the signer as `msg.sender`.
    function _deploy(address admin, bool usePrankForAdminCalls)
        private
        returns (
            UniversityCore core,
            StudentRegistry registry,
            Gradebook gradebook,
            Certification certification,
            FeeManager feeManager
        )
    {
        // 1. Deploy Core
        core = new UniversityCore("Faculty of Computer Science", admin);

        // 2. Deploy Modules
        registry = new StudentRegistry(address(core));
        gradebook = new Gradebook(address(core));
        certification = new Certification(address(core), CREDITS_REQUIRED);
        feeManager = new FeeManager(address(core));

        // 3. Initialize and Setup
        if (usePrankForAdminCalls) vm.startPrank(admin);

        core.initializeCore(address(registry), address(gradebook), address(certification), address(feeManager));

        core.addDiplomaIssuer(admin);

        if (usePrankForAdminCalls) vm.stopPrank();
    }
}
