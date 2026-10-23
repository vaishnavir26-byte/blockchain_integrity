const hre = require("hardhat");

async function main() {
  console.log("Seeding FileIntegrityRegistry on network:", hre.network.name);
  const [owner] = await hre.ethers.getSigners();
  console.log("Signer address:", owner.address);

  const registry = await hre.ethers.getContractAt(
    "FileIntegrityRegistry",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const fileId = "SPEC-2026-DOC";
  const hashV1 = "0x3c1a71e1d4591e0c7493d334478359e1e9652757aea8422f978532ec3bdaefb7";
  const hashV2 = "0x5596393b9f174b819fc82c8ca4f2d985c28558aeb670180c2c864ab4963ba653";

  // Check if exists
  const exists = await registry.fileExists(fileId);
  if (!exists) {
    console.log(`Registering initial v1 for ${fileId}...`);
    const tx1 = await registry.registerFile(
      fileId,
      hashV1,
      "document_v1.txt",
      1044,
      "Official baseline release v1.0"
    );
    await tx1.wait();
    console.log("Registered v1 successfully!");

    console.log(`Registering new version v2 for ${fileId}...`);
    const tx2 = await registry.registerNewVersion(
      fileId,
      hashV2,
      "document_v2.txt",
      1024,
      "Approved revised amendment v2.0"
    );
    await tx2.wait();
    console.log("Registered v2 successfully!");
  } else {
    console.log(`File ${fileId} already seeded.`);
  }

  const latest = await registry.getLatestVersion(fileId);
  console.log("Latest version on-chain:", latest.versionNumber.toString(), "Hash:", latest.fileHash);
  console.log("Total registered files:", (await registry.getTotalFileCount()).toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
