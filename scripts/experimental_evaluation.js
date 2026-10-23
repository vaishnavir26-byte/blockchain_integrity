const hre = require("hardhat");
const crypto = require("crypto");
const path = require("path");

async function runExperimentalEvaluation() {
  console.log("==========================================================================");
  console.log("             BLOCKSURE EMPIRICAL EXPERIMENTAL EVALUATION SUITE            ");
  console.log("==========================================================================");
  console.log("Evaluating PRD Section 8 Criteria:");
  console.log(" [1] Hash-Detection Accuracy & Avalanche Sensitivity");
  console.log(" [2] SHA-256 Hashing Throughput & Latency Across Payload Sizes");
  console.log(" [3] Smart Contract Gas Consumption Profile");
  console.log(" [4] End-to-End Transaction Confirmation & Query Latencies");
  console.log("==========================================================================\n");

  const [owner, collaborator] = await hre.ethers.getSigners();
  const FileIntegrityRegistry = await hre.ethers.getContractFactory("FileIntegrityRegistry");
  const registry = await FileIntegrityRegistry.deploy();
  await registry.waitForDeployment();
  const contractAddress = await registry.getAddress();

  console.log(`Contract deployed for evaluation at: ${contractAddress}\n`);

  // =========================================================================
  // EXPERIMENT 1: HASH-DETECTION ACCURACY & SENSITIVITY (AVALANCHE EFFECT)
  // =========================================================================
  console.log("--------------------------------------------------------------------------");
  console.log("  EXPERIMENT 1: Hash-Detection Accuracy & Modification Sensitivity");
  console.log("--------------------------------------------------------------------------");

  const baseText = "BlockSure Cryptographic File Integrity Protocol 2026 - Official Specification.";
  const baseHash = "0x" + crypto.createHash("sha256").update(baseText).digest("hex");

  // Register base record
  const fileId = "EXP-TEST-ACCURACY-" + Date.now();
  await registry.connect(owner).registerFile(fileId, baseHash, "specification.pdf", Buffer.byteLength(baseText), "Benchmark base");

  const testVariations = [
    {
      description: "Identical Content (Control Group)",
      modifiedContent: baseText,
      expectedOutcome: "VERIFIED",
      shouldMatch: true
    },
    {
      description: "Renamed File (Same Bytes, Different Filename)",
      modifiedContent: baseText,
      expectedOutcome: "VERIFIED",
      shouldMatch: true,
      filename: "renamed_architecture_v1.pdf"
    },
    {
      description: "Single Character Alteration (Period to Exclamation)",
      modifiedContent: baseText.slice(0, -1) + "!",
      expectedOutcome: "TAMPERING_DETECTED",
      shouldMatch: false
    },
    {
      description: "Single Bit Alteration in Middle of String",
      modifiedContent: baseText.slice(0, 20) + "d" + baseText.slice(21),
      expectedOutcome: "TAMPERING_DETECTED",
      shouldMatch: false
    },
    {
      description: "Single Whitespace Insertion",
      modifiedContent: baseText + " ",
      expectedOutcome: "TAMPERING_DETECTED",
      shouldMatch: false
    },
    {
      description: "Character Case Flip ('Official' -> 'official')",
      modifiedContent: baseText.replace("Official", "official"),
      expectedOutcome: "TAMPERING_DETECTED",
      shouldMatch: false
    },
    {
      description: "Entire Payload Substitution",
      modifiedContent: "MALICIOUS_PAYLOAD_FORGERY_DETECTED",
      expectedOutcome: "TAMPERING_DETECTED",
      shouldMatch: false
    }
  ];

  let accuracySuccesses = 0;
  console.log(`Base SHA-256 Digest: ${baseHash}\n`);

  for (let i = 0; i < testVariations.length; i++) {
    const item = testVariations[i];
    const computedHash = "0x" + crypto.createHash("sha256").update(item.modifiedContent).digest("hex");

    const [isMatch, matchedVersion, latestVersion] = await registry.verifyHash(fileId, computedHash);
    
    const isCorrect = (isMatch === item.shouldMatch);
    if (isCorrect) accuracySuccesses++;

    const statusLabel = isMatch ? "VERIFIED (100% Match)" : "TAMPERING DETECTED";
    console.log(` [1.${i + 1}] ${item.description}`);
    console.log(`      Computed Digest: ${computedHash.slice(0, 26)}...`);
    console.log(`      Outcome:         ${statusLabel} | Expected: ${item.expectedOutcome} => ${isCorrect ? "PASSED (100% Accurate)" : "FAILED"}`);
  }

  const accuracyRate = (accuracySuccesses / testVariations.length) * 100;
  console.log(`\n  >> Hash-Detection Accuracy Rate: ${accuracyRate.toFixed(1)}% (${accuracySuccesses}/${testVariations.length} correct detections)\n`);

  // =========================================================================
  // EXPERIMENT 2: SHA-256 HASHING LATENCY & THROUGHPUT (ACROSS PAYLOAD SIZES)
  // =========================================================================
  console.log("--------------------------------------------------------------------------");
  console.log("  EXPERIMENT 2: SHA-256 Hashing Latency & Throughput Benchmark");
  console.log("--------------------------------------------------------------------------");

  const payloadSizes = [
    { label: "1 KB", bytes: 1024 },
    { label: "64 KB", bytes: 64 * 1024 },
    { label: "512 KB", bytes: 512 * 1024 },
    { label: "1 MB", bytes: 1024 * 1024 },
    { label: "5 MB", bytes: 5 * 1024 * 1024 },
    { label: "10 MB", bytes: 10 * 1024 * 1024 }
  ];

  console.log("Payload Size | Hashing Time (ms) | Throughput (MB/s) | Digest Sample");
  console.log("-------------+--------------------+-------------------+--------------------------------");

  for (const item of payloadSizes) {
    const dummyBuffer = Buffer.alloc(item.bytes, 0x42);

    const t0 = process.hrtime.bigint();
    const hash = crypto.createHash("sha256").update(dummyBuffer).digest("hex");
    const t1 = process.hrtime.bigint();

    const elapsedMs = Number(t1 - t0) / 1e6;
    const sizeMB = item.bytes / (1024 * 1024);
    const throughput = sizeMB / (elapsedMs / 1000);

    console.log(
      `${item.label.padEnd(12)} | ${elapsedMs.toFixed(3).padStart(18)} | ${throughput.toFixed(2).padStart(17)} | 0x${hash.slice(0, 16)}...`
    );
  }
  console.log("");

  // =========================================================================
  // EXPERIMENT 3: SMART CONTRACT GAS CONSUMPTION
  // =========================================================================
  console.log("--------------------------------------------------------------------------");
  console.log("  EXPERIMENT 3: Smart Contract Gas Consumption Profile");
  console.log("--------------------------------------------------------------------------");

  const gasTable = [];

  // Contract Deployment
  const deployReceipt = await registry.deploymentTransaction().wait();
  gasTable.push({
    Operation: "Contract Deployment",
    GasUnits: deployReceipt.gasUsed.toString(),
    CostAt20GweiETH: (Number(deployReceipt.gasUsed) * 20e-9).toFixed(6) + " ETH",
    StateImpact: "Storage of bytecode & initial state"
  });

  // 1. Initial File Registration (registerFile)
  const regHashV1 = "0x" + crypto.createHash("sha256").update("BENCHMARK_FILE_V1").digest("hex");
  const benchFileId = "BENCH-" + Date.now();
  const regTx = await registry.connect(owner).registerFile(benchFileId, regHashV1, "spec_v1.pdf", 204800, "V1 Release");
  const regReceipt = await regTx.wait();
  gasTable.push({
    Operation: "registerFile() (Initial v1)",
    GasUnits: regReceipt.gasUsed.toString(),
    CostAt20GweiETH: (Number(regReceipt.gasUsed) * 20e-9).toFixed(6) + " ETH",
    StateImpact: "FileRecord, VersionRecord[1], and index arrays"
  });

  // 2. Authorize Collaborator (authorizeCollaborator)
  const authTx = await registry.connect(owner).authorizeCollaborator(benchFileId, collaborator.address);
  const authReceipt = await authTx.wait();
  gasTable.push({
    Operation: "authorizeCollaborator()",
    GasUnits: authReceipt.gasUsed.toString(),
    CostAt20GweiETH: (Number(authReceipt.gasUsed) * 20e-9).toFixed(6) + " ETH",
    StateImpact: "Collaborator mapping & address list append"
  });

  // 3. Add Authorized Version (addVersion / registerNewVersion)
  const regHashV2 = "0x" + crypto.createHash("sha256").update("BENCHMARK_FILE_V2").digest("hex");
  const addVerTx = await registry.connect(collaborator).addVersion(benchFileId, regHashV2, "spec_v2.pdf", 215000, "Collaborator Update");
  const addVerReceipt = await addVerTx.wait();
  gasTable.push({
    Operation: "addVersion() (v2 Update)",
    GasUnits: addVerReceipt.gasUsed.toString(),
    CostAt20GweiETH: (Number(addVerReceipt.gasUsed) * 20e-9).toFixed(6) + " ETH",
    StateImpact: "VersionRecord[2], pointer to v1 hash, version counter"
  });

  // 4. Revoke Collaborator (revokeCollaborator)
  const revTx = await registry.connect(owner).revokeCollaborator(benchFileId, collaborator.address);
  const revReceipt = await revTx.wait();
  gasTable.push({
    Operation: "revokeCollaborator()",
    GasUnits: revReceipt.gasUsed.toString(),
    CostAt20GweiETH: (Number(revReceipt.gasUsed) * 20e-9).toFixed(6) + " ETH",
    StateImpact: "Collaborator mapping unset, dynamic list swap & pop"
  });

  // 5. Log Verification On-Chain (logVerification)
  const logTx = await registry.connect(owner).logVerification(benchFileId, regHashV2);
  const logReceipt = await logTx.wait();
  gasTable.push({
    Operation: "logVerification() (Audit)",
    GasUnits: logReceipt.gasUsed.toString(),
    CostAt20GweiETH: (Number(logReceipt.gasUsed) * 20e-9).toFixed(6) + " ETH",
    StateImpact: "Emits FileVerificationLogged event"
  });

  // 6. View Queries (verifyHash, getFile, getVersion)
  gasTable.push({
    Operation: "verifyHash() (Read-Only)",
    GasUnits: "0 (FREE)",
    CostAt20GweiETH: "0.000000 ETH",
    StateImpact: "O(1) read-only EVM view call"
  });
  gasTable.push({
    Operation: "getFile() (Read-Only)",
    GasUnits: "0 (FREE)",
    CostAt20GweiETH: "0.000000 ETH",
    StateImpact: "Read-only metadata retrieval"
  });

  console.table(gasTable);

  // =========================================================================
  // EXPERIMENT 4: TRANSACTION CONFIRMATION & QUERY LATENCIES
  // =========================================================================
  console.log("--------------------------------------------------------------------------");
  console.log("  EXPERIMENT 4: Transaction Confirmation & Query Latency Benchmark");
  console.log("--------------------------------------------------------------------------");

  // Read Query Latency over 20 iterations
  const queryLatencies = [];
  for (let i = 0; i < 20; i++) {
    const tStart = process.hrtime.bigint();
    await registry.verifyHash(benchFileId, regHashV2);
    const tEnd = process.hrtime.bigint();
    queryLatencies.push(Number(tEnd - tStart) / 1e6);
  }

  const avgQueryMs = queryLatencies.reduce((a, b) => a + b, 0) / queryLatencies.length;
  const minQueryMs = Math.min(...queryLatencies);
  const maxQueryMs = Math.max(...queryLatencies);

  console.log(` [Read Latency - verifyHash()]:`);
  console.log(`    Samples: 20 queries`);
  console.log(`    Average Latency: ${avgQueryMs.toFixed(2)} ms`);
  console.log(`    Min / Max:       ${minQueryMs.toFixed(2)} ms / ${maxQueryMs.toFixed(2)} ms\n`);

  // Write Confirmation Latency over 5 transactions
  const txConfirmLatencies = [];
  for (let i = 1; i <= 5; i++) {
    const nextHash = "0x" + crypto.createHash("sha256").update(`TX_BENCHMARK_${i}_${Date.now()}`).digest("hex");
    const tStart = process.hrtime.bigint();
    const tx = await registry.connect(owner).registerFile(`LATENCY-${Date.now()}-${i}`, nextHash, `doc_${i}.txt`, 1000, `Benchmark ${i}`);
    await tx.wait();
    const tEnd = process.hrtime.bigint();
    txConfirmLatencies.push(Number(tEnd - tStart) / 1e6);
  }

  const avgTxMs = txConfirmLatencies.reduce((a, b) => a + b, 0) / txConfirmLatencies.length;
  const minTxMs = Math.min(...txConfirmLatencies);
  const maxTxMs = Math.max(...txConfirmLatencies);

  console.log(` [Write Latency - Transaction Confirmation]:`);
  console.log(`    Samples: 5 on-chain write transactions`);
  console.log(`    Average Confirmation Time: ${avgTxMs.toFixed(2)} ms`);
  console.log(`    Min / Max:                 ${minTxMs.toFixed(2)} ms / ${maxTxMs.toFixed(2)} ms`);

  console.log("\n==========================================================================");
  console.log("           ALL EXPERIMENTAL EVALUATION TESTS COMPLETED SUCCESSFULLY       ");
  console.log("==========================================================================");
}

runExperimentalEvaluation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Benchmark failed:", err);
    process.exit(1);
  });
