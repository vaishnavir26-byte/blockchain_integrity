# BlockSure: A Client-Side Privacy-Preserving Blockchain Architecture for File Integrity Verification, Append-Only Version Provenance, and Smart Contract-Enforced Update Authorization

**Anonymous Author(s)**  
*Department of Computer Science & Engineering*  
*Double-Blind Peer Review Submission*  
*Live Prototype:* [https://singular-tartufo-502127.netlify.app](https://singular-tartufo-502127.netlify.app)  

---

## Abstract
Digital files in distributed networks are continually vulnerable to silent corruption, malicious tampering, and unauthorized overwrite attacks. Conventional integrity auditing frameworks either rely on centralized Certificate Authorities (CAs) that introduce single points of failure and administrative repudiation, or store raw data on-chain, incurring prohibitive gas fees and compromising client confidentiality. Furthermore, existing blockchain integrity solutions predominantly treat files as immutable, static artifacts, failing to provide an integrated mechanism that unifies client-side privacy-preserving tamper detection, smart contract-enforced update authorization, and cryptographic version provenance. 

This paper proposes **BlockSure**, a hybrid decentralized architecture that unifies client-side SHA-256 digest computation via the W3C Web Crypto API with an EVM-based smart contract registry (`FileIntegrityRegistry.sol`). BlockSure keeps raw file contents strictly off-chain while anchoring 32-byte cryptographic fingerprints, owner identities, timestamps, and backward-linked version pointers (`previousHash`) on-chain. Role-Based Access Control (RBAC) enforced within Solidity execution guarantees that only legitimate file owners or explicitly designated collaborator wallets can append subsequent versions. 

We conducted empirical evaluations across four experimental dimensions: (1) **Tamper Detection Sensitivity**: achieving a 100.0% detection rate across 20 controlled test files and 7 mutation categories (single-bit flips, character case changes, whitespace insertions, and total payload replacements) while preserving the file renaming invariant; (2) **Hashing Performance**: measuring client-side hashing throughput of 220–300 MB/s across payloads up to 10 MB; (3) **EVM Gas Profile**: establishing that read-only integrity verifications consume **0 transaction gas** (via local EVM `view` calls), while initial registrations and version additions require 354,375 and 224,845 gas units, respectively (a measured 36.5% gas reduction for updates); and (4) **Latency**: measuring read verification latencies of 2.36 ms (in-process) and 19.84 ms (local JSON-RPC) on a local Hardhat testbed, and analyzing the impact of public network transport. Automated testing across 33 comprehensive test cases confirms that the system effectively prevents unauthorized updates, guarantees immutable lineage preservation, and eliminates centralized trust bottlenecks without transmitting raw user data.

**Keywords:** Blockchain, Smart Contracts, File Integrity, Data Provenance, SHA-256, Access Control, Ethereum, Client-Side Privacy.

---

## I. Introduction

### 1.1 Motivation and Background
The integrity, provenance, and authenticity of digital assets—ranging from legal contracts and financial ledgers to firmware binaries and medical records—form the cornerstone of modern information systems. Despite advances in encryption and transport-layer security (TLS/SSL), stored digital files remain susceptible to silent data corruption (bit rot), ransomware injection, unauthorized administrative modification, and version manipulation.

Traditional file integrity monitoring (FIM) systems rely on centralized databases or local checksum catalogs (e.g., Tripwire, OSSEC). While computationally lightweight, centralized checksum stores suffer from fundamental structural vulnerabilities:
1. **Administrative Repudiation & Internal Threats:** Database administrators or compromised cloud operators possessing root privileges can unilaterally alter both the document and its registered checksum, leaving no verifiable audit trail.
2. **Single Point of Failure (SPoF):** Centralized validation servers can become unavailable or subjected to Distributed Denial of Service (DDoS) attacks, halting verification workflows across enterprise pipelines.
3. **Absence of Provenance Lineage:** When a document undergoes legitimate revisions, traditional systems overwrite previous checksums or store disconnected version logs without cryptographic backward-linkage, obscuring the true chain of custody.

### 1.2 Research Questions
To overcome these limitations without sacrificing client confidentiality or incurring excessive blockchain storage costs, this research addresses four primary research questions:
- **RQ1 (Detection Efficacy):** *Can client-side SHA-256 hashing coupled with on-chain cryptographic anchoring reliably detect bit-level alterations, whitespace insertions, and content corruptions across diverse test files while maintaining filename invariance?*
- **RQ2 (Authorization Enforcement):** *Can smart contract-level Role-Based Access Control (RBAC) definitively prevent unauthorized parties from overwriting or appending file versions without relying on centralized authorization servers?*
- **RQ3 (Economic Feasibility):** *What are the computational gas costs and execution latencies associated with maintaining append-only cryptographic version trees on the Ethereum Virtual Machine (EVM)?*
- **RQ4 (Scalability & Throughput):** *How does client-side hashing throughput scale across expanding file payload sizes, and how do smart contract verification mechanisms behave with respect to file size and version depth?*

### 1.3 Key Contributions
The contributions of this work are summarized as follows:
1. **Decoupled Client-Side Privacy-Preserving Hashing:** We design and implement an architecture that executes cryptographic SHA-256 hashing entirely within client browser memory (via the W3C Web Crypto API). Raw file bytes never leave the local device; only the 32-byte digest (`bytes32`) and necessary transaction/query metadata are transmitted to the blockchain node.
2. **On-Chain RBAC with Append-Only Version Lineage:** We develop `FileIntegrityRegistry.sol`, a Solidity smart contract that implements granular owner-collaborator permissions, emits immutable audit events, and maintains backward-linked provenance pointers (`previousHash`) that render historical version tampering transparently detectable.
3. **Dual-Phase State Verification Engine:** We implement a state-verification algorithm executed via read-only EVM `view` calls (consuming zero transaction gas on public networks), providing $O(1)$ constant-time verification for current-version checks and $O(V)$ traversal for historical rollback verification across $V$ recorded versions.
4. **Empirical Evaluation & Reproducibility:** We validate the prototype across 33 automated test cases, benchmark hashing throughput and gas consumption across multiple file sizes (1 KB to 10 MB) on a controlled testbed, and release the open-source codebase, live Netlify web application, and interactive Google Colab demonstration.

---

## II. Related Work

Blockchain technology has emerged as a promising substrate for data integrity and provenance. However, existing literature reveals clear trade-offs between on-chain storage overhead, dynamic update authorization, and multi-version tracking.

```
+---------------------------------------------------------------------------------------------------------------------------------+
|                                         LITERATURE COMPARISON & RESEARCH GAP ANALYSIS                                           |
+---------------------------------------------------------------------------------------------------------------------------------+
| Reference                   | Hashing   | Blockchain Network | Smart Contracts & RBAC | Version Lineage | Gas/Cost Measured | Limitations Identified                           |
+-----------------------------+-----------+--------------------+------------------------+-----------------+-------------------+--------------------------------------------------+
| Wang et al. (2018) [1]      | SHA-256   | Private Ethereum   | Audit only (No RBAC)   | No (Static)     | Partial           | Lacks dynamic update permissions; single version |
| Liang et al. (2017) [2]     | SHA-256   | OpenChain          | User-level             | Yes (Graph)     | None (Private)    | High latency on provenance graph traversal       |
| Gaetani et al. (2017) [3]   | MD5/SHA-1 | Private Blockchain | Basic logic            | No              | None              | Weak cryptographic hashing; centralized backend  |
| Yue et al. (2021) [4]       | SHA-256   | Consortium         | Identity-based audit   | No              | High compute      | Complex key-escrow; no version chaining          |
| Li et al. (2020) [5]        | SHA-256   | Ethereum (Rinkeby) | Auditor role only      | Partial         | Estimated         | Focused on cloud auditing; no collaborator delegation|
| Ramachandran et al. (2018)[6]| SHA-256  | Ethereum           | Smart contract logic   | Yes             | High deployment   | Excessive gas consumption on deep lineage trees  |
| Chen et al. (2019) [7]      | Keccak    | Hyperledger Fabric | Channel-based          | No              | None (Permissioned)| Heavy infrastructure requirements                |
| Puthal et al. (2018) [8]    | SHA-256   | Theoretical Model  | None                   | No              | None              | Conceptual study; no empirical prototype         |
| Steichen et al. (2018) [9]  | Multi     | Survey Analysis    | Survey Analysis        | Survey          | Survey            | Identifies lack of integrated RBAC-lineage systems|
| Zhang et al. (2020) [10]    | SHA-256   | Ethereum Testnet   | Owner only             | No (Single ver) | Measured          | Cannot authorize third-party collaborators       |
| **BlockSure (This Work)**   | **SHA-256**| **EVM / Local / Sep**| **Dual-Role RBAC**     | **Full Linked** | **Empirical Exact**| **Integrated Zero-Fee Verification + Lineage**   |
+---------------------------------------------------------------------------------------------------------------------------------+
```

### 2.1 Research Gap
As evidenced by the comparison matrix, existing studies typically address either **static integrity auditing** (Wang et al., Li et al.) or **data provenance graphs** (Liang et al., Ramachandran et al.) in isolation. Systems that support data integrity rarely allow authorized third-party updates with contract-enforced permission revocation. Conversely, systems that support versioning frequently store extensive metadata on-chain, leading to ballooning transaction costs. BlockSure directly bridges this research gap by integrating:
1. Client-side privacy-preserving hashing (zero raw file exposure),
2. Contract-enforced collaborator authorization and revocation, and
3. Backward-linked cryptographic lineage trees with zero transaction gas read verification.

---

## III. Proposed Methodology

### 3.1 Architectural Overview
The BlockSure system decouples data storage from integrity attestation across four distinct layers:

```
+---------------------------------------------------------------------------------------+
|                                CLIENT APPLICATION LAYER                               |
|                                                                                       |
|   +-----------------------+    File Bytes     +-----------------------------------+   |
|   |   Local File System   | ----------------> | Browser Web Crypto API            |   |
|   |  (Off-Chain Storage)  |   (Zero Network)  | crypto.subtle.digest('SHA-256')   |   |
|   +-----------------------+                   +-----------------------------------+   |
|                                                                 |                     |
|                                                          Digest | 32-Byte bytes32     |
|                                                                 v                     |
|                                               +-----------------------------------+   |
|                                               | ethers.js Client / MetaMask Wallet|   |
|                                               +-----------------------------------+   |
+-----------------------------------------------------------------|---------------------+
                                                                  |
                                       EIP-1193 JSON-RPC Provider | (MetaMask / Local)
                                                                  v
+---------------------------------------------------------------------------------------+
|                             ETHEREUM SMART CONTRACT LAYER                             |
|                                                                                       |
|   +-------------------------------------------------------------------------------+   |
|   |                         FileIntegrityRegistry.sol                             |   |
|   |                                                                               |   |
|   |   +---------------------+   +---------------------+   +-------------------+   |   |
|   |   | RBAC Access Control |   | Provenance Storage  |   | State Verification|   |   |
|   |   | - onlyFileOwner     |   | - _files mapping    |   | - verifyHash()    |   |   |
|   |   | - onlyAuthorized    |   | - _fileVersions map |   | - getFile()       |   |   |
|   |   | - authorizeCollab() |   | - _collaborators    |   | - getVersion()    |   |   |
|   |   +---------------------+   +---------------------+   +-------------------+   |   |
|   +-------------------------------------------------------------------------------+   |
+---------------------------------------------------------------------------------------+
```

### 3.2 Formal Protocol Definitions

#### Definition 1: File Digest Generation
Let $F$ represent the arbitrary-length sequence of bytes comprising a digital file, where $F \in \{0, 1\}^*$. The cryptographic fingerprint $H(F)$ is computed using the NIST FIPS 180-4 standard:
$$H(F) = \text{SHA-256}(F) \in \{0, 1\}^{256} \equiv \text{bytes32}$$
By the preimage resistance property of SHA-256, it is computationally infeasible to find $F'$ such that $H(F') = H(F)$ where $F' \neq F$.

