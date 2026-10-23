const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("-----------------------------------------------------");
  console.log("Deploying FileIntegrityRegistry to network:", hre.network.name);
  console.log("-----------------------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const FileIntegrityRegistry = await hre.ethers.getContractFactory("FileIntegrityRegistry");
  const registry = await FileIntegrityRegistry.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log("FileIntegrityRegistry deployed successfully to:", contractAddress);

  // Export contract deployment info for frontend
  const deploymentDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const contractArtifact = await hre.artifacts.readArtifact("FileIntegrityRegistry");

  const contractInfo = {
    address: contractAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId || 31337,
    abi: contractArtifact.abi,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  fs.writeFileSync(
    path.join(deploymentDir, "contractInfo.json"),
    JSON.stringify(contractInfo, null, 2)
  );
  console.log("Exported contract info & ABI to frontend/src/contracts/contractInfo.json");
  console.log("-----------------------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
