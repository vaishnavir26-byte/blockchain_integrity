# BlockSure — Blockchain-Based Intelligent File Integrity, Provenance and Authorized Update Verification System

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22.18-yellow.svg)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Netlify Status](https://img.shields.io/badge/Netlify-Live%20Demo-00C7B7.svg)](https://singular-tartufo-502127.netlify.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-black.svg)](https://github.com/vaishnavir26-byte/blockchain_integrity)

> 🚀 **Live Production Application:** [https://singular-tartufo-502127.netlify.app](https://singular-tartufo-502127.netlify.app)  
> 📦 **GitHub Repository:** [https://github.com/vaishnavir26-byte/blockchain_integrity](https://github.com/vaishnavir26-byte/blockchain_integrity)

---

## 1. Executive Summary

**BlockSure** is a full-stack Web3 application designed to guarantee cryptographic file integrity, auditable version tracking, and authorized update control on an EVM blockchain.

### Core Problems Addressed
1. **Silent File Alteration & Corruption**: Modifying a document without the recipient knowing.
2. **Centralized Log Modification**: Traditional database logs can be silently rewritten by administrative users.
3. **Unauthorized Version Overwrites**: Unauthorized third parties tampering with digital records.

### The BlockSure Solution
- **SHA-256 Client-Side Hashing**: Exact byte hashing inside the browser via the W3C Web Crypto API (`crypto.subtle.digest`). Raw file contents **never** leave the client device or travel over the network.
- **On-Chain Root of Trust**: Fixed 32-byte (`bytes32`) digests, owner addresses, and timestamps recorded on-chain.
- **Strict Role-Based Smart Contract Permissions**: Version updates are strictly restricted to the file owner or explicitly authorized collaborator wallets.
- **Cryptographic Version Lineage**: Historical versions are preserved immutably with linked `previousHash` pointers.
- **Zero-Byte Tampering Alerts**: Instant side-by-side comparison of local vs. on-chain fingerprints.
- **Verifiable Audit Trail**: On-chain emitted event logs tracking every registration, version update, access grant, and verification.
- **Verified Off-Chain Recovery**: Backups stored locally and cryptographically verified against the smart contract before restoration.

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSER                                    |
|                                                                                   |
|  +-------------------+       +-----------------------+     +-------------------+  |
|  |   Selected File   | ----> | Browser Web Crypto    | --> | SHA-256 Digest    |  |
|  |  (Off-Chain File) |       | API (SubtleCrypto)    |     | (32-byte bytes32) |  |
|  +-------------------+       +-----------------------+     +-------------------+  |
|                                                                      |            |
+----------------------------------------------------------------------|------------+
                                                                       |
                            JSON-RPC / MetaMask Provider (EIP-1193)    v
+-----------------------------------------------------------------------------------+
|                              ETHEREUM BLOCKCHAIN                                  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                       FileIntegrityRegistry.sol                             |  |
|  |                                                                             |  |
|  |  * registerFile(fileId, hash, name, size, note)        -> Initial v1        |  |
|  |  * addVersion / registerNewVersion(fileId, newHash...)  -> Owner/Collab Only |  |
|  |  * authorizeCollaborator(fileId, collaborator)         -> Owner Only        |  |
|  |  * revokeCollaborator(fileId, collaborator)            -> Owner Only        |  |
|  |  * getFile(fileId)                                     -> Metadata          |  |
|  |  * getVersion(fileId, versionNumber)                   -> Version Record    |  |
|  |  * getVersionCount(fileId)                             -> Version Count     |  |
|  |  * isAuthorized(fileId, wallet)                        -> Access Check      |  |
|  |  * verifyHash(fileId, computedHash)                    -> O(1) Gas-Free     |  |
|  |  * getFileHistory(fileId)                              -> Full Lineage      |  |
|  |  * logVerification(fileId, computedHash)               -> Audit Event       |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Smart Contract Design (`FileIntegrityRegistry.sol`)

### 3.1 Data Structures
```solidity
struct VersionRecord {
    uint256 versionNumber;   // Incremental version counter (1, 2, 3...)
    bytes32 fileHash;        // SHA-256 digest of this version
    string fileName;         // Original file name
    uint256 fileSize;        // Size in bytes
    uint256 timestamp;       // Block timestamp
    bytes32 previousHash;    // Hash of (v - 1); bytes32(0) for v1
    string metadataNote;     // Changelog / description
    address updater;         // Registering wallet for this version
}

struct FileRecord {
    string fileId;           // Unique identifier key
    address owner;           // Registrant wallet address
    uint256 currentVersion;  // Latest version number
    uint256 createdAt;       // Timestamp of v1 registration
    bool exists;             // Existence sentinel
}
```

### 3.2 Access Control Invariants
- `onlyFileOwner(fileId)`: Restricts administrative functions (`authorizeCollaborator`, `revokeCollaborator`) strictly to the original registrant.
- `onlyAuthorized(fileId)`: Ensures version additions (`registerNewVersion`) can only be executed by the file owner or an active authorized collaborator address. All other callers revert on-chain with `NotAuthorized`.

### 3.3 Verification Outcomes
`verifyHash(fileId, computedHash)` classifies the result into:
- **`VERIFIED` (`isMatch = true, matchedVersion = currentVersion`)**: Exact match with current active version.
- **`LEGITIMATE_HISTORICAL_VERSION` (`isMatch = false, matchedVersion > 0`)**: Legitimate older version that has been superseded by a newer version.
- **`MODIFIED / TAMPERED` (`isMatch = false, matchedVersion = 0`)**: The file has been altered, corrupted, or forged.
- **`NOT_REGISTERED`**: File identifier does not exist on-chain.

---

## 4. Project Structure

```
blocksure/
├── contracts/
│   └── FileIntegrityRegistry.sol        # Core smart contract with RBAC & lineage
├── test/
│   └── FileIntegrityRegistry.test.js    # Hardhat test suite (33 passing tests including PRD v2.0 10-Point Suite)
├── scripts/
│   ├── deploy.js                        # Deployment and ABI export script
│   └── update_abi.cjs                   # ABI synchronization utility
├── sample_files/
│   ├── document_v1.txt                  # Original specification file
│   ├── document_v1_tampered.txt         # 1-sentence modified copy (triggers tamper alert)
│   └── document_v2.txt                  # Authorized version 2 amendment
├── frontend/
│   ├── index.html                       # HTML5 entrypoint
│   ├── vite.config.ts                   # Vite configuration
│   ├── tailwind.config.js               # Cybersecurity-themed styling
│   └── src/
│       ├── main.tsx                     # React root mount
│       ├── App.tsx                      # View container & wallet state router
│       ├── utils/
│       │   └── crypto.ts                # Web Crypto SHA-256 & byte helpers
│       ├── services/
│       │   └── contract.ts              # Ethers.js integration & error decoding
│       ├── contracts/
│       │   ├── contractInfo.json        # Deployed address & ABI
│       │   └── FileIntegrityRegistry.json
│       └── components/
│           ├── Navbar.tsx               # Header, wallet status, network pill
│           ├── Dashboard.tsx            # Metrics, system overview, quick links
│           ├── RegisterFile.tsx         # File picker, live hash, v1 / v2 registration
│           ├── VerifyFile.tsx           # Verification, tamper alerts, copy digests
│           ├── VersionHistory.tsx       # Lineage timeline & previousHash linkage
│           ├── AccessManagement.tsx     # Collaborator authorization & revocation
│           ├── AuditTrail.tsx           # Verifiable on-chain event stream
│           ├── BackupRecovery.tsx       # Cryptographically verified off-chain restore
│           └── PerformanceBenchmark.tsx # Live throughput & latency benchmarks
├── hardhat.config.js                    # Hardhat configuration
└── package.json                         # Project metadata
```

---

## 5. Getting Started & Reproducing the Demo

### Prerequisites
- **Node.js**: v18 or higher (tested on Node.js v24)
- **MetaMask** browser extension (optional; local node account fallback included)

### 5.1 Run Automated Smart Contract Tests
Execute the comprehensive test suite validating access control, duplicate prevention, hash comparison, collaborator authorization, and lineage:
```cmd
npx hardhat test
```
**Output:**
```
  FileIntegrityRegistry Contract
    File Registration (FR-02)
      √ should successfully register an initial file version (106ms)
      √ should reject registration with empty file ID (75ms)
      √ should reject registration with zero hash
      √ should reject duplicate registration for the same file ID (41ms)
    Collaborator Authorization & Access Control (FR-05)
      √ should allow owner to authorize a collaborator (67ms)
      √ should reject non-owner attempting to authorize a collaborator
      √ should reject authorizing address zero
      √ should reject authorizing the owner themselves
      √ should reject duplicate collaborator authorization
      √ should allow owner to revoke a collaborator (57ms)
      √ should reject revoking a non-collaborator (59ms)
    Authorized File Updates & Lineage (FR-04, FR-06)
      √ should allow the file owner to register a new version (60ms)
      √ should allow an authorized collaborator to register a new version (69ms)
      √ should reject version update from revoked collaborator (64ms)
      √ should reject version registration by an unauthorized stranger
      √ should reject new version with identical hash to current
      √ should preserve full version history and previousHash pointers (352ms)
    File Integrity Verification & Tamper Detection (FR-03, FR-07)
      √ should confirm VERIFIED status when hash matches the latest version (89ms)
      √ should detect legitimate older version (isMatch false, matchedVersion > 0)
      √ should detect TAMPERED / MODIFIED file when hash does not match any version (72ms)
      √ should revert if verifying a nonexistent file
      √ should successfully log verification event on-chain for audit trail (102ms)
    User & General Queries (FR-08)
      √ should track user files and global files list correctly (61ms)
    PRD v2.0 Explicit 10-Point Verification Suite
      √ 1. Register a new file successfully and verify metadata via getFile() and VersionAdded event (41ms)
      √ 2. Verify the original file successfully (VERIFIED status)
      √ 3. Detect a modified file (TAMPERING DETECTED status)
      √ 4. Confirm that renaming alone does not change the fingerprint
      √ 5. Register a new authorized version emitting VersionAdded event (57ms)
      √ 6. Reject an unauthorized update
      √ 7. Revoke a collaborator and reject subsequent updates from that wallet (44ms)
      √ 8. Retrieve earlier versions without losing historical records (45ms)
      √ 9. Handle rejected transactions and disconnected wallets
      √ 10. Display accurate blockchain transaction information with gas benchmarks

  33 passing (3s)
```

### 5.2 Start Local Blockchain Node & Deploy Contract
```cmd
# Terminal 1: Start local Hardhat EVM node
npx hardhat node

# Terminal 2: Deploy contract to local network
npx hardhat run scripts/deploy.js --network localhost
```

### 5.3 Launch Frontend Application
```cmd
cd frontend
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 6. End-to-End Demonstration Walkthrough

1. **Connect Wallet:** Click **Connect Wallet** in the top-right header or use the pre-configured local node account.
2. **Register Initial Version (v1):**
   - Navigate to **Register File**.
   - Select `sample_files/document_v1.txt`.
   - The browser automatically calculates the SHA-256 fingerprint in real-time.
   - Enter File ID `SPEC-SEC-2026` and description `Initial specification v1.0`.
   - Click **Sign & Register Initial Version (v1)** and approve transaction.
3. **Verify the Unchanged File:**
   - Navigate to **Verify Integrity**.
   - Select or enter File ID `SPEC-SEC-2026` and choose `sample_files/document_v1.txt`.
   - Click **Verify Hash with Blockchain**.
   - **Result:** High-contrast green **VERIFIED • 100% INTEGRITY MATCH** banner appears.
4. **Detect File Tampering:**
   - On **Verify Integrity**, choose `sample_files/document_v1_tampered.txt`.
   - Click **Verify Hash with Blockchain**.
   - **Result:** Red flashing **CRITICAL TAMPERING DETECTED • Hash Mismatch Alert** is triggered with side-by-side cryptographic digest diff.
5. **Manage Collaborator Access (FR-05):**
   - Navigate to **Access Control**.
   - Input File ID `SPEC-SEC-2026`.
   - Authorize a collaborator address (e.g. `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).
   - The collaborator is immediately listed with active update privileges.
6. **Register Authorized Version (v2):**
   - Return to **Register File** and toggle mode to **New Version (v+1)**.
   - Select File ID `SPEC-SEC-2026` and choose `sample_files/document_v2.txt`.
   - Click **Sign & Register New Version (v+1)**.
7. **Inspect Cryptographic Lineage (FR-06):**
   - Open **Version Lineage** and lookup `SPEC-SEC-2026`.
   - The timeline renders Version 1 (superseded) linked to Version 2 (active) with previous hash pointers and updater wallet addresses.
8. **Inspect Verifiable Audit Trail (FR-07):**
   - Open **Audit Trail** to view all chronological on-chain event emissions with block numbers, transaction hashes, and filters.
9. **Off-Chain Backup & Verified Recovery (FR-09):**
   - Open **Backup & Recovery** to save an off-chain copy and perform verified restoration.
10. **Run Empirical Performance Benchmarks:**
    - Go to **Performance Lab** and click **Run Empirical Tests** to measure hashing throughput (MB/s) and EVM transaction gas costs.

---

## 7. Performance & Evaluation Metrics

| Metric | Measured Value | Standard / Research Note |
| :--- | :--- | :--- |
| **SHA-256 Hashing Throughput** | ~210 – 240 MB/s | Browser Web Crypto hardware acceleration |
| **Initial Registration Gas** | ~142,380 gas | Constant cost $O(1)$ irrespective of file size |
| **New Version Registration Gas** | ~88,400 gas | Efficient state expansion on existing record |
| **Collaborator Authorization Gas** | ~48,200 gas | Role-based mapping and list update |
| **Verification Query Gas** | **0 gas** (free) | Handled by read-only `view` function |
| **Verification Query Latency** | ~12 – 18 ms | Local EVM JSON-RPC round-trip |
| **Modification Detection Rate** | **100%** | Any single bit flip yields completely different SHA-256 |

---

## 8. License & Attribution
Developed as an engineering project demonstration for decentralized file integrity verification. Released under the MIT License.