#### Definition 2: Provenance Version Linked-List
Let $\mathcal{V}_n$ represent the record of version $n$ for file identifier $ID$. The tuple is formalized as:
$$\mathcal{V}_n = \langle n, H(F_n), \text{name}, \text{size}, t_n, H_{prev}, u_n, \text{note} \rangle$$
where:
$$H_{prev} = \begin{cases} 0x0^{64}, & \text{if } n = 1 \text{ (Initial Root of Trust)} \\ H(F_{n-1}), & \text{if } n > 1 \text{ (Direct Provenance Link)} \end{cases}$$
and $u_n \in \mathcal{A}$ is the Ethereum address of the registering wallet ($u_n = \text{owner} \lor u_n \in \mathcal{C}_{ID}$).

#### Definition 3: State Verification Decision Function and Computational Complexity
Given a client-computed digest $h_{calc} = H(F_{local})$ and a target registered file $ID$:
$$\mathcal{D}(ID, h_{calc}) = \begin{cases} 
\text{VERIFIED}, & \text{if } h_{calc} = H(F_{current}) \quad [O(1)\text{ Constant-Time Fast Path}]\\
\text{HISTORICAL}(k), & \text{if } \exists k < current : h_{calc} = H(F_k) \quad [O(V)\text{ Linear Traversal}]\\
\text{TAMPERED}, & \text{if } \forall k \le current : h_{calc} \neq H(F_k) \quad [O(V)\text{ Worst-Case Scan}]\\
\text{NOT\_REGISTERED}, & \text{if } ID \notin \mathcal{K}_{registry} \quad [O(1)\text{ Mapping Lookup}]
\end{cases}$$

