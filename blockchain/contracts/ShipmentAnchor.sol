// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ShipmentAnchor {
    uint8 public constant RECORD_TYPE_EVENT = 1;
    uint8 public constant RECORD_TYPE_IMPORTER_DOCUMENT = 2;
    uint8 public constant RECORD_TYPE_SELLER_DOCUMENT = 3;

    struct AnchorRecord {
        bytes32 shipmentKey;
        bytes32 previousHash;
        uint8 recordType;
        address anchoredBy;
        uint256 anchoredAt;
    }

    address public owner;

    mapping(bytes32 => AnchorRecord) private records;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RecordAnchored(
        bytes32 indexed shipmentKey,
        bytes32 indexed recordHash,
        bytes32 previousHash,
        uint8 recordType,
        address anchoredBy,
        uint256 anchoredAt
    );

    error NotOwner();
    error InvalidOwner();
    error InvalidShipmentKey();
    error InvalidRecordHash();
    error InvalidRecordType();
    error RecordAlreadyAnchored(bytes32 recordHash);
    error RecordNotAnchored(bytes32 recordHash);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function anchorRecord(
        bytes32 shipmentKey,
        bytes32 recordHash,
        bytes32 previousHash,
        uint8 recordType
    ) external onlyOwner {
        if (shipmentKey == bytes32(0)) revert InvalidShipmentKey();
        if (recordHash == bytes32(0)) revert InvalidRecordHash();
        if (!_isValidRecordType(recordType)) revert InvalidRecordType();
        if (records[recordHash].anchoredAt != 0) revert RecordAlreadyAnchored(recordHash);

        uint256 anchoredAt = block.timestamp;
        records[recordHash] = AnchorRecord({
            shipmentKey: shipmentKey,
            previousHash: previousHash,
            recordType: recordType,
            anchoredBy: msg.sender,
            anchoredAt: anchoredAt
        });

        emit RecordAnchored(shipmentKey, recordHash, previousHash, recordType, msg.sender, anchoredAt);
    }

    function isAnchored(bytes32 recordHash) external view returns (bool) {
        return records[recordHash].anchoredAt != 0;
    }

    function getRecord(bytes32 recordHash) external view returns (AnchorRecord memory) {
        AnchorRecord memory record = records[recordHash];
        if (record.anchoredAt == 0) revert RecordNotAnchored(recordHash);
        return record;
    }

    function _isValidRecordType(uint8 recordType) private pure returns (bool) {
        return recordType == RECORD_TYPE_EVENT ||
            recordType == RECORD_TYPE_IMPORTER_DOCUMENT ||
            recordType == RECORD_TYPE_SELLER_DOCUMENT;
    }
}
