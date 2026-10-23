import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { RegisterFile } from "./components/RegisterFile";
import { VerifyFile } from "./components/VerifyFile";
import { VersionHistory } from "./components/VersionHistory";
import { AccessManagement } from "./components/AccessManagement";
import { AuditTrail } from "./components/AuditTrail";
import { BackupRecovery } from "./components/BackupRecovery";
import { PerformanceBenchmark } from "./components/PerformanceBenchmark";
import { blockchainService } from "./services/contract";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);
  const [networkName, setNetworkName] = useState<string>("Hardhat Localhost (31337)");
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [userFilesCount, setUserFilesCount] = useState<number>(0);
  const [targetFileId, setTargetFileId] = useState<string>("");

  // Connect MetaMask
  const handleConnectMetaMask = async () => {
    try {
      const info = await blockchainService.connectMetaMask();
      setAccount(info.address);
      setChainId(info.chainId);
      setNetworkName(info.networkName);
      loadContractStats(info.address);
    } catch (err: any) {
      alert("MetaMask Notice: " + err.message);
    }
  };

  // Connect Local Node Wallet (Instant 1-click)
  const handleConnectLocalNode = async () => {
    try {
      const info = await blockchainService.connectLocalNodeWallet();
      setAccount(info.address);
      setChainId(info.chainId);
      setNetworkName(info.networkName);
      loadContractStats(info.address);
    } catch (err: any) {
      alert("Local Node Connection: " + err.message);
    }
  };

  const handleDisconnect = () => {
    setAccount(null);
    setUserFilesCount(0);
  };

  // Load stats from contract
  const loadContractStats = async (userAddr?: string) => {
    try {
      const { total } = await blockchainService.getAllFiles(0, 100);
      setTotalFiles(total);

      const target = userAddr || account;
      if (target) {
        const uFiles = await blockchainService.getUserFiles(target);
        setUserFilesCount(uFiles.length);
      }
    } catch (e) {
      console.warn("Could not load stats from contract:", e);
    }
  };

  useEffect(() => {
    loadContractStats();

    // Auto-connect to Local Node Account if no wallet connected
    handleConnectLocalNode();

    // Listen for MetaMask account changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadContractStats(accounts[0]);
        } else {
          handleDisconnect();
        }
      });

      window.ethereum.on?.("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  const handleNavigateWithTarget = (tab: string, fileId?: string) => {
    if (fileId) {
      setTargetFileId(fileId);
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        account={account}
        chainId={chainId}
        networkName={networkName}
        contractAddress={blockchainService.getContractAddress()}
        onConnectMetaMask={handleConnectMetaMask}
        onConnectLocalNode={handleConnectLocalNode}
        onDisconnect={handleDisconnect}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <Dashboard
            account={account}
            totalFiles={totalFiles}
            userFilesCount={userFilesCount}
            contractAddress={blockchainService.getContractAddress()}
            onNavigate={handleNavigateWithTarget}
            onRefresh={() => loadContractStats()}
          />
        )}

        {activeTab === "register" && (
          <RegisterFile
            account={account}
            onConnectWallet={handleConnectLocalNode}
            onRegisteredSuccess={() => loadContractStats()}
          />
        )}

        {activeTab === "verify" && (
          <VerifyFile
            initialFileId={targetFileId}
            onNavigateToHistory={(id) => handleNavigateWithTarget("history", id)}
          />
        )}

        {activeTab === "history" && (
          <VersionHistory initialFileId={targetFileId} />
        )}

        {activeTab === "access" && (
          <AccessManagement
            account={account}
            onConnectWallet={handleConnectLocalNode}
            initialFileId={targetFileId}
          />
        )}

        {activeTab === "audit" && <AuditTrail />}

        {activeTab === "recovery" && <BackupRecovery />}

        {activeTab === "benchmark" && <PerformanceBenchmark />}
      </main>

      <footer className="border-t border-slate-900 bg-[#07090f] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            BlockSure © 2026 • Blockchain-Based Intelligent File Integrity, Provenance & Authorized Update System
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Solidity 0.8.20</span>
            <span>•</span>
            <span>SHA-256 (NIST FIPS 180-4)</span>
            <span>•</span>
            <span>React + Vite + Ethers.js v6</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