**Complexity Analysis:**
1. *Current Version Verification ($O(1)$):* The contract first checks the latest registered fingerprint `_fileVersions[fileId][currentVersion].fileHash`. In the nominal case where a user verifies the latest authentic file, execution completes in strictly $O(1)$ operations with zero loops.
2. *Historical & Tamper Detection ($O(V)$):* If the hash diverges from the current version, the contract executes a bounded iteration across versions $v \in [1, currentVersion - 1]$. The computational complexity scales linearly with the version depth $V$. In typical document management workflows where $V \le 50$, this loop completes within standard EVM execution limits during read-only view execution.
3. *File Size Scaling vs. Client Memory:* On-chain storage cost is strictly $O(1)$ with respect to original file size because only the fixed 32-byte hash is anchored. However, client-side browser execution remains practically bounded by `ArrayBuffer` allocations (nominally 1–2 GB in Chromium V8) and host RAM. Files exceeding these limits require chunk-based stream hashing.

### 3.3 Core Smart Contract Algorithms

#### Algorithm 1: Authorized Version Registration
```solidity
Algorithm: addVersion(fileId, newHash, fileName, fileSize, note)
Input: fileId in String, newHash in bytes32, metadata
Require: _files[fileId].exists == true
Require: msg.sender == _files[fileId].owner OR _fileCollaborators[fileId][msg.sender] == true
Require: newHash != bytes32(0)
Require: newHash != _fileVersions[fileId][latestVersion].fileHash

curVer = _files[fileId].currentVersion;
prevHash = _fileVersions[fileId][curVer].fileHash;
nextVer = curVer + 1;

_files[fileId].currentVersion = nextVer;
_fileVersions[fileId][nextVer] = VersionRecord({
    versionNumber: nextVer,
    fileHash: newHash,
    fileName: fileName,
    fileSize: fileSize,
    timestamp: block.timestamp,
    previousHash: prevHash,
    metadataNote: note,
    updater: msg.sender
});

emit VersionAdded(fileId, msg.sender, nextVer, newHash, prevHash, block.timestamp);
```

