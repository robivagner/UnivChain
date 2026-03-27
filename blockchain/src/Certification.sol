// SPDX-License-Identifier: MIT

pragma solidity ^0.8.25;

import {ICertification, IERC4671} from "./Interfaces/ICertification.sol";
import {IERC165} from "./Interfaces/IERC165.sol";
import {IUniversityCore} from "./Interfaces/IUniversityCore.sol";

contract Certification is ICertification {
    // Errors

    error Certification__NotCore(address sender);
    error Certification__AddressZero();
    error Certification__NotEnoughCredits(address student, uint256 credits);
    error Certification__DiplomaDoesNotExist(uint256 tokenId);

    // State variables

    uint256 public constant CREDITS_REQUIRED_FOR_GRADUATION = 180; // This is for 3 years

    IUniversityCore immutable i_coreContract;

    uint256 public s_diplomaIdCounter;
    mapping(uint256 => Diploma) public s_diplomas;
    mapping(uint256 => address) public s_owners;
    mapping(address => uint256) public s_balances;
    mapping(address => uint256) public s_studentToDiplomaId;

    // Events

    // Functions

    modifier onlyCore() {
        if (msg.sender != address(i_coreContract)) {
            revert Certification__NotCore(msg.sender);
        }
        _;
    }

    constructor(address coreContract) {
        if (coreContract == address(0)) {
            revert Certification__AddressZero();
        }

        i_coreContract = IUniversityCore(coreContract);
        s_diplomaIdCounter = 1;
    }

    function issueDiploma(
        address student,
        string calldata degreeTitle,
        string calldata major,
        uint256 credits,
        uint256 weightedAverage
    ) external override onlyCore {
        if (credits < CREDITS_REQUIRED_FOR_GRADUATION) {
            revert Certification__NotEnoughCredits(student, credits);
        }

        uint256 tokenId = s_diplomaIdCounter++;
        s_owners[tokenId] = student;
        s_balances[student] = 1;
        s_studentToDiplomaId[student] = tokenId;

        s_diplomas[tokenId] = Diploma({
            degreeTitle: degreeTitle, finalAverage: weightedAverage, issueDate: block.timestamp, major: major
        });

        emit Minted(student, tokenId);
    }

    //////////////////////////////
    /////// View Functions ///////
    //////////////////////////////

    function ownerOf(uint256 tokenId) external view override returns (address) {
        address owner = s_owners[tokenId];
        if (owner == address(0)) {
            revert Certification__DiplomaDoesNotExist(tokenId);
        }
        return owner;
    }

    function balanceOf(address owner) external view override returns (uint256) {
        return s_balances[owner];
    }

    function isValid(uint256 tokenId) external view override returns (bool) {
        return s_owners[tokenId] != address(0);
    }

    function hasValid(address owner) external view override returns (bool) {
        return s_balances[owner] > 0;
    }

    function getDiplomaMetadata(uint256 tokenId)
        external
        view
        override
        returns (uint256, uint256, string memory, string memory)
    {
        if (s_owners[tokenId] == address(0)) {
            revert Certification__DiplomaDoesNotExist(tokenId);
        }

        Diploma memory diploma = s_diplomas[tokenId];

        return (diploma.finalAverage, diploma.issueDate, diploma.degreeTitle, diploma.major);
    }

    function getUniversityCoreContract() external view override returns (address) {
        return address(i_coreContract);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC4671).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
