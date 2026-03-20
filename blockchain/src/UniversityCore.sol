// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "./Interfaces/IERC165.sol";
import {IERC4671} from "./Interfaces/IERC4671.sol";
import "./Identity.sol";
import "./Gradebook.sol";

contract UniversityCore is Ownable {
    // Errors

    // State variables

    Identity public identityContract;
    Gradebook public gradebookContract;

    // Events

    event IdentityContractSet(address newIdentityContract, address oldIdentityContract);
    event GradebookContractSet(address newGradebookContract, address oldGradebookContract);

    // Functions

    constructor(address _identityContract, address _gradebookContract, address owner) Ownable(owner) {
        require(_identityContract != address(0), "Identity contract can't be address(0).");
        require(_gradebookContract != address(0), "Gradebook contract can't be address(0).");
        require(owner != address(0), "Owner can't be address(0).");
        require(
            IERC165(_identityContract).supportsInterface(type(IERC4671).interfaceId),
            "Identity contract must implement IERC4671"
        );

        identityContract = Identity(_identityContract);
        gradebookContract = Gradebook(_gradebookContract);

        emit IdentityContractSet(_identityContract, address(0));
        emit GradebookContractSet(_gradebookContract, address(0));
    }

    function setIdentityContract(address _identityContract) external onlyOwner {
        require(_identityContract != address(0), "New Identity contract can't be address(0).");
        require(
            _identityContract != address(identityContract),
            "New Identity contract can't be the same as current Identity contract."
        );
        require(
            IERC165(_identityContract).supportsInterface(type(IERC4671).interfaceId),
            "New Identity contract must implement IERC4671"
        );

        address oldIdentityContract = address(identityContract);
        identityContract = Identity(_identityContract);

        emit IdentityContractSet(_identityContract, oldIdentityContract);
    }

    function setGradebookContract(address _gradebookContract) external onlyOwner {
        require(_gradebookContract != address(0), "New Gradebook contract can't be address(0).");
        require(
            _gradebookContract != address(gradebookContract),
            "New Gradebook contract can't be the same as current Identity contract."
        );

        address oldGradebookContract = address(gradebookContract);
        gradebookContract = Gradebook(_gradebookContract);

        emit GradebookContractSet(_gradebookContract, oldGradebookContract);
    }

    //TODO make this contract as the single entry point that communicates with the other contracts.
}