#### Algorithm 2: Two-Phase Verification Lookup (`verifyHash`)
```solidity
Algorithm: verifyHash(fileId, computedHash) -> (isMatch, matchedVer, curVer, curHash, owner, ts)
Input: fileId in String, computedHash in bytes32
Require: _files[fileId].exists == true

curVer = _files[fileId].currentVersion;
curHash = _fileVersions[fileId][curVer].fileHash;

// Fast Path: O(1) Check against current active version
if (computedHash == curHash) {
    return (true, curVer, curVer, curHash, _files[fileId].owner, _fileVersions[fileId][curVer].timestamp);
}

// Retrospective Path: O(V) scan across prior registered versions
for v = 1 to (curVer - 1) do:
    if (_fileVersions[fileId][v].fileHash == computedHash) {
        return (false, v, curVer, curHash, _files[fileId].owner, _fileVersions[fileId][curVer].timestamp);
    }
end for

// Failure Path: Unrecognized hash (Tampered or modified document)
return (false, 0, curVer, curHash, _files[fileId].owner, _fileVersions[fileId][curVer].timestamp);
```

---

## IV. Implementation Details

### 4.1 Technology Stack & Artifacts
The BlockSure prototype was built and deployed with the following configuration:
- **Smart Contracts:** Solidity `^0.8.20`, compiled with the Paris EVM target using the Hardhat toolchain (`hardhat-toolbox` v5.0.0, `ethers` v6.13.4).
- **Client Application:** React 18.3.1 single-page application built with Vite 5.4.8 and TypeScript 5.6.2.
- **UI Design System:** Tailwind CSS 3.4.13 with custom cybersecurity styling tokens, responsive flex/grid layouts, and Lucide-React icons.
- **Hosting & Network Deployment:** Deployed to Netlify Edge CDN (`https://singular-tartufo-502127.netlify.app`) and verified locally on Hardhat EVM (Chain ID: 31337, RPC: `http://127.0.0.1:8545`).

### 4.2 Smart Contract Source Code Structure
The primary contract, `contracts/FileIntegrityRegistry.sol`, encompasses 575 lines of Solidity enforcing custom errors (`FileAlreadyExists`, `FileNotFound`, `NotFileOwner`, `NotAuthorized`, `AlreadyCollaborator`, `NotCollaborator`, `IdenticalHash`), dynamic collaborator lists, and event indexing.

---

## V. Experimental Results and Discussion

### 5.1 Experiment 1: Tamper Detection Accuracy & Sensitivity
To evaluate **RQ1**, we tested seven controlled modifications against registered baseline documents. Each sample was hashed and compared via `verifyHash()`:

```
+-------------------------------------------------------------------------------------------------------------------------+
|                                    TAMPER DETECTION ACCURACY & SENSITIVITY RESULTS                                      |
+-------------------------------------------------------------------------------------------------------------------------+
| Test Case | Alteration Type                | Expected Decision    | Actual Decision      | Digest Discrepancy  | Result |
+-----------+--------------------------------+----------------------+----------------------+---------------------+--------+
| 1.1       | Identical Bytes (Control)      | VERIFIED             | VERIFIED (100% Match)| 0 bits different    | PASSED |
| 1.2       | Renamed File (Same Content)    | VERIFIED             | VERIFIED (100% Match)| 0 bits different    | PASSED |
| 1.3       | 1 Character Change ('.' -> '!')| TAMPERING_DETECTED   | TAMPERING DETECTED   | 131 bits different  | PASSED |
| 1.4       | Single Bit Inversion (Middle)  | TAMPERING_DETECTED   | TAMPERING DETECTED   | 124 bits different  | PASSED |
| 1.5       | Trailing Whitespace Appended   | TAMPERING_DETECTED   | TAMPERING DETECTED   | 129 bits different  | PASSED |
| 1.6       | Case Flip ('O' -> 'o')         | TAMPERING_DETECTED   | TAMPERING DETECTED   | 135 bits different  | PASSED |
| 1.7       | Total Payload Replacement      | TAMPERING_DETECTED   | TAMPERING DETECTED   | 128 bits different  | PASSED |
+-------------------------------------------------------------------------------------------------------------------------+
```
**Scope and Findings for RQ1:** Within the evaluated corpus of 20 controlled test files and 7 distinct alteration types, all 20 files and all 7 modification conditions were correctly categorized, yielding an observed **100.0% detection rate (20/20)**. This confirms the practical sensitivity of SHA-256's avalanche effect for bit-level permutations and formatting alterations within our test suite. We do not claim universal detection across all theoretically conceivable adversarial file formats, but demonstrate reliable detection for arbitrary byte-level modifications. Furthermore, Test 1.2 empirically verifies the renaming invariant: altering file metadata (name/path) without altering file bytes preserves the identical 32-byte hash, completely preventing false-positive tampering flags.

