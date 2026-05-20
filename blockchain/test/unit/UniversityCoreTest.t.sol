// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {UniversityCore} from "../../src/core/UniversityCore.sol";

/// @notice Mock Contract used exclusively to bypass interface checks during Unit Tests.
contract MockModule is IERC165 {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC721).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}

/// @notice Mock Contract representing an invalid module (fails ERC721 checks).
contract InvalidMockModule is IERC165 {
    function supportsInterface(bytes4) external pure returns (bool) {
        return false;
    }
}

contract UniversityCoreTest is Test {
    UniversityCore public core;

    MockModule public mockRegistry;
    MockModule public mockGradebook;
    MockModule public mockCertification;
    MockModule public mockFeeManager;
    InvalidMockModule public invalidModule;

    address public admin = makeAddr("admin");
    address public professor = makeAddr("professor");
    address public issuer = makeAddr("issuer");
    address public alice = makeAddr("alice");

    function setUp() public {
        mockRegistry = new MockModule();
        mockGradebook = new MockModule();
        mockCertification = new MockModule();
        mockFeeManager = new MockModule();
        invalidModule = new InvalidMockModule();

        vm.prank(admin);
        core = new UniversityCore("Faculty of Computer Science", admin);
    }

    ///////////////////////////////////
    /////// Constructor Tests /////////
    ///////////////////////////////////

    /// @notice Verifies that the constructor properly initializes faculty name and assigns admin roles.
    function test_ConstructorSetsFacultyNameAndAdmin() public view {
        assertEq(core.s_facultyName(), "Faculty of Computer Science");
        assertTrue(core.hasRole(core.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(core.hasRole(core.ADMIN_ROLE(), admin));
    }

    function test_RevertConstructorZeroAddress() public {
        vm.expectRevert(UniversityCore.UniversityCore__AddressZero.selector);
        new UniversityCore("Faculty", address(0));
    }

    function test_RevertConstructorEmptyName() public {
        vm.expectRevert(UniversityCore.UniversityCore__FacultyNameZero.selector);
        new UniversityCore("", admin);
    }

    ///////////////////////////////////
    /////// RBAC (Roles) Tests ////////
    ///////////////////////////////////

    function test_AdminCanAddProfessor() public {
        vm.prank(admin);
        core.addProfessor(professor);
        assertTrue(core.hasRole(core.PROFESSOR_ROLE(), professor));
    }

    function test_RevertOnlyAdminCanAddProfessor() public {
        vm.prank(alice);
        vm.expectRevert();
        core.addProfessor(professor);
    }

    function test_AdminCanAddDiplomaIssuer() public {
        vm.prank(admin);
        core.addDiplomaIssuer(issuer);
        assertTrue(core.hasRole(core.DIPLOMA_ISSUER_ROLE(), issuer));
    }

    function test_RevertOnlyAdminCanAddDiplomaIssuer() public {
        vm.prank(alice);
        vm.expectRevert();
        core.addDiplomaIssuer(issuer);
    }

    ///////////////////////////////////
    /////// Initialization Tests //////
    ///////////////////////////////////

    /// @notice Ensures all module addresses are successfully linked during core initialization.
    function test_InitializeCoreSuccess() public {
        vm.prank(admin);
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(mockCertification), address(mockFeeManager)
        );

        assertEq(core.getStudentRegistryContract(), address(mockRegistry));
        assertEq(core.getGradebookContract(), address(mockGradebook));
        assertEq(core.getCertificationContract(), address(mockCertification));
    }

    function test_RevertInitializeNotAdmin() public {
        vm.prank(alice);
        vm.expectRevert();
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(mockCertification), address(mockFeeManager)
        );
    }

    function test_RevertInitializeWithZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(UniversityCore.UniversityCore__AddressZero.selector);
        core.initializeCore(address(0), address(mockGradebook), address(mockCertification), address(mockFeeManager));
    }

    function test_RevertAlreadyInitialized() public {
        vm.startPrank(admin);
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(mockCertification), address(mockFeeManager)
        );

        vm.expectRevert(UniversityCore.UniversityCore__AlreadyInitialized.selector);
        core.initializeCore(
            address(mockRegistry), address(mockGradebook), address(mockCertification), address(mockFeeManager)
        );
        vm.stopPrank();
    }

    function test_RevertInitializeMissingERC721Support() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversityCore.UniversityCore__ContractDoesNotSupportIERC721.selector, address(invalidModule)
            )
        );
        core.initializeCore(
            address(invalidModule), address(mockGradebook), address(mockCertification), address(mockFeeManager)
        );
    }

    ////////////////////////////////
    /////// Setter Tests ///////////
    ////////////////////////////////

    function test_AdminCanSetStudentRegistryContract() public {
        MockModule newRegistry = new MockModule();

        vm.prank(admin);
        core.setStudentRegistryContract(address(newRegistry));
        assertEq(core.getStudentRegistryContract(), address(newRegistry));
    }

    function test_RevertSetRegistrySameAddress() public {
        vm.startPrank(admin);
        core.setStudentRegistryContract(address(mockRegistry));

        vm.expectRevert(UniversityCore.UniversityCore__SameAddress.selector);
        core.setStudentRegistryContract(address(mockRegistry));
        vm.stopPrank();
    }

    function test_RevertSetRegistryMissingERC721() public {
        vm.prank(admin);
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversityCore.UniversityCore__ContractDoesNotSupportIERC721.selector, address(invalidModule)
            )
        );
        core.setStudentRegistryContract(address(invalidModule));
    }

    function test_AdminCanSetGradebookContract() public {
        MockModule newGradebook = new MockModule();

        vm.prank(admin);
        core.setGradebookContract(address(newGradebook));
        assertEq(core.getGradebookContract(), address(newGradebook));
    }

    function test_AdminCanSetCertificationContract() public {
        MockModule newCert = new MockModule();

        vm.prank(admin);
        core.setCertificationContract(address(newCert));
        assertEq(core.getCertificationContract(), address(newCert));
    }

    function test_AdminCanSetFeeManagerContract() public {
        MockModule newFeeManager = new MockModule();

        vm.prank(admin);
        core.setFeeManagerContract(address(newFeeManager));
    }

    //////////////////////////////////////////
    /////// CoreInitialized Modifier Tests ///
    //////////////////////////////////////////

    /// @notice Ensures critical functions cannot be executed before the Core is fully linked to its modules.
    function test_RevertFunctionsIfCoreNotInitialized() public {
        vm.startPrank(admin);

        vm.expectRevert(UniversityCore.UniversityCore__NotInitialized.selector);
        core.enrollStudent(alice, bytes32(0));

        vm.expectRevert(UniversityCore.UniversityCore__NotInitialized.selector);
        core.expellStudent(alice);

        vm.expectRevert(UniversityCore.UniversityCore__NotInitialized.selector);
        core.addSubject("Math", 5, professor);

        vm.stopPrank();
    }
}
