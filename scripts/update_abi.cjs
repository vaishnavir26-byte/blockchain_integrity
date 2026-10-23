const fs = require('fs');
const path = require('path');

const artPath = path.join(__dirname, '../artifacts/contracts/FileIntegrityRegistry.sol/FileIntegrityRegistry.json');
const targetPath = path.join(__dirname, '../frontend/src/contracts/contractInfo.json');

const art = JSON.parse(fs.readFileSync(artPath, 'utf8'));
const current = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

current.abi = art.abi;
fs.writeFileSync(targetPath, JSON.stringify(current, null, 2), 'utf8');

const rawAbiPath = path.join(__dirname, '../frontend/src/contracts/FileIntegrityRegistry.json');
fs.writeFileSync(rawAbiPath, JSON.stringify(art, null, 2), 'utf8');

console.log('ABI synchronized successfully into frontend!');