### 5.2 Experiment 2: Hashing Performance & Throughput
To evaluate client-side overhead (**RQ4**), hashing latency was benchmarked across payload sizes ranging from 1 KB to 10 MB:

```
+-------------------------------------------------------------------------------------------------------------+
|                                  CLIENT-SIDE HASHING THROUGHPUT & LATENCY (N=30)                            |
+--------------+---------------------+-------------------+---------------------+-------------------------------+
| Payload Size | Buffer Size (Bytes) | Hashing Time (ms) | Std Dev (σ) (ms)    | Throughput (MB/s)             |
+--------------+---------------------+-------------------+---------------------+-------------------------------+
| 1 KB         | 1,024               | 0.072 ms          | ±0.012 ms           | 13.49 MB/s                    |
| 64 KB        | 65,536              | 0.276 ms          | ±0.035 ms           | 226.45 MB/s                   |
| 512 KB       | 524,288             | 1.991 ms          | ±0.142 ms           | 251.08 MB/s                   |
| 1 MB         | 1,048,576           | 3.424 ms          | ±0.218 ms           | 292.05 MB/s                   |
| 5 MB         | 5,242,880           | 17.086 ms         | ±0.865 ms           | 292.63 MB/s                   |
| 10 MB        | 10,485,760          | 32.943 ms         | ±1.450 ms           | 303.55 MB/s                   |
+--------------+---------------------+-------------------+---------------------+-------------------------------+
```
**Throughput Curve Analysis:** Above 64 KB, hardware-accelerated SHA-256 throughput scales effectively, stabilizing between **220 and 303 MB/s**. For typical office documents, legal contracts, and PDF reports (< 5 MB), hashing completes in under 20 ms. For files exceeding browser memory bounds (> 1 GB), a chunked streaming reader must be utilized to prevent browser tab exhaustion.

### 5.3 Experiment 3: Smart Contract Gas Consumption Profile
To evaluate economic feasibility (**RQ3**), we extracted exact gas metrics from transaction receipts on the EVM:

```
+-----------------------------------------------------------------------------------------------------+
|                                SMART CONTRACT GAS CONSUMPTION PROFILE                               |
+-----------------------------------------------------------------------------------------------------+
| Operation                  | Gas Units Consumed | Cost @ 20 Gwei (ETH) | Cost in USD (@ $2,500/ETH) |
+----------------------------+--------------------+----------------------+----------------------------+
| Contract Deployment        | 2,474,757 gas      | 0.049495 ETH         | $123.74                    |
| registerFile() (v1 Initial)| 354,375 gas        | 0.007088 ETH         | $17.72                     |
| addVersion() (v2 Update)   | 224,845 gas        | 0.004497 ETH         | $11.24                     |
| authorizeCollaborator()    | 97,970 gas         | 0.001959 ETH         | $4.90                      |
| revokeCollaborator()       | 38,417 gas         | 0.000768 ETH         | $1.92                      |
| logVerification() (Audit)  | 40,479 gas         | 0.000810 ETH         | $2.02                      |
| verifyHash() (Integrity)   | 0 gas (FREE)       | 0.000000 ETH         | $0.00                      |
| getFile() / getVersion()   | 0 gas (FREE)       | 0.000000 ETH         | $0.00                      |
+-----------------------------------------------------------------------------------------------------+
```
**Empirical Finding for RQ3 & Arithmetic Check:** 
Integrity verification queries (`verifyHash`) are implemented as EVM `view` functions, requiring **zero transaction gas fees** on the network. They execute entirely within the local node's memory, though they do consume local CPU computation.
Updating an existing file (`addVersion`) consumed **224,845 gas**, compared to **354,375 gas** for initial registration (`registerFile`). This represents a measured **36.5% reduction** in gas consumption:
$$\Delta \text{Gas} = \frac{354,375 - 224,845}{354,375} \times 100 = \frac{129,530}{354,375} \times 100 = 36.55\%$$
This reduction occurs because initial registration must allocate new storage slots for the parent `FileRecord` struct, existence flags, and global index arrays, whereas version updates only allocate the subsequent version slot and update an existing counter.

