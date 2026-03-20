// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IERC165} from "./Interfaces/IERC165.sol";
import {IERC4671} from "./Interfaces/IERC4671.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract Identity is IERC4671, AccessControl {
    // Errors

    // State variables

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROFESSOR_ROLE = keccak256("PROFESSOR_ROLE");

    struct Student {
        string name;
        string faculty;
        string registrationNumber;
        uint256 registrationDate;
        bool revoked;
    }

    uint256 public tokenIdCounter;

    mapping(uint256 tokenId => address student) public owners;
    mapping(uint256 tokenId => Student) public students;
    mapping(address student => uint256 tokenId) public studentToTokenId;

    mapping(address student => uint256 balance) internal _balances;

    // Functions

    constructor(address _initialAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _initialAdmin);
        _grantRole(ADMIN_ROLE, _initialAdmin);

        tokenIdCounter = 1;
    }

    function mintStudent(
        address student,
        string memory _name,
        string memory _faculty,
        string memory _registrationNumber
    ) public onlyRole(ADMIN_ROLE) {
        require(_balances[student] == 0, "Student already has an identity.");
        require(student != address(0), "Student can't be address(0).");

        uint256 tokenId = tokenIdCounter++;
        owners[tokenId] = student;
        _balances[student] = 1;
        studentToTokenId[student] = tokenId;

        students[tokenId] = Student({
            name: _name,
            faculty: _faculty,
            registrationNumber: _registrationNumber,
            registrationDate: block.timestamp,
            revoked: false
        });

        emit Minted(student, tokenId);
    }

    function addProfessor(address professor) external onlyRole(ADMIN_ROLE) {
        _grantRole(PROFESSOR_ROLE, professor);
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = owners[tokenId];
        require(owner != address(0), "Token does not exist.");
        return owner;
    }

    function balanceOf(address owner) public view override returns (uint256) {
        return _balances[owner];
    }

    function isValid(uint256 tokenId) public view override returns (bool) {
        return owners[tokenId] != address(0) && !students[tokenId].revoked;
    }

    function hasValid(address owner) public view override returns (bool) {
        uint256 tokenId = studentToTokenId[owner];
        return isValid(tokenId);
    }

    function revoke(uint256 tokenId) external onlyRole(ADMIN_ROLE) {
        students[tokenId].revoked = true;
        emit Revoked(owners[tokenId], tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, IERC165) returns (bool) {
        return interfaceId == type(IERC4671).interfaceId || super.supportsInterface(interfaceId);
    }
}
