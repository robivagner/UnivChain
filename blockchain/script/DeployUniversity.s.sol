// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {UniversityCore} from "../src/UniversityCore.sol";
import {StudentRegistry} from "../src/StudentRegistry.sol";
import {Gradebook} from "../src/Gradebook.sol";
import {Certification} from "../src/Certification.sol";

contract DeployUniversity is Script {
    /// @dev Call from `forge script` (uses broadcast). `admin` is `msg.sender` at entry.
    function run() external returns (UniversityCore, StudentRegistry, Gradebook, Certification) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPrivateKey);
        vm.startBroadcast();
        (UniversityCore core, StudentRegistry registry, Gradebook gradebook, Certification certification) =
            _deploy(admin, false);
        vm.stopBroadcast();
        return (core, registry, gradebook, certification);
    }

    /// @dev For tests: pass the account that should own `UniversityCore` admin roles. No broadcast (prank-compatible).
    function runWithAdmin(address admin) external returns (UniversityCore, StudentRegistry, Gradebook, Certification) {
        return _deploy(admin, true);
    }

    /// @param usePrankForAdminCalls In `forge test`, the script contract is the caller unless we prank. In
    /// `forge script --broadcast`, prank is forbidden while broadcasting; calls already use the signer as `msg.sender`.
    function _deploy(address admin, bool usePrankForAdminCalls)
        private
        returns (UniversityCore core, StudentRegistry registry, Gradebook gradebook, Certification certification)
    {
        core = new UniversityCore("Faculty of Computer Science", admin);
        registry = new StudentRegistry(address(core));
        gradebook = new Gradebook(address(core));
        certification = new Certification(address(core));

        if (usePrankForAdminCalls) vm.startPrank(admin);
        core.setStudentRegistryContract(address(registry));
        core.setGradebookContract(address(gradebook));
        core.setCertificationContract(address(certification));
        core.grantRole(core.DIPLOMA_ISSUER_ROLE(), admin);
        if (usePrankForAdminCalls) vm.stopPrank();
    }
}
