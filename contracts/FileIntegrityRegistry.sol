// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FileIntegrityRegistry
 * @dev Secure, auditable, and decentralized file integrity, provenance, and authorized update verification system.
 * Designed for BlockSure - Blockchain-Based File Integrity Verification.
 * File contents are NEVER stored on-chain; only cryptographic SHA-256 digests and metadata are recorded.
 */
contract FileIntegrityRegistry {

    // --- Custom Errors ---
    error FileAlreadyExists(string fileId);
    error FileNotFound(string fileId);
    error NotFileOwner(string fileId, address caller, address owner);
    error NotAuthorized(string fileId, address caller);
    error AlreadyCollaborator(string fileId, address collaborator);
    error NotCollaborator(string fileId, address collaborator);
    error CannotAuthorizeSelf();
    error InvalidAddress();
    error InvalidFileId();
    error InvalidHash();
    error IdenticalHash();
    error InvalidVersion(uint256 requestedVersion, uint256 totalVersions);

    // --- Structs ---
    struct VersionRecord {
        uint256 versionNumber;
        bytes32 fileHash;
        string fileName;
        uint256 fileSize;
        uint256 timestamp;
        bytes32 previousHash;
        string metadataNote;
        address updater;
    }

    struct FileRecord {
        string fileId;
        address owner;
        uint256 currentVersion;
        uint256 createdAt;
        bool exists;
    }

    // --- Storage ---
    // fileId => File metadata
    mapping(string => FileRecord) private _files;

    // fileId => (versionNumber => VersionRecord)
    mapping(string => mapping(uint256 => VersionRecord)) private _fileVersions;

    // fileId => (collaboratorAddress => bool)
    mapping(string => mapping(address => bool)) private _fileCollaborators;

    // fileId => list of collaborator addresses
    mapping(string => address[]) private _fileCollaboratorList;

    // Array of all registered file IDs for public indexability
    string[] private _allFileIds;

    // Owner address => list of owned file IDs
    mapping(address => string[]) private _userFileIds;

    // --- Events ---
    event FileRegistered(
        string indexed fileId,
        address indexed owner,
        bytes32 indexed fileHash,
        string fileName,
        uint256 fileSize,
        uint256 timestamp
    );

    event VersionAdded(
        string indexed fileId,
        address indexed updater,
        uint256 versionNumber,
        bytes32 indexed newHash,
        bytes32 previousHash,
        uint256 timestamp
    );

    event FileVersionAdded(
        string indexed fileId,
        address indexed updater,
        uint256 versionNumber,
        bytes32 indexed newHash,
        bytes32 previousHash,
        uint256 timestamp
    );

    event CollaboratorAuthorized(
        string indexed fileId,
        address indexed owner,
        address indexed collaborator,
        uint256 timestamp
    );

    event CollaboratorRevoked(
        string indexed fileId,
        address indexed owner,
        address indexed collaborator,
        uint256 timestamp
    );

    event FileVerificationLogged(
        string indexed fileId,
        address indexed verifier,
        bytes32 computedHash,
        bool isMatch,
        uint256 matchedVersion,
        uint256 timestamp
    );

    // --- Modifiers ---
    modifier onlyFileOwner(string memory fileId) {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }
        if (_files[fileId].owner != msg.sender) {
            revert NotFileOwner(fileId, msg.sender, _files[fileId].owner);
        }
        _;
    }

    modifier onlyAuthorized(string memory fileId) {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }
        if (_files[fileId].owner != msg.sender && !_fileCollaborators[fileId][msg.sender]) {
            revert NotAuthorized(fileId, msg.sender);
        }
        _;
    }

    /**
     * @notice Register the initial version (v1) of a file fingerprint.
     * @param fileId Unique identifier for the file (e.g. UUID, system path, or business document ID).
     * @param fileHash Cryptographic SHA-256 digest of the file represented as bytes32.
     * @param fileName Human-readable original filename.
     * @param fileSize File size in bytes.
     * @param metadataNote Optional note, tag, or classification descriptor.
     */
    function registerFile(
        string memory fileId,
        bytes32 fileHash,
        string memory fileName,
        uint256 fileSize,
        string memory metadataNote
    ) external {
        if (bytes(fileId).length == 0) {
            revert InvalidFileId();
        }
        if (fileHash == bytes32(0)) {
            revert InvalidHash();
        }
        if (_files[fileId].exists) {
            revert FileAlreadyExists(fileId);
        }

        uint256 nowTs = block.timestamp;

        _files[fileId] = FileRecord({
            fileId: fileId,
            owner: msg.sender,
            currentVersion: 1,
            createdAt: nowTs,
            exists: true
        });

        _fileVersions[fileId][1] = VersionRecord({
            versionNumber: 1,
            fileHash: fileHash,
            fileName: fileName,
            fileSize: fileSize,
            timestamp: nowTs,
            previousHash: bytes32(0),
            metadataNote: metadataNote,
            updater: msg.sender
        });

        _allFileIds.push(fileId);
        _userFileIds[msg.sender].push(fileId);

        emit FileRegistered(fileId, msg.sender, fileHash, fileName, fileSize, nowTs);
    }

    /**
     * @notice Register a new version of an existing file while preserving previous versions intact.
     * @dev Restricted to the file owner or an authorized collaborator.
     * @param fileId Unique identifier of the previously registered file.
     * @param newHash Cryptographic SHA-256 digest of the updated file version.
     * @param fileName Updated or current file name.
     * @param fileSize Size of the updated file version.
     * @param metadataNote Optional changelog or reason for version change.
     */
    function registerNewVersion(
        string memory fileId,
        bytes32 newHash,
        string memory fileName,
        uint256 fileSize,
        string memory metadataNote
    ) public onlyAuthorized(fileId) {
        if (newHash == bytes32(0)) {
            revert InvalidHash();
        }

        FileRecord storage file = _files[fileId];
        uint256 latestVer = file.currentVersion;
        bytes32 prevHash = _fileVersions[fileId][latestVer].fileHash;

        if (newHash == prevHash) {
            revert IdenticalHash();
        }

        uint256 nextVer = latestVer + 1;
        uint256 nowTs = block.timestamp;

        file.currentVersion = nextVer;

        _fileVersions[fileId][nextVer] = VersionRecord({
            versionNumber: nextVer,
            fileHash: newHash,
            fileName: fileName,
            fileSize: fileSize,
            timestamp: nowTs,
            previousHash: prevHash,
            metadataNote: metadataNote,
            updater: msg.sender
        });

        emit VersionAdded(fileId, msg.sender, nextVer, newHash, prevHash, nowTs);
        emit FileVersionAdded(fileId, msg.sender, nextVer, newHash, prevHash, nowTs);
    }

    /**
     * @notice Alias for registerNewVersion fulfilling PRD Section 7.2 naming.
     */
    function addVersion(
        string memory fileId,
        bytes32 newHash,
        string memory fileName,
        uint256 fileSize,
        string memory metadataNote
    ) external {
        registerNewVersion(fileId, newHash, fileName, fileSize, metadataNote);
    }

    /**
     * @notice Authorize an external wallet address as a collaborator to register file versions.
     * @dev Restricted to the original file owner.
     * @param fileId The unique file identifier.
     * @param collaborator Address of the collaborator to authorize.
     */
    function authorizeCollaborator(string memory fileId, address collaborator)
        external
        onlyFileOwner(fileId)
    {
        if (collaborator == address(0)) {
            revert InvalidAddress();
        }
        if (collaborator == msg.sender) {
            revert CannotAuthorizeSelf();
        }
        if (_fileCollaborators[fileId][collaborator]) {
            revert AlreadyCollaborator(fileId, collaborator);
        }

        _fileCollaborators[fileId][collaborator] = true;
        _fileCollaboratorList[fileId].push(collaborator);

        emit CollaboratorAuthorized(fileId, msg.sender, collaborator, block.timestamp);
    }

    /**
     * @notice Revoke collaborator update permissions for a file.
     * @dev Restricted to the original file owner.
     * @param fileId The unique file identifier.
     * @param collaborator Address of the collaborator to revoke.
     */
    function revokeCollaborator(string memory fileId, address collaborator)
        external
        onlyFileOwner(fileId)
    {
        if (!_fileCollaborators[fileId][collaborator]) {
            revert NotCollaborator(fileId, collaborator);
        }

        _fileCollaborators[fileId][collaborator] = false;

        // Remove from dynamic list
        address[] storage list = _fileCollaboratorList[fileId];
        uint256 len = list.length;
        for (uint256 i = 0; i < len; i++) {
            if (list[i] == collaborator) {
                list[i] = list[len - 1];
                list.pop();
                break;
            }
        }

        emit CollaboratorRevoked(fileId, msg.sender, collaborator, block.timestamp);
    }

    /**
     * @notice Check whether a given wallet is authorized to update a file.
     * @param fileId Unique identifier of the file.
     * @param wallet Address to check.
     * @return bool True if the wallet is the owner or an active authorized collaborator.
     */
    function isAuthorized(string memory fileId, address wallet)
        external
        view
        returns (bool)
    {
        if (!_files[fileId].exists) {
            return false;
        }
        return (_files[fileId].owner == wallet || _fileCollaborators[fileId][wallet]);
    }

    /**
     * @notice Check whether a given wallet is an authorized collaborator.
     */
    function isCollaborator(string memory fileId, address wallet)
        external
        view
        returns (bool)
    {
        return _fileCollaborators[fileId][wallet];
    }

    /**
     * @notice Get all active collaborators for a file.
     */
    function getCollaborators(string memory fileId)
        external
        view
        returns (address[] memory)
    {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }
        return _fileCollaboratorList[fileId];
    }

    /**
     * @notice Check whether a file is registered.
     */
    function fileExists(string memory fileId) external view returns (bool) {
        return _files[fileId].exists;
    }

    /**
     * @notice Retrieve the total version count for a file.
     */
    function getVersionCount(string memory fileId) external view returns (uint256) {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }
        return _files[fileId].currentVersion;
    }

    /**
     * @notice Retrieve the latest version details and ownership for a given file.
     */
    function getLatestVersion(string memory fileId)
        external
        view
        returns (
            uint256 versionNumber,
            bytes32 fileHash,
            string memory fileName,
            uint256 fileSize,
            uint256 timestamp,
            bytes32 previousHash,
            string memory metadataNote,
            address owner,
            uint256 totalVersions
        )
    {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }

        FileRecord memory file = _files[fileId];
        VersionRecord memory ver = _fileVersions[fileId][file.currentVersion];

        return (
            ver.versionNumber,
            ver.fileHash,
            ver.fileName,
            ver.fileSize,
            ver.timestamp,
            ver.previousHash,
            ver.metadataNote,
            file.owner,
            file.currentVersion
        );
    }

    /**
     * @notice Retrieve file metadata (PRD Section 5: getFile).
     * @param fileId Unique identifier of the file.
     */
    function getFile(string memory fileId)
        external
        view
        returns (
            string memory id,
            address owner,
            uint256 currentVersion,
            uint256 createdAt
        )
    {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }
        FileRecord memory f = _files[fileId];
        return (f.fileId, f.owner, f.currentVersion, f.createdAt);
    }

    /**
     * @notice Retrieve a specific historical version of a file.
     */
    function getFileVersion(string memory fileId, uint256 versionNumber)
        public
        view
        returns (VersionRecord memory)
    {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }
        if (versionNumber == 0 || versionNumber > _files[fileId].currentVersion) {
            revert InvalidVersion(versionNumber, _files[fileId].currentVersion);
        }

        return _fileVersions[fileId][versionNumber];
    }

    /**
     * @notice Retrieve a specific version (PRD Section 5: getVersion alias for getFileVersion).
     */
    function getVersion(string memory fileId, uint256 versionNumber)
        external
        view
        returns (VersionRecord memory)
    {
        return getFileVersion(fileId, versionNumber);
    }

    /**
     * @notice Retrieve full version lineage for a file.
     */
    function getFileHistory(string memory fileId)
        external
        view
        returns (VersionRecord[] memory history)
    {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }

        uint256 count = _files[fileId].currentVersion;
        history = new VersionRecord[](count);

        for (uint256 i = 1; i <= count; i++) {
            history[i - 1] = _fileVersions[fileId][i];
        }

        return history;
    }

    /**
     * @notice Verify a computed hash against the registered file on-chain.
     * @param fileId Unique identifier of the file.
     * @param computedHash The SHA-256 hash computed locally by the client.
     * @return isMatch True if computedHash matches the current latest version.
     * @return matchedVersion Version number matched (0 if no version matches).
     * @return latestVersion The latest version number recorded for this file.
     * @return latestHash The current registered SHA-256 hash on-chain.
     * @return owner The registered owner of the file.
     * @return timestamp Timestamp when the latest version was recorded.
     */
    function verifyHash(string memory fileId, bytes32 computedHash)
        external
        view
        returns (
            bool isMatch,
            uint256 matchedVersion,
            uint256 latestVersion,
            bytes32 latestHash,
            address owner,
            uint256 timestamp
        )
    {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }

        FileRecord memory file = _files[fileId];
        uint256 curVer = file.currentVersion;
        VersionRecord memory latestVer = _fileVersions[fileId][curVer];

        latestHash = latestVer.fileHash;
        latestVersion = curVer;
        owner = file.owner;
        timestamp = latestVer.timestamp;

        // Check latest version first
        if (computedHash == latestHash) {
            return (true, curVer, latestVersion, latestHash, owner, timestamp);
        }

        // Check if it matches any older version (legitimate historical version)
        for (uint256 v = 1; v < curVer; v++) {
            if (_fileVersions[fileId][v].fileHash == computedHash) {
                return (false, v, latestVersion, latestHash, owner, timestamp);
            }
        }

        // No match found -> Tampered or modified
        return (false, 0, latestVersion, latestHash, owner, timestamp);
    }

    /**
     * @notice Optional on-chain verification logging for audit trails.
     * Emits a verifiable event on the blockchain with the verification outcome.
     */
    function logVerification(string memory fileId, bytes32 computedHash)
        external
        returns (bool isMatch, uint256 matchedVersion)
    {
        if (!_files[fileId].exists) {
            revert FileNotFound(fileId);
        }

        FileRecord memory file = _files[fileId];
        uint256 curVer = file.currentVersion;

        if (computedHash == _fileVersions[fileId][curVer].fileHash) {
            isMatch = true;
            matchedVersion = curVer;
        } else {
            isMatch = false;
            for (uint256 v = 1; v < curVer; v++) {
                if (_fileVersions[fileId][v].fileHash == computedHash) {
                    matchedVersion = v;
                    break;
                }
            }
        }

        emit FileVerificationLogged(
            fileId,
            msg.sender,
            computedHash,
            isMatch,
            matchedVersion,
            block.timestamp
        );

        return (isMatch, matchedVersion);
    }

    /**
     * @notice Get all file IDs registered by a specific user.
     */
    function getUserFiles(address user) external view returns (string[] memory) {
        return _userFileIds[user];
    }

    /**
     * @notice Get total count of registered files.
     */
    function getTotalFileCount() external view returns (uint256) {
        return _allFileIds.length;
    }

    /**
     * @notice Paginated access to all registered file IDs.
     */
    function getAllFiles(uint256 offset, uint256 limit)
        external
        view
        returns (string[] memory files, uint256 total)
    {
        total = _allFileIds.length;
        if (offset >= total) {
            return (new string[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 size = end - offset;
        files = new string[](size);
        for (uint256 i = 0; i < size; i++) {
            files[i] = _allFileIds[offset + i];
        }

        return (files, total);
    }
}
