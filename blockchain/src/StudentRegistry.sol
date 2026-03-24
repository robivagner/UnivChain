// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {IStudentRegistry, IERC4671} from "./Interfaces/IStudentRegistry.sol";
import {IERC165} from "./Interfaces/IERC165.sol";
import {IUniversityCore} from "./Interfaces/IUniversityCore.sol";

contract StudentRegistry is IStudentRegistry {
    // Errors

    error StudentRegistry__NotCore(address sender);
    error StudentRegistry__AddressZero();
    error StudentRegistry__StudentAlreadyRegistered(address student);
    error StudentRegistry__StudentNotEnrolled(address student);
    error StudentRegistry__InvalidTokenId(uint256 tokenId);

    // State variables

    IUniversityCore immutable i_coreContract;

    uint256 public s_tokenIdCounter;

    mapping(uint256 tokenId => Student) public s_students;
    mapping(uint256 tokenId => address student) public s_owners;
    mapping(address student => uint256 balance) public s_balances;
    mapping(address student => uint256 tokenId) public s_studentToTokenId;

    // Events

    // Functions

    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert StudentRegistry__NotCore(msg.sender);
        }
        _;
    }

    constructor(address coreContract) {
        if (coreContract == address(0)) {
            revert StudentRegistry__AddressZero();
        }

        i_coreContract = IUniversityCore(coreContract);

        s_tokenIdCounter = 1;
    }

    function enrollStudent(address student, string memory name, string memory faculty, string memory registrationNumber)
        external
        override
        onlyCore
    {
        if (s_balances[student] != 0) {
            revert StudentRegistry__StudentAlreadyRegistered(student);
        }
        if (student == address(0)) {
            revert StudentRegistry__AddressZero();
        }

        uint256 tokenId = s_tokenIdCounter++;
        s_owners[tokenId] = student;
        s_balances[student] = 1;
        s_studentToTokenId[student] = tokenId;

        s_students[tokenId] = Student({
            registrationDate: block.timestamp,
            name: name,
            faculty: faculty,
            registrationNumber: registrationNumber,
            revoked: false
        });

        emit Minted(student, tokenId);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function ownerOf(uint256 tokenId) external view override returns (address) {
        address owner = s_owners[tokenId];
        if (owner == address(0)) {
            revert StudentRegistry__InvalidTokenId(tokenId);
        }

        return owner;
    }

    function balanceOf(address owner) external view override returns (uint256) {
        return s_balances[owner];
    }

    function isValid(uint256 tokenId) external view override returns (bool) {
        return _isValid(tokenId);
    }

    function hasValid(address owner) external view override returns (bool) {
        uint256 tokenId = s_studentToTokenId[owner];
        return _isValid(tokenId);
    }

    function revoke(uint256 tokenId) external override onlyCore {
        address owner = s_owners[tokenId];
        if (owner == address(0)) {
            revert StudentRegistry__InvalidTokenId(tokenId);
        }

        s_students[tokenId].revoked = true;
        emit Revoked(owner, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) external view virtual override(IERC165) returns (bool) {
        return interfaceId == type(IERC4671).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    function getStudentMetadata(address student)
        external
        view
        override
        returns (uint256, string memory, string memory, string memory, bool)
    {
        uint256 tokenId = s_studentToTokenId[student];
        if (tokenId == 0) {
            revert StudentRegistry__StudentNotEnrolled(student);
        }

        Student memory s = s_students[tokenId];

        return (s.registrationDate, s.name, s.faculty, s.registrationNumber, s.revoked);
    }

    //////////////////////////////////
    /////// Internal Functions ///////
    //////////////////////////////////

    function _isValid(uint256 tokenId) internal view returns (bool) {
        return s_owners[tokenId] != address(0) && !s_students[tokenId].revoked;
    }
}
