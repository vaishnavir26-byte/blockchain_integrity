const { ethers } = require("ethers");
const http = require("http");
const fs = require("fs");
const path = require("path");

async function checkSystem() {
  console.log("======================================================");
  console.log("  BLOCKSURE SYSTEM HEALTHCHECK");
  console.log("======================================================");

  let nodeHealthy = false;
  let contractHealthy = false;
  let frontendHealthy = false;

  // 1. Check Hardhat Node & RPC (port 8545)
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log(`[1] EVM Node (port 8545):       ACTIVE (Chain ID: ${network.chainId}, Block #${blockNumber})`);
    nodeHealthy = true;

    // 2. Check Smart Contract on-chain
    const contractInfoPath = path.join(__dirname, "../frontend/src/contracts/contractInfo.json");
    const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, "utf8"));
    const contract = new ethers.Contract(contractInfo.address, contractInfo.abi, provider);

    const totalFiles = await contract.getTotalFileCount();
    const seededExists = await contract.fileExists("SPEC-SEC-2026");

    console.log(`[2] Smart Contract:             DEPLOYED to ${contractInfo.address}`);
    console.log(`    - Total Files Registered:   ${totalFiles}`);
    console.log(`    - Test Record (SPEC-SEC-2026): ${seededExists ? "FOUND" : "NOT FOUND"}`);

    if (seededExists) {
      const latest = await contract.getLatestVersion("SPEC-SEC-2026");
      console.log(`    - Current Active Version:   v${latest.versionNumber} (${latest.fileName})`);
      console.log(`    - Active Hash:              ${latest.fileHash.slice(0, 18)}...`);
      console.log(`    - Registered Owner:         ${latest.owner}`);

      // Verify legitimate hash
      const [isMatch] = await contract.verifyHash("SPEC-SEC-2026", latest.fileHash);
      console.log(`    - Integrity Verification:   ${isMatch ? "VERIFIED (100% Match)" : "MISMATCH"}`);

      // Verify tampered hash
      const fakeHash = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const [fakeMatch, matchedVer] = await contract.verifyHash("SPEC-SEC-2026", fakeHash);
      console.log(`    - Tamper Detection Test:    ${!fakeMatch && matchedVer === 0n ? "PASSED (Tampering Detected)" : "FAILED"}`);
    }
    contractHealthy = true;
  } catch (err) {
    console.error("[1/2] Blockchain RPC Error:", err.message);
  }

  // 3. Check Vite Frontend (port 5173)
  try {
    await new Promise((resolve, reject) => {
      const req = http.get("http://localhost:5173", (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          console.log(`[3] Frontend Web App (port 5173): ACTIVE (HTTP ${res.statusCode} OK)`);
          frontendHealthy = true;
          resolve();
        } else {
          console.log(`[3] Frontend Web App (port 5173): Responded with HTTP ${res.statusCode}`);
          resolve();
        }
      });
      req.on("error", (e) => {
        console.log(`[3] Frontend Web App (port 5173): OFFLINE (${e.message})`);
        resolve();
      });
      req.setTimeout(2000, () => {
        req.destroy();
        console.log("[3] Frontend Web App: Timeout");
        resolve();
      });
    });
  } catch (err) {
    console.error("[3] Frontend Check Error:", err.message);
  }

  console.log("======================================================");
  if (nodeHealthy && contractHealthy && frontendHealthy) {
    console.log("  >>> ALL SYSTEMS FULLY OPERATIONAL AND VERIFIED <<<");
  } else {
    console.log("  >>> WARNING: Some services require attention <<<");
  }
  console.log("======================================================");
}

checkSystem();
