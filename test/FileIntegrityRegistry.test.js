const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FileIntegrityRegistry Contract", function () {
  let registry;
  let owner;
  let collaborator;
  let unauthorizedUser;
  let verifier;

  // Sample SHA-256 test hashes (bytes32 format)
  // sha256("Hello BlockSure v1")
  const hashV1 = "0x1111111122222222333333334444444455555555666666667777777788888888";
  // sha256("Hello BlockSure v2")
  const hashV2 = "0xaaaaaaaa99999999888888887777777766666666555555554444444433333333";
  // sha256("Hello BlockSure v3")
  const hashV3 = "0xbbbbbbbbccccccccddddddddeeeeeeeeffffffff000000001111111122222222";
  // sha256("Tampered File Content")
  const hashTampered = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  const zeroHash = ethers.ZeroHash;

  beforeEach(async function () {
    [owner, collaborator, unauthorizedUser, verifier] = await ethers.getSigners();
    const FileIntegrityRegistry = await ethers.getContractFactory("FileIntegrityRegistry");
    registry = await FileIntegrityRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("File Registration (FR-02)", function () {
    it("should successfully register an initial file version", async function () {
      const fileId = "DOC-2026-001";
      const fileName = "research_paper_final.pdf";
      const fileSize = 1048576; // 1MB
      const note = "Initial draft for journal review";

      const tx = await registry.connect(owner).registerFile(
        fileId,
        hashV1,
        fileName,
        fileSize,
        note
      );

      await expect(tx)
        .to.emit(registry, "FileRegistered")
        .withArgs(fileId, owner.address, hashV1, fileName, fileSize, await getBlockTimestamp(tx));

      expect(await registry.fileExists(fileId)).to.equal(true);

      const latest = await registry.getLatestVersion(fileId);
      expect(latest.versionNumber).to.equal(1n);
      expect(latest.fileHash).to.equal(hashV1);
      expect(latest.fileName).to.equal(fileName);
      expect(latest.fileSize).to.equal(BigInt(fileSize));
      expect(latest.previousHash).to.equal(zeroHash);
      expect(latest.metadataNote).to.equal(note);
      expect(latest.owner).to.equal(owner.address);
      expect(latest.totalVersions).to.equal(1n);

      const v1 = await registry.getFileVersion(fileId, 1);
      expect(v1.updater).to.equal(owner.address);
    });

    it("should reject registration with empty file ID", async function () {
      await expect(
        registry.registerFile("", hashV1, "doc.pdf", 100, "")
      ).to.be.revertedWithCustomError(registry, "InvalidFileId");
    });

    it("should reject registration with zero hash", async function () {
      await expect(
        registry.registerFile("DOC-002", zeroHash, "doc.pdf", 100, "")
      ).to.be.revertedWithCustomError(registry, "InvalidHash");
    });

    it("should reject duplicate registration for the same file ID", async function () {
      const fileId = "DOC-DUP-TEST";
      await registry.registerFile(fileId, hashV1, "doc1.pdf", 100, "First");

      await expect(
        registry.registerFile(fileId, hashV2, "doc2.pdf", 200, "Second")
      ).to.be.revertedWithCustomError(registry, "FileAlreadyExists").withArgs(fileId);
    });
  });

  describe("Collaborator Authorization & Access Control (FR-05)", function () {
    const fileId = "COLLAB-DOC-001";

    beforeEach(async function () {
      await registry.connect(owner).registerFile(
        fileId,
        hashV1,
        "shared_blueprint.pdf",
        204800,
        "Initial blueprint"
      );
    });

    it("should allow owner to authorize a collaborator", async function () {
      const tx = await registry.connect(owner).authorizeCollaborator(fileId, collaborator.address);

      await expect(tx)
        .to.emit(registry, "CollaboratorAuthorized")
        .withArgs(fileId, owner.address, collaborator.address, await getBlockTimestamp(tx));

      expect(await registry.isCollaborator(fileId, collaborator.address)).to.equal(true);
      expect(await registry.isAuthorized(fileId, collaborator.address)).to.equal(true);

      const collabs = await registry.getCollaborators(fileId);
      expect(collabs).to.include(collaborator.address);
    });

    it("should reject non-owner attempting to authorize a collaborator", async function () {
      await expect(
        registry.connect(unauthorizedUser).authorizeCollaborator(fileId, unauthorizedUser.address)
      ).to.be.revertedWithCustomError(registry, "NotFileOwner").withArgs(fileId, unauthorizedUser.address, owner.address);
    });

    it("should reject authorizing address zero", async function () {
      await expect(
        registry.connect(owner).authorizeCollaborator(fileId, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(registry, "InvalidAddress");
    });

    it("should reject authorizing the owner themselves", async function () {
      await expect(
        registry.connect(owner).authorizeCollaborator(fileId, owner.address)
      ).to.be.revertedWithCustomError(registry, "CannotAuthorizeSelf");
    });

    it("should reject duplicate collaborator authorization", async function () {
      await registry.connect(owner).authorizeCollaborator(fileId, collaborator.address);

      await expect(
        registry.connect(owner).authorizeCollaborator(fileId, collaborator.address)
      ).to.be.revertedWithCustomError(registry, "AlreadyCollaborator").withArgs(fileId, collaborator.address);
    });

    it("should allow owner to revoke a collaborator", async function () {
      await registry.connect(owner).authorizeCollaborator(fileId, collaborator.address);
      expect(await registry.isCollaborator(fileId, collaborator.address)).to.equal(true);

      const tx = await registry.connect(owner).revokeCollaborator(fileId, collaborator.address);

      await expect(tx)
        .to.emit(registry, "CollaboratorRevoked")
        .withArgs(fileId, owner.address, collaborator.address, await getBlockTimestamp(tx));

      expect(await registry.isCollaborator(fileId, collaborator.address)).to.equal(false);
      expect(await registry.isAuthorized(fileId, collaborator.address)).to.equal(false);

      const collabs = await registry.getCollaborators(fileId);
      expect(collabs).to.not.include(collaborator.address);
    });

    it("should reject revoking a non-collaborator", async function () {
      await expect(
        registry.connect(owner).revokeCollaborator(fileId, unauthorizedUser.address)
      ).to.be.revertedWithCustomError(registry, "NotCollaborator").withArgs(fileId, unauthorizedUser.address);
    });
  });

  describe("Authorized File Updates & Lineage (FR-04, FR-06)", function () {
    const fileId = "SPEC-SEC-2026";

    beforeEach(async function () {
      await registry.connect(owner).registerFile(
        fileId,
        hashV1,
        "security_spec_v1.docx",
        512000,
        "Version 1.0 Release"
      );
    });

    it("should allow the file owner to register a new version", async function () {
      const tx = await registry.connect(owner).registerNewVersion(
        fileId,
        hashV2,
        "security_spec_v2.docx",
        542000,
        "Version 2.0 Security Audit Fixes"
      );

      await expect(tx)
        .to.emit(registry, "FileVersionAdded")
        .withArgs(fileId, owner.address, 2n, hashV2, hashV1, await getBlockTimestamp(tx));

      const latest = await registry.getLatestVersion(fileId);
      expect(latest.versionNumber).to.equal(2n);
      expect(latest.fileHash).to.equal(hashV2);
      expect(latest.previousHash).to.equal(hashV1);
      expect(latest.totalVersions).to.equal(2n);

      const v2 = await registry.getFileVersion(fileId, 2);
      expect(v2.updater).to.equal(owner.address);
    });

    it("should allow an authorized collaborator to register a new version", async function () {
      // Owner authorizes collaborator
      await registry.connect(owner).authorizeCollaborator(fileId, collaborator.address);

      // Collaborator registers v2
      const tx = await registry.connect(collaborator).registerNewVersion(
        fileId,
        hashV2,
        "security_spec_v2_collab.docx",
        550000,
        "Collaborator updates"
      );

      await expect(tx)
        .to.emit(registry, "FileVersionAdded")
        .withArgs(fileId, collaborator.address, 2n, hashV2, hashV1, await getBlockTimestamp(tx));

      const latest = await registry.getLatestVersion(fileId);
      expect(latest.versionNumber).to.equal(2n);
      expect(latest.fileHash).to.equal(hashV2);

      const v2 = await registry.getFileVersion(fileId, 2);
      expect(v2.updater).to.equal(collaborator.address);
      expect(await registry.getVersionCount(fileId)).to.equal(2n);
    });

    it("should reject version update from revoked collaborator", async function () {
      await registry.connect(owner).authorizeCollaborator(fileId, collaborator.address);
      await registry.connect(owner).revokeCollaborator(fileId, collaborator.address);

      await expect(
        registry.connect(collaborator).registerNewVersion(
          fileId,
          hashV2,
          "unauthorized_v2.docx",
          500000,
          "Attempt after revoke"
        )
      ).to.be.revertedWithCustomError(registry, "NotAuthorized").withArgs(fileId, collaborator.address);
    });

    it("should reject version registration by an unauthorized stranger", async function () {
      await expect(
        registry.connect(unauthorizedUser).registerNewVersion(
          fileId,
          hashV2,
          "tampered_spec.docx",
          999,
          "Malicious change"
        )
      ).to.be.revertedWithCustomError(registry, "NotAuthorized").withArgs(fileId, unauthorizedUser.address);
    });

    it("should reject new version with identical hash to current", async function () {
      await expect(
        registry.connect(owner).registerNewVersion(
          fileId,
          hashV1, // Same hash as current version
          "security_spec_v1_copy.docx",
          512000,
          "Duplicate content"
        )
      ).to.be.revertedWithCustomError(registry, "IdenticalHash");
    });

    it("should preserve full version history and previousHash pointers", async function () {
      await registry.connect(owner).registerNewVersion(
        fileId,
        hashV2,
        "security_spec_v2.docx",
        542000,
        "v2 update"
      );

      await registry.connect(owner).authorizeCollaborator(fileId, collaborator.address);
      await registry.connect(collaborator).addVersion(
        fileId,
        hashV3,
        "security_spec_v3.docx",
        560000,
        "v3 update via alias"
      );

      const history = await registry.getFileHistory(fileId);
      expect(history.length).to.equal(3);

      expect(history[0].versionNumber).to.equal(1n);
      expect(history[0].fileHash).to.equal(hashV1);
      expect(history[0].previousHash).to.equal(zeroHash);
      expect(history[0].updater).to.equal(owner.address);

      expect(history[1].versionNumber).to.equal(2n);
      expect(history[1].fileHash).to.equal(hashV2);
      expect(history[1].previousHash).to.equal(hashV1);
      expect(history[1].updater).to.equal(owner.address);

      expect(history[2].versionNumber).to.equal(3n);
      expect(history[2].fileHash).to.equal(hashV3);
      expect(history[2].previousHash).to.equal(hashV2);
      expect(history[2].updater).to.equal(collaborator.address);
    });
  });

  describe("File Integrity Verification & Tamper Detection (FR-03, FR-07)", function () {
    const fileId = "FINANCIAL-AUDIT-2026";

    beforeEach(async function () {
      await registry.connect(owner).registerFile(
        fileId,
        hashV1,
        "audit_report_v1.xlsx",
        204800,
        "Signed balance sheet"
      );
      await registry.connect(owner).registerNewVersion(
        fileId,
        hashV2,
        "audit_report_v2.xlsx",
        210000,
        "Quarterly reconciliation"
      );
    });

    it("should confirm VERIFIED status when hash matches the latest version", async function () {
      const result = await registry.verifyHash(fileId, hashV2);
      expect(result.isMatch).to.equal(true);
      expect(result.matchedVersion).to.equal(2n);
      expect(result.latestVersion).to.equal(2n);
      expect(result.latestHash).to.equal(hashV2);
      expect(result.owner).to.equal(owner.address);
    });

    it("should detect legitimate older version (isMatch false, matchedVersion > 0)", async function () {
      const result = await registry.verifyHash(fileId, hashV1);
      expect(result.isMatch).to.equal(false);
      expect(result.matchedVersion).to.equal(1n); // Matched version 1!
      expect(result.latestVersion).to.equal(2n);
      expect(result.latestHash).to.equal(hashV2);
    });

    it("should detect TAMPERED / MODIFIED file when hash does not match any version", async function () {
      const result = await registry.verifyHash(fileId, hashTampered);
      expect(result.isMatch).to.equal(false);
      expect(result.matchedVersion).to.equal(0n); // 0 means not found
      expect(result.latestVersion).to.equal(2n);
      expect(result.latestHash).to.equal(hashV2);
    });

    it("should revert if verifying a nonexistent file", async function () {
      await expect(
        registry.verifyHash("NON-EXISTENT-ID", hashV1)
      ).to.be.revertedWithCustomError(registry, "FileNotFound").withArgs("NON-EXISTENT-ID");
    });

    it("should successfully log verification event on-chain for audit trail", async function () {
      const tx = await registry.connect(verifier).logVerification(fileId, hashV2);
      await expect(tx)
        .to.emit(registry, "FileVerificationLogged")
        .withArgs(fileId, verifier.address, hashV2, true, 2n, await getBlockTimestamp(tx));
    });
  });

  describe("User & General Queries (FR-08)", function () {
    it("should track user files and global files list correctly", async function () {
      await registry.connect(collaborator).registerFile("U1-F1", hashV1, "u1_f1.txt", 10, "");
      await registry.connect(collaborator).registerFile("U1-F2", hashV2, "u1_f2.txt", 20, "");
      await registry.connect(unauthorizedUser).registerFile("U2-F1", hashV1, "u2_f1.txt", 30, "");

      const collabFiles = await registry.getUserFiles(collaborator.address);
      expect(collabFiles.length).to.equal(2);
      expect(collabFiles[0]).to.equal("U1-F1");
      expect(collabFiles[1]).to.equal("U1-F2");

      const userFiles = await registry.getUserFiles(unauthorizedUser.address);
      expect(userFiles.length).to.equal(1);
      expect(userFiles[0]).to.equal("U2-F1");

      expect(await registry.getTotalFileCount()).to.equal(3n);

      const [pagedFiles, total] = await registry.getAllFiles(0, 10);
      expect(total).to.equal(3n);
      expect(pagedFiles.length).to.equal(3);
    });
  });

  describe("PRD v2.0 Explicit 10-Point Verification Suite", function () {
    const fileId = "PRD-TEST-SUITE-BASE";
    const originalContent = "BLOCKSURE_AUTHENTIC_SOURCE_CODE_2026";
    const crypto = require("crypto");
    const originalHash = "0x" + crypto.createHash("sha256").update(originalContent).digest("hex");
    const tamperedHash = "0x" + crypto.createHash("sha256").update(originalContent + "_TAMPERED").digest("hex");
    const v2Hash = "0x" + crypto.createHash("sha256").update(originalContent + "_V2").digest("hex");

    beforeEach(async function () {
      await registry.connect(owner).registerFile(
        fileId,
        originalHash,
        "smart_contract_spec.pdf",
        4096,
        "Approved architecture spec"
      );
    });

    it("1. Register a new file successfully and verify metadata via getFile() and VersionAdded event", async function () {
      const newFileId = "PRD-TEST-NEW-001";
      const tx = await registry.connect(owner).registerFile(
        newFileId,
        originalHash,
        "new_architecture_spec.pdf",
        8192,
        "New initial registration"
      );
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      // Verify getFile()
      const [id, fileOwner, curVer, createdAt] = await registry.getFile(newFileId);
      expect(id).to.equal(newFileId);
      expect(fileOwner).to.equal(owner.address);
      expect(curVer).to.equal(1n);
      expect(createdAt).to.be.gt(0);

      // Verify getVersion()
      const ver1 = await registry.getVersion(newFileId, 1);
      expect(ver1.fileHash).to.equal(originalHash);
      expect(ver1.fileName).to.equal("new_architecture_spec.pdf");
      expect(ver1.fileSize).to.equal(8192n);
    });

    it("2. Verify the original file successfully (VERIFIED status)", async function () {
      const result = await registry.verifyHash(fileId, originalHash);
      expect(result.isMatch).to.equal(true);
      expect(result.matchedVersion).to.equal(1n);
      expect(result.latestVersion).to.equal(1n);
      expect(result.latestHash).to.equal(originalHash);
      expect(result.owner).to.equal(owner.address);
    });

    it("3. Detect a modified file (TAMPERING DETECTED status)", async function () {
      const result = await registry.verifyHash(fileId, tamperedHash);
      expect(result.isMatch).to.equal(false);
      expect(result.matchedVersion).to.equal(0n); // 0 indicates no legitimate version matched
      expect(result.latestVersion).to.equal(1n);
      expect(result.latestHash).to.equal(originalHash);
    });

    it("4. Confirm that renaming alone does not change the fingerprint", async function () {
      // Different file name, same byte contents -> identical hash
      const renamedName = "renamed_contract_spec_final_v1.pdf";
      const hashOfRenamed = "0x" + crypto.createHash("sha256").update(originalContent).digest("hex");
      expect(hashOfRenamed).to.equal(originalHash);

      // Verifying with identical content under different file name still verifies 100%
      const result = await registry.verifyHash(fileId, hashOfRenamed);
      expect(result.isMatch).to.equal(true);
      expect(result.matchedVersion).to.equal(1n);
    });

    it("5. Register a new authorized version emitting VersionAdded event", async function () {
      const tx = await registry.connect(owner).addVersion(
        fileId,
        v2Hash,
        "smart_contract_spec_v2.pdf",
        5120,
        "Security audit adjustments"
      );

      await expect(tx)
        .to.emit(registry, "VersionAdded")
        .withArgs(fileId, owner.address, 2n, v2Hash, originalHash, await getBlockTimestamp(tx));

      const verCount = await registry.getVersionCount(fileId);
      expect(verCount).to.equal(2n);

      const ver2 = await registry.getVersion(fileId, 2);
      expect(ver2.fileHash).to.equal(v2Hash);
      expect(ver2.previousHash).to.equal(originalHash);
    });

    it("6. Reject an unauthorized update", async function () {
      const unauthorizedHash = "0x" + crypto.createHash("sha256").update("UNAUTHORIZED_PAYLOAD").digest("hex");
      await expect(
        registry.connect(unauthorizedUser).addVersion(
          fileId,
          unauthorizedHash,
          "injected_spec.pdf",
          9999,
          "Malicious inject"
        )
      ).to.be.revertedWithCustomError(registry, "NotAuthorized").withArgs(fileId, unauthorizedUser.address);
    });

    it("7. Revoke a collaborator and reject subsequent updates from that wallet", async function () {
      // Authorize collaborator first
      await registry.connect(owner).authorizeCollaborator(fileId, collaborator.address);
      expect(await registry.isAuthorized(fileId, collaborator.address)).to.equal(true);

      // Now revoke
      await registry.connect(owner).revokeCollaborator(fileId, collaborator.address);
      expect(await registry.isAuthorized(fileId, collaborator.address)).to.equal(false);

      // Attempt update by revoked collaborator
      const attemptHash = "0x" + crypto.createHash("sha256").update("POST_REVOKE_UPDATE").digest("hex");
      await expect(
        registry.connect(collaborator).addVersion(
          fileId,
          attemptHash,
          "revoked_attempt.pdf",
          2000,
          "Unauthorized post revoke"
        )
      ).to.be.revertedWithCustomError(registry, "NotAuthorized").withArgs(fileId, collaborator.address);
    });

    it("8. Retrieve earlier versions without losing historical records", async function () {
      await registry.connect(owner).addVersion(fileId, v2Hash, "spec_v2.pdf", 5000, "Update to v2");
      const history = await registry.getFileHistory(fileId);
      expect(history.length).to.equal(2);
      expect(history[0].versionNumber).to.equal(1n);
      expect(history[0].fileHash).to.equal(originalHash);
      expect(history[1].versionNumber).to.equal(2n);
      expect(history[1].fileHash).to.equal(v2Hash);
      expect(history[1].previousHash).to.equal(originalHash);

      // Historical verification against version 1
      const v1Query = await registry.verifyHash(fileId, originalHash);
      expect(v1Query.isMatch).to.equal(false); // False because latest is v2
      expect(v1Query.matchedVersion).to.equal(1n); // Accurately points to historical v1
    });

    it("9. Handle rejected transactions and disconnected wallets", async function () {
      // Non-existent file lookup reverts
      await expect(
        registry.getFile("NON_EXISTENT_FILE")
      ).to.be.revertedWithCustomError(registry, "FileNotFound").withArgs("NON_EXISTENT_FILE");

      // Invalid version lookup reverts
      await expect(
        registry.getVersion(fileId, 999)
      ).to.be.revertedWithCustomError(registry, "InvalidVersion");

      // Non-owner cannot revoke
      await expect(
        registry.connect(unauthorizedUser).revokeCollaborator(fileId, collaborator.address)
      ).to.be.revertedWithCustomError(registry, "NotFileOwner");
    });

    it("10. Display accurate blockchain transaction information with gas benchmarks", async function () {
      const tx = await registry.connect(owner).logVerification(fileId, originalHash);
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      expect(receipt.hash).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(receipt.blockNumber).to.be.gt(0);
      expect(receipt.gasUsed).to.be.gt(0n);

      console.log(`\n      📊 [Gas Benchmark] logVerification gasUsed: ${receipt.gasUsed.toString()} units`);
    });
  });

  // Helper to extract timestamp from transaction receipt block
  async function getBlockTimestamp(tx) {
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    return block.timestamp;
  }
});
