// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FoundationSmokeAnchor
 * @notice Minimal Phase 1 foundation smoke-test contract for PDSChain v2.
 * @dev Used strictly to verify Solidity compilation, OpenZeppelin dependency resolution,
 *      local Hardhat deployment, and state-changing transaction receipt verification in Phase 1.
 *      Production PDSChain domain contracts belong to Phase 3.
 */
contract FoundationSmokeAnchor is Ownable {
    struct SmokeRecord {
        uint256 sequence;
        bytes32 checkHash;
        address recordedBy;
        uint64 recordedAt;
        string note;
    }

    string public constant FOUNDATION_PHASE = "PHASE_1_FOUNDATION";
    uint256 private _checkCount;
    mapping(uint256 => SmokeRecord) private _records;

    error InvalidCheckHash();
    error EmptySmokeNote();
    error SmokeSequenceNotFound(uint256 sequence);

    event SmokeCheckRecorded(
        uint256 indexed sequence,
        bytes32 indexed checkHash,
        address indexed recordedBy,
        string note,
        uint64 timestamp
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Records a local foundation smoke-check entry on-chain.
     * @param checkHash Non-zero 32-byte digest identifying the smoke check.
     * @param note Human-readable description of the smoke check.
     * @return sequence The 1-indexed sequence number assigned to the record.
     */
    function recordSmokeCheck(
        bytes32 checkHash,
        string calldata note
    ) external onlyOwner returns (uint256 sequence) {
        if (checkHash == bytes32(0)) {
            revert InvalidCheckHash();
        }
        if (bytes(note).length == 0) {
            revert EmptySmokeNote();
        }

        unchecked {
            sequence = ++_checkCount;
        }

        uint64 currentTimestamp = uint64(block.timestamp);
        _records[sequence] = SmokeRecord({
            sequence: sequence,
            checkHash: checkHash,
            recordedBy: msg.sender,
            recordedAt: currentTimestamp,
            note: note
        });

        emit SmokeCheckRecorded(sequence, checkHash, msg.sender, note, currentTimestamp);
    }

    /**
     * @notice Returns the total number of smoke checks recorded.
     */
    function checkCount() external view returns (uint256) {
        return _checkCount;
    }

    /**
     * @notice Retrieves a smoke-check record by its 1-indexed sequence number.
     */
    function getSmokeRecord(uint256 sequence) external view returns (SmokeRecord memory) {
        if (sequence == 0 || sequence > _checkCount) {
            revert SmokeSequenceNotFound(sequence);
        }
        return _records[sequence];
    }
}

