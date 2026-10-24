# BlockSure: A Zero-Knowledge Blockchain Architecture for File Integrity Verification, Append-Only Version Provenance, and Smart Contract-Enforced Update Authorization

**Vaishnavi R.**  
*Department of Computer Science & Engineering*  
*Repository:* [https://github.com/vaishnavir2626/blockchain_file_integrity](https://github.com/vaishnavir2626/blockchain_file_integrity)  
*Live Prototype:* [https://singular-tartufo-502127.netlify.app](https://singular-tartufo-502127.netlify.app)  

---

## Abstract
Digital files in distributed networks are continually vulnerable to silent corruption, malicious tampering, and unauthorized overwrite attacks. Conventional integrity auditing frameworks either rely on centralized Certificate Authorities (CAs) that introduce single points of failure and administrative repudiation, or store raw data on-chain, incurring prohibitive gas fees and compromising client confidentiality. Furthermore, existing blockchain integrity solutions predominantly treat files as immutable, static artifacts, failing to provide an integrated mechanism that unifies zero-byte tamper detection, smart contract-enforced update authorization, and cryptographic version provenance. 

This paper proposes **BlockSure**, a hybrid decentralized architecture that unifies client-side SHA-256 digest computation via the W3C Web Crypto API with an EVM-based smart contract registry (`FileIntegrityRegistry.sol`). BlockSure keeps actual file contents strictly off-chain while anchoring 32-byte cryptographic fingerprints, owner identities, timestamps, and backward-linked version pointers (`previousHash`) on-chain. Role-Based Access Control (RBAC) enforced within Solidity execution guarantees that only legitimate file owners or explicitly designated collaborator wallets can append subsequent versions. 

We conducted empirical evaluations across four experimental dimensions: (1) **Tamper Detection Sensitivity**: achieving a 100.0% detection rate across single-bit flips, character case changes, and whitespace insertions while preserving the file renaming invariant; (2) **Hashing Performance**: measuring client-side hashing throughput of ~160 MB/s across payloads up to 10 MB; (3) **EVM Gas Profile**: establishing that read-only integrity verifications consume **0 gas**, while initial registrations and version additions require 354,375 and 224,845 gas units, respectively; and (4) **Latency**: achieving read verification latencies of 19.84 ms and write confirmation latencies of 53.46 ms. Automated testing across 33 comprehensive test cases confirms that the system effectively prevents unauthorized updates, guarantees immutable lineage preservation, and eliminates centralized trust bottlenecks.

**Keywords:** Blockchain, Smart Contracts, File Integrity, Data Provenance, SHA-256, Access Control, Ethereum, Zero-Knowledge Storage.

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
- **RQ1 (Detection Efficacy):** *Can client-side SHA-256 hashing coupled with on-chain cryptographic anchoring detect single-bit alterations and content corruptions with 100% accuracy while maintaining filename invariance?*
- **RQ2 (Authorization Enforcement):** *Can smart contract-level Role-Based Access Control (RBAC) definitively prevent unauthorized parties from overwriting or appending file versions without relying on centralized authorization servers?*
- **RQ3 (Economic Feasibility):** *What are the computational gas costs and execution latencies associated with maintaining append-only cryptographic version trees on the Ethereum Virtual Machine (EVM)?*
- **RQ4 (Scalability & Throughput):** *How does the system perform across expanding file payload sizes, and can zero-cost read verifications be achieved for daily consumer use?*

### 1.3 Key Contributions
The contributions of this work are summarized as follows:
1. **Hybrid Zero-Knowledge Storage Architecture:** We design and implement a decoupled architecture that executes cryptographic SHA-256 hashing entirely within client browser memory (via the W3C Web Crypto API), ensuring that zero bytes of sensitive raw data travel over the network or enter public blockchain storage.
2. **On-Chain RBAC with Append-Only Version Lineage:** We develop `FileIntegrityRegistry.sol`, a Solidity smart contract that implements granular owner-collaborator permissions, emits immutable audit events, and maintains backward-linked provenance pointers (`previousHash`) that render historical version erasure mathematically impossible.
3. **Zero-Gas Verification Engine:** We formalize a constant-time ($O(1)$) state-verification algorithm executed via read-only EVM `view` calls, providing free integrity verification for all end users.
4. **Empirical Evaluation & Reproducibility:** We validate the prototype across 33 automated test cases, benchmark hashing throughput and gas consumption across multiple file sizes (1 KB to 10 MB), and release the open-source codebase, live Netlify web application, and interactive Google Colab demonstration.

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
| **BlockSure (This Work)**   | **SHA-256**| **EVM / Local / Sep**| **Dual-Role RBAC**     | **Full Linked** | **Empirical Exact**| **Integrated Zero-Gas Verification + Lineage**   |
+---------------------------------------------------------------------------------------------------------------------------------+
```

### 2.1 Research Gap
As evidenced by the comparison matrix, existing studies typically address either **static integrity auditing** (Wang et al., Li et al.) or **data provenance graphs** (Liang et al., Ramachandran et al.) in isolation. Systems that support data integrity rarely allow authorized third-party updates with contract-enforced permission revocation. Conversely, systems that support versioning frequently store extensive metadata on-chain, leading to ballooning transaction costs. BlockSure directly bridges this research gap by integrating:
1. Decentralized zero-knowledge client hashing,
2. Contract-enforced collaborator authorization and revocation, and
3. Backward-linked cryptographic lineage trees with zero-gas verification.

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

#### Definition 3: State Verification Decision Function
Given a client-computed digest $h_{calc} = H(F_{local})$ and a target registered file $ID$:
$$\mathcal{D}(ID, h_{calc}) = \begin{cases} 
\text{VERIFIED}, & \text{if } h_{calc} = H(F_{current}) \\
\text{HISTORICAL}(k), & \text{if } \exists k < current : h_{calc} = H(F_k) \\
\text{TAMPERED}, & \text{if } \forall k \le current : h_{calc} \neq H(F_k) \\
\text{NOT\_REGISTERED}, & \text{if } ID \notin \mathcal{K}_{registry}
\end{cases}$$

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
**Finding for RQ1:** The tamper-detection accuracy reached **100.0%**. Furthermore, Test 1.2 empirically verified the renaming invariant: changing the document name without modifying its content generates the exact identical SHA-256 fingerprint, eliminating false alarms.

### 5.2 Experiment 2: Hashing Performance & Throughput
To evaluate client-side overhead (**RQ4**), hashing latency was benchmarked across payload sizes ranging from 1 KB to 10 MB:

```
+-----------------------------------------------------------------------------------+
|                        CLIENT-SIDE HASHING THROUGHPUT & LATENCY                   |
+-----------------------------------------------------------------------------------+
| Payload Size | Buffer Size (Bytes) | Hashing Time (ms) | Throughput (MB/s)       |
+--------------+---------------------+-------------------+-------------------------+
| 1 KB         | 1,024               | 0.156 ms          | 6.27 MB/s               |
| 64 KB        | 65,536              | 0.550 ms          | 113.68 MB/s             |
| 512 KB       | 524,288             | 3.135 ms          | 159.49 MB/s             |
| 1 MB         | 1,048,576           | 6.514 ms          | 153.51 MB/s             |
| 5 MB         | 5,242,880           | 30.027 ms         | 166.52 MB/s             |
| 10 MB        | 10,485,760          | 62.481 ms         | 160.05 MB/s             |
+-----------------------------------------------------------------------------------+
```
**Throughput Curve Analysis:** Above 512 KB, hashing throughput stabilizes between **153 and 166 MB/s**. For typical office documents and PDF agreements (< 5 MB), hashing latency is under 30 ms, which is imperceptible to users.

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
**Economic Finding for RQ3:** The most frequent user action—integrity verification—incurs **zero gas cost**. Updating an existing file (`addVersion`) requires 36.5% less gas than initial registration (224,845 vs. 354,375 gas) because storage allocations for file metadata and indexing arrays are already established.

### 5.4 Experiment 4: Execution Latencies
Latency was evaluated across 20 read queries and 5 write transactions:
- **Read Latency (`verifyHash`):** Mean = **19.84 ms**, Min = 3.45 ms, Max = 142.68 ms.
- **Write Confirmation Latency:** Mean = **53.46 ms**, Min = 33.44 ms, Max = 87.90 ms.

The sub-20 ms read latency demonstrates that decentralized verification achieves query performance parity with conventional centralized REST APIs.

---

## VI. Threats to Validity & Limitations

1. **Off-Chain Availability:** BlockSure verifies that a local file matches the authentic registered version; it does not store the physical file. If all off-chain copies are lost, the blockchain proves the original fingerprint but cannot reconstruct the file contents.
2. **Key Compromise:** If an owner's private key is compromised, an attacker could authorize rogue collaborator addresses. Integration with multi-signature wallets (e.g., Safe) or account abstraction (ERC-4337) represents a viable mitigation.
3. **Public Metadata Visibility:** While file contents remain private, metadata such as filename, file size, and registration timestamps are visible on the public ledger.

---

## VII. Conclusion and Future Work

In this paper, we presented **BlockSure**, a zero-knowledge blockchain architecture for digital file integrity verification, Role-Based Access Control, and append-only version provenance. By executing cryptographic SHA-256 fingerprinting within client browser memory and anchoring 32-byte digests in a Solidity smart contract, BlockSure guarantees complete document confidentiality while eliminating centralized single points of failure. 

Empirical benchmarks demonstrate 100% tamper-detection accuracy across bit-level alterations, sub-30 ms hashing latency for standard files, zero gas costs for verification queries, and sub-20 ms read latency. Automated testing confirmed strict enforcement of owner-collaborator permissions, completely preventing unauthorized version updates.

Future extensions include integrating decentralized off-chain storage layers (IPFS/Filecoin) with content-addressed CID pinning, implementing zero-knowledge proofs (zk-SNARKs) for selective metadata redaction, and deploying to Ethereum Layer 2 rollups (Arbitrum, Optimism) to further reduce write transaction costs.

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
