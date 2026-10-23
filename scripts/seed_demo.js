const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function main() {
  console.log("-----------------------------------------------------");
  console.log("Seeding demo data into FileIntegrityRegistry...");
  console.log("-----------------------------------------------------");

  const [owner, collaborator] = await hre.ethers.getSigners();
  const contractInfo = require("../frontend/src/contracts/contractInfo.json");
  const FileIntegrityRegistry = await hre.ethers.getContractFactory("FileIntegrityRegistry");
  const registry = FileIntegrityRegistry.attach(contractInfo.address);

  // 1. Compute SHA-256 for sample_files/document_v1.txt
  const file1Path = path.join(__dirname, "../sample_files/document_v1.txt");
  const file1Bytes = fs.readFileSync(file1Path);
  const hashV1 = "0x" + crypto.createHash("sha256").update(file1Bytes).digest("hex");

  const file2Path = path.join(__dirname, "../sample_files/document_v2.txt");
  const file2Bytes = fs.readFileSync(file2Path);
  const hashV2 = "0x" + crypto.createHash("sha256").update(file2Bytes).digest("hex");

  const fileId = "SPEC-SEC-2026";

  console.log("File ID:", fileId);
  console.log("Document v1 Hash:", hashV1);
  console.log("Document v2 Hash:", hashV2);

  // Check if file already exists
  const exists = await registry.fileExists(fileId);
  if (!exists) {
    console.log("Registering Version 1 (owner)...");
    const tx1 = await registry.connect(owner).registerFile(
      fileId,
      hashV1,
      "document_v1.txt",
      file1Bytes.length,
      "Initial specification v1.0 release"
    );
    await tx1.wait();
    console.log("Version 1 registered successfully!");

    console.log("Authorizing collaborator:", collaborator.address);
    const txAuth = await registry.connect(owner).authorizeCollaborator(fileId, collaborator.address);
    await txAuth.wait();
    console.log("Collaborator authorized successfully!");

    console.log("Registering Version 2 (collaborator)...");
    const tx2 = await registry.connect(collaborator).registerNewVersion(
      fileId,
      hashV2,
      "document_v2.txt",
      file2Bytes.length,
      "Version 2.0 authorized update with refined security parameters"
    );
    await tx2.wait();
    console.log("Version 2 registered successfully!");
  } else {
    console.log("File already seeded!");
  }

  console.log("-----------------------------------------------------");
  console.log("Demo seed complete!");
  console.log("-----------------------------------------------------");
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
