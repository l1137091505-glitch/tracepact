// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TracePact
/// @notice Anchors a brief, delivery evidence, and result as an immutable timeline.
contract TracePact {
    enum Stage { Missing, Open, EvidenceAttached, Closed }

    struct Pact {
        address author;
        bytes32 briefHash;
        bytes32 evidenceHash;
        bytes32 resultHash;
        uint64 openedAt;
        uint64 evidenceAt;
        uint64 closedAt;
        Stage stage;
    }

    uint256 public pactCount;
    mapping(uint256 => Pact) private pacts;

    event PactOpened(uint256 indexed pactId, address indexed author, bytes32 indexed briefHash, uint64 openedAt);
    event EvidenceAttached(uint256 indexed pactId, bytes32 indexed evidenceHash, uint64 evidenceAt);
    event PactClosed(uint256 indexed pactId, bytes32 indexed resultHash, uint64 closedAt);

    error UnknownPact();
    error NotAuthor();
    error InvalidStage();
    error EmptyHash();

    modifier onlyAuthor(uint256 pactId) {
        Pact storage pact = pacts[pactId];
        if (pact.stage == Stage.Missing) revert UnknownPact();
        if (pact.author != msg.sender) revert NotAuthor();
        _;
    }

    function openPact(bytes32 briefHash) external returns (uint256 pactId) {
        if (briefHash == bytes32(0)) revert EmptyHash();
        pactId = ++pactCount;
        uint64 timestamp = uint64(block.timestamp);
        pacts[pactId] = Pact({
            author: msg.sender,
            briefHash: briefHash,
            evidenceHash: bytes32(0),
            resultHash: bytes32(0),
            openedAt: timestamp,
            evidenceAt: 0,
            closedAt: 0,
            stage: Stage.Open
        });
        emit PactOpened(pactId, msg.sender, briefHash, timestamp);
    }

    function attachEvidence(uint256 pactId, bytes32 evidenceHash) external onlyAuthor(pactId) {
        if (evidenceHash == bytes32(0)) revert EmptyHash();
        Pact storage pact = pacts[pactId];
        if (pact.stage != Stage.Open) revert InvalidStage();
        uint64 timestamp = uint64(block.timestamp);
        pact.evidenceHash = evidenceHash;
        pact.evidenceAt = timestamp;
        pact.stage = Stage.EvidenceAttached;
        emit EvidenceAttached(pactId, evidenceHash, timestamp);
    }

    function closePact(uint256 pactId, bytes32 resultHash) external onlyAuthor(pactId) {
        if (resultHash == bytes32(0)) revert EmptyHash();
        Pact storage pact = pacts[pactId];
        if (pact.stage != Stage.EvidenceAttached) revert InvalidStage();
        uint64 timestamp = uint64(block.timestamp);
        pact.resultHash = resultHash;
        pact.closedAt = timestamp;
        pact.stage = Stage.Closed;
        emit PactClosed(pactId, resultHash, timestamp);
    }

    function getPact(uint256 pactId) external view returns (Pact memory) {
        Pact memory pact = pacts[pactId];
        if (pact.stage == Stage.Missing) revert UnknownPact();
        return pact;
    }
}