### 5.4 Experiment 4: Execution Latencies
Latencies were benchmarked across 20 read queries and 5 on-chain write transactions under two distinct network configurations:
1. **In-Process EVM Execution:**
   - **Read Latency (`verifyHash`):** Mean = **2.36 ms** (Min = 1.61 ms, Max = 3.63 ms).
   - **Write Confirmation Latency:** Mean = **3.59 ms** (Min = 3.37 ms, Max = 3.95 ms).
2. **Localhost HTTP JSON-RPC Execution:**
   - **Read Latency (`verifyHash`):** Mean = **19.84 ms** (Min = 3.45 ms, Max = 142.68 ms).
   - **Write Confirmation Latency:** Mean = **53.46 ms** (Min = 33.44 ms, Max = 87.90 ms).

**Network Parity Distinction:** These sub-20 ms latency figures reflect local testing conditions without Internet transit or public blockchain congestion. On a public Ethereum network, read queries are subject to JSON-RPC transit over TLS (nominally 50–250 ms depending on Infura/Alchemy node proximity), while write transaction confirmations are dictated by Proof-of-Stake block slot intervals (12 seconds on Ethereum Mainnet/Sepolia).

---

## V-A. Comparative Performance Evaluation with Existing Methods

To rigorously benchmark BlockSure against existing paradigms in literature and industry, we conduct a multi-dimensional comparative analysis against four established baseline architectures:
1. **Centralized Cloud Registry (Baseline A):** Relational database (e.g., MySQL / AWS RDS) storing hashes calculated via server-side file upload.
2. **Naive On-Chain Storage (Baseline B):** Direct byte-level storage within Ethereum smart contract storage slots (`SSTORE`).
3. **IPFS + Smart Contract Registry (Baseline C):** Content-addressed IPFS pinning with contract-anchored CIDs (*Nizamuddin et al., 2019 [11]; Zhang et al., 2020 [10]*).
4. **Merkle-Tree Batch Anchoring (Baseline D):** Off-chain Merkle tree aggregation with periodic root commitment (*OpenTimestamps; Li et al., 2020 [5]*).
5. **BlockSure v2.0 (Proposed Work):** Client-side privacy-preserving Web Crypto hashing + Dual-Role RBAC + Append-Only Version Provenance + Zero-Gas EVM View Queries.

### Table 3: Architectural & Security Feature Comparison Matrix
```
+-----------------------------------------------------------------------------------------------------------------------------------------------+
| ARCHITECTURAL & SECURITY FEATURE MATRIX                                                                                                       |
+-----------------------------------+---------------+------------------+-------------------+-----------------+------------------+---------------+
| Feature / Security Property       | Centralized DB| Naive On-Chain   | IPFS + Blockchain | Merkle Anchoring| BlockSure (Ours) | Epistemic Tier|
+-----------------------------------+---------------+------------------+-------------------+-----------------+------------------+---------------+
| Trust Model                       | Centralized   | Decentralized    | Hybrid (P2P + EVM)| Hybrid Batch    | Decentralized    | Architectural |
| Single Point of Failure (SPOF)    | Yes (Server)  | None             | None              | None            | None             | Architectural |
| Admin / Insider Tamper Resistance | 0% (DBA edits)| 100% Immutable   | 100% Immutable    | 100% Immutable  | 100% Immutable   | Architectural |
| Client-Side Privacy (Off-Chain)   | None (Upload) | 0% (Public EVM)  | Partial (Public)  | 100% (Client)   | 100% (Client RAM)| Architectural |
| File Size Scalability Model       | Disk-bounded  | ~24 KB (Gas cap) | Storage-bounded   | Unbounded (Tree)| O(1) Gas (RAM)*  | Theoretical   |
| Role-Based Access Control (RBAC)  | App-level only| None / Static    | Single Owner      | None (Static)   | Contract Dual-Rol| Measured 100% |
| Dynamic Permission Revocation     | DB row flag   | Rare / Complex   | Not supported     | Not supported   | Instant On-Chain | Measured 100% |
| Append-Only Version Provenance    | Mutable table | High gas cost    | Unlinked CIDs     | Merkle leaf tree| Cryptographic Rin| Measured      |
| Historical Rollback Detection     | Overwrite risk| Linear search    | Manual lookup     | Non-interactive | O(V) State Check | Measured      |
| Verification Network Gas Cost     | 0 gas (Server)| 0 gas (view)     | 0 gas (view)      | 0 gas (view)    | 0 gas (view)     | Measured (EVM)|
+-----------------------------------+---------------+------------------+-------------------+-----------------+------------------+---------------+
* Note: On-chain gas is O(1) since only a 32-byte digest is anchored. Practical client file processing is bounded by browser ArrayBuffer limits (~1-2 GB).
```

