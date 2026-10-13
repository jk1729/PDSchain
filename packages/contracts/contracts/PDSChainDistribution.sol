// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PDSChainDistribution
 * @notice Production smart contract for on-chain Public Distribution System (PDS) custody,
 *         inventory tracking, beneficiary entitlement quotas, and ration distribution verification.
 * @dev Enforces strict on-chain role boundaries, entity-scoped authorizations, non-negative accounting,
 *      monthly period entitlement limits, and atomic replay-protected distribution records.
 */
contract PDSChainDistribution is AccessControlEnumerable, ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------
    bytes32 public constant DISTRICT_OFFICER_ROLE = keccak256("DISTRICT_OFFICER_ROLE");
    bytes32 public constant WAREHOUSE_OPERATOR_ROLE = keccak256("WAREHOUSE_OPERATOR_ROLE");
    bytes32 public constant FPS_OPERATOR_ROLE = keccak256("FPS_OPERATOR_ROLE");

    // -------------------------------------------------------------------------
    // Domain Structures
    // -------------------------------------------------------------------------
    struct Commodity {
        bytes32 id;
        string name;
        string unit;
        bool isActive;
    }

    struct Beneficiary {
        bytes32 beneficiaryRef;
        string districtCode;
        bool isActive;
        uint64 registeredAt;
    }

    struct Entitlement {
        uint256 allocatedQuantity;
        uint256 distributedQuantity;
        bool isSet;
    }

    struct DistributionRecord {
        bytes32 claimRef;
        bytes32 fpsId;
        bytes32 beneficiaryRef;
        uint32 period;
        bytes32 commodityId;
        uint256 quantity;
        address dispensedBy;
        uint64 timestamp;
    }

    // -------------------------------------------------------------------------
    // State Storage
    // -------------------------------------------------------------------------
    bytes32[] private _commodityIds;
    mapping(bytes32 => Commodity) private _commodities;
    mapping(bytes32 => Beneficiary) private _beneficiaries;
    
    // key = keccak256(abi.encodePacked(beneficiaryRef, period, commodityId))
    mapping(bytes32 => Entitlement) private _entitlements;

    // warehouseId => commodityId => stock quantity
    mapping(bytes32 => mapping(bytes32 => uint256)) private _warehouseInventory;

    // fpsId => commodityId => stock quantity
    mapping(bytes32 => mapping(bytes32 => uint256)) private _fpsInventory;

    // Scoped operator assignments
    mapping(address => mapping(bytes32 => bool)) private _authorizedWarehouse;
    mapping(address => mapping(bytes32 => bool)) private _authorizedFps;

    // Duplicate claim tracking
    mapping(bytes32 => bool) private _claimed;
    mapping(bytes32 => DistributionRecord) private _distributionRecords;

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------
    error ZeroAddress();
    error InvalidIdentifier();
    error ZeroQuantity();
    error CommodityNotFound(bytes32 commodityId);
    error CommodityInactive(bytes32 commodityId);
    error CommodityAlreadyExists(bytes32 commodityId);
    error BeneficiaryNotFound(bytes32 beneficiaryRef);
    error BeneficiaryInactive(bytes32 beneficiaryRef);
    error BeneficiaryAlreadyExists(bytes32 beneficiaryRef);
    error OperatorNotAuthorizedForEntity(address operator, bytes32 entityId);
    error InsufficientWarehouseStock(bytes32 warehouseId, bytes32 commodityId, uint256 available, uint256 requested);
    error InsufficientFpsStock(bytes32 fpsId, bytes32 commodityId, uint256 available, uint256 requested);
    error EntitlementNotConfigured(bytes32 beneficiaryRef, uint32 period, bytes32 commodityId);
    error ExceedsEntitlement(bytes32 beneficiaryRef, uint32 period, bytes32 commodityId, uint256 remaining, uint256 requested);
    error DuplicateClaim(bytes32 claimRef);

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event CommodityRegistered(bytes32 indexed commodityId, string name, string unit);
    event CommodityStatusUpdated(bytes32 indexed commodityId, bool isActive);
    
    event BeneficiaryRegistered(bytes32 indexed beneficiaryRef, string districtCode, uint64 registeredAt);
    event BeneficiaryStatusUpdated(bytes32 indexed beneficiaryRef, bool isActive);

    event OperatorAuthorized(address indexed operator, bytes32 indexed role, bytes32 indexed entityId);
    event OperatorRevoked(address indexed operator, bytes32 indexed role, bytes32 indexed entityId);

    event MonthlyEntitlementConfigured(
        bytes32 indexed beneficiaryRef,
        uint32 indexed period,
        bytes32 indexed commodityId,
        uint256 allocatedQuantity
    );

    event WarehouseStockReceived(
        bytes32 indexed warehouseId,
        bytes32 indexed commodityId,
        uint256 quantity,
        string batchReference,
        address recordedBy,
        uint64 timestamp
    );

    event StockTransferredToFps(
        bytes32 indexed warehouseId,
        bytes32 indexed fpsId,
        bytes32 indexed commodityId,
        uint256 quantity,
        string transferReference,
        address transferredBy,
        uint64 timestamp
    );

    event RationDistributed(
        bytes32 indexed claimRef,
        bytes32 indexed fpsId,
        bytes32 indexed beneficiaryRef,
        uint32 period,
        bytes32 commodityId,
        uint256 quantity,
        address dispensedBy,
        uint64 timestamp
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    // -------------------------------------------------------------------------
    // Commodity Management (Admin Only)
    // -------------------------------------------------------------------------
    function registerCommodity(
        bytes32 id,
        string calldata name,
        string calldata unit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (id == bytes32(0) || bytes(name).length == 0 || bytes(unit).length == 0) {
            revert InvalidIdentifier();
        }
        if (_commodities[id].id != bytes32(0)) {
            revert CommodityAlreadyExists(id);
        }

        _commodities[id] = Commodity({
            id: id,
            name: name,
            unit: unit,
            isActive: true
        });
        _commodityIds.push(id);

        emit CommodityRegistered(id, name, unit);
    }

    function setCommodityStatus(
        bytes32 id,
        bool isActive
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_commodities[id].id == bytes32(0)) {
            revert CommodityNotFound(id);
        }
        _commodities[id].isActive = isActive;
        emit CommodityStatusUpdated(id, isActive);
    }

    // -------------------------------------------------------------------------
    // Scoped Operator Authorization (Admin Only)
    // -------------------------------------------------------------------------
    function authorizeWarehouseOperator(
        address operator,
        bytes32 warehouseId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (operator == address(0) || warehouseId == bytes32(0)) {
            revert InvalidIdentifier();
        }
        if (!hasRole(WAREHOUSE_OPERATOR_ROLE, operator)) {
            _grantRole(WAREHOUSE_OPERATOR_ROLE, operator);
        }
        _authorizedWarehouse[operator][warehouseId] = true;
        emit OperatorAuthorized(operator, WAREHOUSE_OPERATOR_ROLE, warehouseId);
    }

    function revokeWarehouseOperator(
        address operator,
        bytes32 warehouseId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _authorizedWarehouse[operator][warehouseId] = false;
        emit OperatorRevoked(operator, WAREHOUSE_OPERATOR_ROLE, warehouseId);
    }

    function authorizeFpsOperator(
        address operator,
        bytes32 fpsId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (operator == address(0) || fpsId == bytes32(0)) {
            revert InvalidIdentifier();
        }
        if (!hasRole(FPS_OPERATOR_ROLE, operator)) {
            _grantRole(FPS_OPERATOR_ROLE, operator);
        }
        _authorizedFps[operator][fpsId] = true;
        emit OperatorAuthorized(operator, FPS_OPERATOR_ROLE, fpsId);
    }

    function revokeFpsOperator(
        address operator,
        bytes32 fpsId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _authorizedFps[operator][fpsId] = false;
        emit OperatorRevoked(operator, FPS_OPERATOR_ROLE, fpsId);
    }

    // -------------------------------------------------------------------------
    // Beneficiary Management (Admin or District Officer)
    // -------------------------------------------------------------------------
    function registerBeneficiary(
        bytes32 beneficiaryRef,
        string calldata districtCode
    ) external {
        _requireAdminOrDistrictOfficer();
        if (beneficiaryRef == bytes32(0) || bytes(districtCode).length == 0) {
            revert InvalidIdentifier();
        }
        if (_beneficiaries[beneficiaryRef].beneficiaryRef != bytes32(0)) {
            revert BeneficiaryAlreadyExists(beneficiaryRef);
        }

        uint64 registeredAt = uint64(block.timestamp);
        _beneficiaries[beneficiaryRef] = Beneficiary({
            beneficiaryRef: beneficiaryRef,
            districtCode: districtCode,
            isActive: true,
            registeredAt: registeredAt
        });

        emit BeneficiaryRegistered(beneficiaryRef, districtCode, registeredAt);
    }

    function setBeneficiaryStatus(
        bytes32 beneficiaryRef,
        bool isActive
    ) external {
        _requireAdminOrDistrictOfficer();
        if (_beneficiaries[beneficiaryRef].beneficiaryRef == bytes32(0)) {
            revert BeneficiaryNotFound(beneficiaryRef);
        }
        _beneficiaries[beneficiaryRef].isActive = isActive;
        emit BeneficiaryStatusUpdated(beneficiaryRef, isActive);
    }

    // -------------------------------------------------------------------------
    // Entitlement Configuration (Admin or District Officer)
    // -------------------------------------------------------------------------
    function setMonthlyEntitlement(
        bytes32 beneficiaryRef,
        uint32 period,
        bytes32 commodityId,
        uint256 allocatedQuantity
    ) external {
        _requireAdminOrDistrictOfficer();
        if (beneficiaryRef == bytes32(0) || period == 0 || commodityId == bytes32(0)) {
            revert InvalidIdentifier();
        }
        if (_beneficiaries[beneficiaryRef].beneficiaryRef == bytes32(0)) {
            revert BeneficiaryNotFound(beneficiaryRef);
        }
        if (!_commodities[commodityId].isActive) {
            revert CommodityInactive(commodityId);
        }

        bytes32 key = _getEntitlementKey(beneficiaryRef, period, commodityId);
        Entitlement storage ent = _entitlements[key];
        ent.allocatedQuantity = allocatedQuantity;
        ent.isSet = true;

        emit MonthlyEntitlementConfigured(beneficiaryRef, period, commodityId, allocatedQuantity);
    }

    // -------------------------------------------------------------------------
    // Warehouse Inventory Operations
    // -------------------------------------------------------------------------
    function receiveWarehouseStock(
        bytes32 warehouseId,
        bytes32 commodityId,
        uint256 quantity,
        string calldata batchReference
    ) external nonReentrant {
        _requireWarehouseAuthorization(warehouseId);
        if (quantity == 0) {
            revert ZeroQuantity();
        }
        if (!_commodities[commodityId].isActive) {
            revert CommodityInactive(commodityId);
        }
        if (bytes(batchReference).length == 0) {
            revert InvalidIdentifier();
        }

        _warehouseInventory[warehouseId][commodityId] += quantity;

        emit WarehouseStockReceived(
            warehouseId,
            commodityId,
            quantity,
            batchReference,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    function transferStockToFps(
        bytes32 warehouseId,
        bytes32 fpsId,
        bytes32 commodityId,
        uint256 quantity,
        string calldata transferReference
    ) external nonReentrant {
        _requireWarehouseAuthorization(warehouseId);
        if (fpsId == bytes32(0) || bytes(transferReference).length == 0) {
            revert InvalidIdentifier();
        }
        if (quantity == 0) {
            revert ZeroQuantity();
        }
        if (!_commodities[commodityId].isActive) {
            revert CommodityInactive(commodityId);
        }

        uint256 currentStock = _warehouseInventory[warehouseId][commodityId];
        if (currentStock < quantity) {
            revert InsufficientWarehouseStock(warehouseId, commodityId, currentStock, quantity);
        }

        _warehouseInventory[warehouseId][commodityId] = currentStock - quantity;
        _fpsInventory[fpsId][commodityId] += quantity;

        emit StockTransferredToFps(
            warehouseId,
            fpsId,
            commodityId,
            quantity,
            transferReference,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    // -------------------------------------------------------------------------
    // FPS Ration Distribution
    // -------------------------------------------------------------------------
    function recordDistribution(
        bytes32 fpsId,
        bytes32 beneficiaryRef,
        uint32 period,
        bytes32 commodityId,
        uint256 quantity,
        bytes32 claimRef
    ) external nonReentrant {
        _requireFpsAuthorization(fpsId);

        if (claimRef == bytes32(0) || period == 0) {
            revert InvalidIdentifier();
        }
        if (quantity == 0) {
            revert ZeroQuantity();
        }
        if (_claimed[claimRef]) {
            revert DuplicateClaim(claimRef);
        }

        Beneficiary memory b = _beneficiaries[beneficiaryRef];
        if (b.beneficiaryRef == bytes32(0)) {
            revert BeneficiaryNotFound(beneficiaryRef);
        }
        if (!b.isActive) {
            revert BeneficiaryInactive(beneficiaryRef);
        }

        if (!_commodities[commodityId].isActive) {
            revert CommodityInactive(commodityId);
        }

        uint256 fpsStock = _fpsInventory[fpsId][commodityId];
        if (fpsStock < quantity) {
            revert InsufficientFpsStock(fpsId, commodityId, fpsStock, quantity);
        }

        bytes32 key = _getEntitlementKey(beneficiaryRef, period, commodityId);
        Entitlement storage ent = _entitlements[key];
        if (!ent.isSet) {
            revert EntitlementNotConfigured(beneficiaryRef, period, commodityId);
        }

        uint256 remaining = ent.allocatedQuantity > ent.distributedQuantity
            ? ent.allocatedQuantity - ent.distributedQuantity
            : 0;
        if (remaining < quantity) {
            revert ExceedsEntitlement(beneficiaryRef, period, commodityId, remaining, quantity);
        }

        // State mutations - fully atomic
        _claimed[claimRef] = true;
        _fpsInventory[fpsId][commodityId] = fpsStock - quantity;
        ent.distributedQuantity += quantity;

        uint64 currentTimestamp = uint64(block.timestamp);
        _distributionRecords[claimRef] = DistributionRecord({
            claimRef: claimRef,
            fpsId: fpsId,
            beneficiaryRef: beneficiaryRef,
            period: period,
            commodityId: commodityId,
            quantity: quantity,
            dispensedBy: msg.sender,
            timestamp: currentTimestamp
        });

        emit RationDistributed(
            claimRef,
            fpsId,
            beneficiaryRef,
            period,
            commodityId,
            quantity,
            msg.sender,
            currentTimestamp
        );
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------
    function getCommodity(bytes32 id) external view returns (Commodity memory) {
        return _commodities[id];
    }

    function getAllCommodityIds() external view returns (bytes32[] memory) {
        return _commodityIds;
    }

    function getBeneficiary(bytes32 beneficiaryRef) external view returns (Beneficiary memory) {
        return _beneficiaries[beneficiaryRef];
    }

    function getEntitlement(
        bytes32 beneficiaryRef,
        uint32 period,
        bytes32 commodityId
    ) external view returns (Entitlement memory) {
        return _entitlements[_getEntitlementKey(beneficiaryRef, period, commodityId)];
    }

    function getWarehouseStock(bytes32 warehouseId, bytes32 commodityId) external view returns (uint256) {
        return _warehouseInventory[warehouseId][commodityId];
    }

    function getFpsStock(bytes32 fpsId, bytes32 commodityId) external view returns (uint256) {
        return _fpsInventory[fpsId][commodityId];
    }

    function isClaimProcessed(bytes32 claimRef) external view returns (bool) {
        return _claimed[claimRef];
    }

    function getDistributionRecord(bytes32 claimRef) external view returns (DistributionRecord memory) {
        return _distributionRecords[claimRef];
    }

    function isWarehouseAuthorized(address operator, bytes32 warehouseId) external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, operator) || _authorizedWarehouse[operator][warehouseId];
    }

    function isFpsAuthorized(address operator, bytes32 fpsId) external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, operator) || _authorizedFps[operator][fpsId];
    }

    // -------------------------------------------------------------------------
    // Internal Helpers
    // -------------------------------------------------------------------------
    function _requireAdminOrDistrictOfficer() internal view {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && !hasRole(DISTRICT_OFFICER_ROLE, msg.sender)) {
            revert AccessControlUnauthorizedAccount(msg.sender, DISTRICT_OFFICER_ROLE);
        }
    }

    function _requireWarehouseAuthorization(bytes32 warehouseId) internal view {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            _checkRole(WAREHOUSE_OPERATOR_ROLE, msg.sender);
            if (!_authorizedWarehouse[msg.sender][warehouseId]) {
                revert OperatorNotAuthorizedForEntity(msg.sender, warehouseId);
            }
        }
    }

    function _requireFpsAuthorization(bytes32 fpsId) internal view {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            _checkRole(FPS_OPERATOR_ROLE, msg.sender);
            if (!_authorizedFps[msg.sender][fpsId]) {
                revert OperatorNotAuthorizedForEntity(msg.sender, fpsId);
            }
        }
    }

    function _getEntitlementKey(
        bytes32 beneficiaryRef,
        uint32 period,
        bytes32 commodityId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(beneficiaryRef, period, commodityId));
    }
}

