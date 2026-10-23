const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

const distDir = path.join(__dirname, "frontend", "dist");
const zipPath = path.join(__dirname, "blocksure_deploy.zip");

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const zip = new AdmZip();
zip.addLocalFolder(distDir);
zip.writeZip(zipPath);

console.log("Created zip successfully with forward slashes at:", zipPath);

// Verify entries
const checkZip = new AdmZip(zipPath);
const entries = checkZip.getEntries();
console.log("Zip entries:");
entries.forEach(e => {
  console.log(" -", e.entryName);
});