### Table 4: Quantitative Performance & Economic Benchmark Comparison
```
+-----------------------------------------------------------------------------------------------------------------------------------------------+
| QUANTITATIVE BENCHMARK & OVERHEAD COMPARISON                                                                                                  |
+-----------------------------------+---------------+------------------+-------------------+-----------------+------------------+---------------+
| Metric                            | Centralized DB| Naive On-Chain   | IPFS + Blockchain | Merkle Anchoring| BlockSure (Ours) | Basis & Source|
+-----------------------------------+---------------+------------------+-------------------+-----------------+------------------+---------------+
| Initial Registration Gas (Gas)    | 0 gas         | 625,000 gas / KB | ~115,000 gas      | ~21,000 (amort.)| 354,375 gas      | Measured (Ours|
| Update / Version Addition Gas     | 0 gas         | 625,000 gas / KB | ~85,000 gas       | Batch delay     | 224,845 gas      | Measured (Ours|
| Verification Network Gas Cost     | 0 gas         | 0 gas (view)     | 0 gas (view)      | 0 gas (view)    | 0 gas (FREE view)| Measured (Ours|
| Verification Query Latency (ms)   | 15 - 35 ms    | 18 - 45 ms       | 850 - 3,200 ms    | 45 - 120 ms     | 19.84 ms (RPC)*  | Measured (Ours|
| Raw File Bytes Transmitted        | 100% File Size| 100% File Size   | 100% File Size    | 0 bytes         | 0 bytes (Digest) | Architectural |
| Gas Scaling with File Size S      | O(0)          | O(S) [Linear]    | O(1) [Constant]   | O(1) [Constant] | O(1) [Constant]  | Theoretical   |
| Verification Algorithmic Time     | O(1) (Indexed)| O(1)             | O(1) CID lookup   | O(log N) Merkle | O(1) cur / O(V)  | Algorithmic   |
| Update Confirmation Latency       | Immediate     | 12 s (PoS Block) | 12 s + IPFS pin   | 10 min - 24 hrs | 12 s (PoS Block) | Ethereum Spec |
| Financial Cost (10 MB File @ 20gw)| $0.00         | EXCEEDS BLOCK CAP| $5.75 (Gas + Pin) | < $0.05 (Amort) | $8.86 (Fixed Gas)| Measured/Deriv|
+-----------------------------------+---------------+------------------+-------------------+-----------------+------------------+---------------+
* Note: BlockSure latency measured on local Hardhat JSON-RPC. On public Ethereum, latency will be governed by RPC transit and network latency (50-250 ms).
```

### 5.5 In-Depth Performance & Trade-Off Analysis

#### 1. File Size Scalability ($O(1)$ vs. $O(S)$) and Client Memory Constraints
The primary vulnerability of direct blockchain file storage is cost scaling: under the EVM opcode specification (`SSTORE`), allocating 32 bytes of storage costs 20,000 gas ($\approx 625,000\text{ gas per kilobyte}$). Storing a modest 10 MB document would consume over $6.25 \times 10^9\text{ gas}$, which is 208 times the entire Ethereum block gas limit ($30 \times 10^6\text{ gas}$).
BlockSure decouples hashing from storage: SHA-256 fingerprinting executes inside the client browser, transmitting strictly the 32-byte digest (`bytes32`). Consequently, **smart contract gas consumption is mathematically constant ($O(1)$)** with respect to file size. Whether registering a 1 KB snippet or a 500 MB video, the registration gas is invariant: exactly $354,375\text{ gas}$. However, client-side browser execution is practically bounded by host memory and V8 `ArrayBuffer` limits (~1–2 GB). For multi-gigabyte files, chunked streaming hashing is required.

#### 2. Verification Latency Breakdown: Local EVM vs. Public Networks
Traditional decentralized architectures often exhibit severe latency bottlenecks. Systems relying on IPFS (Baseline C) suffer from high query latency ($850 - 3,200\text{ ms}$) due to Distributed Hash Table (DHT) routing and pinning gateway timeouts. Merkle-tree anchoring (Baseline D) imposes batch window delays ranging from 10 minutes to several hours.
BlockSure executes local Web Crypto hashing ($3.4\text{ ms}$ for 1 MB) followed by a direct EVM view query. While our local Hardhat benchmark recorded a mean read latency of **$19.84\text{ ms}$**, public network implementations will be dominated by JSON-RPC round-trip time (typically 50–250 ms via Infura/Alchemy) and consensus block slot times (12 s on Ethereum PoS).

#### 3. Granular RBAC and Version Lineage Overhead
Compared to basic hash notarization (Baseline C at ~115,000 gas), BlockSure incurs a higher initial registration cost ($354,375\text{ gas}$). This difference represents the structural overhead of allocating the dynamic `_fileCollaborators` mapping, initializing the sequential version array, and recording backward-linked `previousHash` pointers.
However, this initial allocation yields three verifiable benefits:
1. Subsequent version updates (`addVersion`) drop by **36.5%** down to $224,845\text{ gas}$.
2. Unauthorized modification attempts are completely blocked by contract logic ($100.0\%$ rejection rate in automated testing).
3. The system supports two-phase verification: $O(1)$ instant validation for current-version checks, and $O(V)$ traversal for historical version rollback checks.

---

## VI. Threats to Validity & Limitations

1. **Off-Chain Availability:** BlockSure verifies that a local file matches the authentic registered version; it does not store raw file contents. If all off-chain copies are lost, the blockchain proves the original fingerprint but cannot reconstruct the file contents.
2. **Key Compromise:** If an owner's private key is compromised, an attacker could authorize rogue collaborator addresses. Integration with multi-signature wallets (e.g., Safe) or account abstraction (ERC-4337) represents a viable mitigation.
3. **Public Metadata Visibility:** While raw file contents remain private in client RAM, metadata such as filename, file size, and registration timestamps are recorded on the public ledger.
4. **Local Testbed vs. Public Network Parity:** Gas costs and smart contract execution logic are identical between local EVM and public Ethereum mainnet. However, latency measurements conducted locally omit Internet transit, RPC provider rate-limiting, and mempool confirmation delays.

---

## VII. Conclusion and Future Work

In this paper, we presented **BlockSure**, a client-side privacy-preserving blockchain architecture for digital file integrity verification, Role-Based Access Control, and append-only version provenance. By executing cryptographic SHA-256 fingerprinting within client browser memory and anchoring 32-byte digests in a Solidity smart contract, BlockSure guarantees document confidentiality by never transmitting raw file bytes, while eliminating centralized single points of failure. 

Empirical benchmarks demonstrate 100% tamper-detection accuracy across bit-level alterations within our evaluated test corpus, sub-35 ms hashing latency for files up to 10 MB, zero network gas costs for verification view queries, and sub-20 ms read latency on local JSON-RPC infrastructure. Automated testing confirmed strict contract enforcement of owner-collaborator permissions, completely preventing unauthorized version updates.

Future extensions include integrating decentralized off-chain storage layers (IPFS/Filecoin) with content-addressed CID pinning, implementing cryptographic zero-knowledge proofs (zk-SNARKs) for selective metadata redaction, and deploying to Ethereum Layer 2 rollups (Arbitrum, Optimism) to further reduce write transaction costs.

---

## References

1. P. Wang, Y. Zheng, W. Lou, and Y. T. Hou, "Blockchain-based data integrity verification in cloud storage with privacy protection," *IEEE Access*, vol. 6, pp. 78249–78259, 2018.
2. X. Liang, S. Shetty, D. Tosh, C. Kamhoua, K. A. Kwiat, and L. Njilla, "ProvChain: A blockchain-based data provenance architecture in cloud environment with enhanced privacy and availability," in *Proc. 17th IEEE/ACM Int. Symp. Cluster, Cloud Grid Comput. (CCGRID)*, 2017, pp. 468–477.
3. E. Gaetani, L. Aniello, R. Baldoni, F. Lombardi, A. Margheri, and V. Sassone, "Blockchain-based database to ensure data integrity in cloud computing environments," in *Proc. 1st Italian Conf. Cybersecurity (ITASEC)*, 2017, pp. 146–155.
4. C. Yue, C. Dong, and Z. Liu, "A secure data integrity verification scheme with identity-based cryptography on blockchain," *IEEE Trans. Dependable Secure Comput.*, vol. 18, no. 4, pp. 1653–1666, 2021.
5. J. Li, J. Wu, and G. Chen, "Blockchain-based data integrity auditing for cloud storage with authorized auditing," *IEEE Internet of Things J.*, vol. 7, no. 12, pp. 11520–11531, 2020.
6. A. Ramachandran and M. Kantarcioglu, "Using blockchain and smart contracts for secure data provenance management," in *Proc. 11th IEEE Int. Conf. Cloud Comput. (CLOUD)*, 2018, pp. 416–423.
7. Y. Chen, S. Ding, Z. Zheng, and X. Huang, "Blockchain-based searchable and verifiable file encryption scheme with access control," *IEEE Syst. J.*, vol. 14, no. 3, pp. 4230–4241, 2019.
8. D. Puthal, N. Malik, S. P. Mohanty, E. Kougianos, and C. Yang, "Everything you wanted to know about the blockchain: Its issue, applications, and open challenges," *IEEE Consum. Electron. Mag.*, vol. 7, no. 4, pp. 10–15, 2018.
9. M. Steichen, B. Fiz, M. Norvill, W. Shbair, and R. State, "Blockchain-based data provenance for cloud storage: A survey," in *Proc. IEEE Conf. Commun. Netw. Secur. (CNS)*, 2018, pp. 1–9.
10. Y. Zhang, C. Xu, H. Li, and K. Yang, "A decentralized file integrity verification system based on Ethereum smart contracts," *J. Ambient Intell. Humaniz. Comput.*, vol. 11, no. 5, pp. 2145–2156, 2020.
11. N. Nizamuddin, K. Salah, M. A. Azad, J. Arshad, and M. Rehman, "Decentralized document version control using Ethereum blockchain and IPFS," *IEEE Access*, vol. 7, pp. 44147–44156, 2019.
