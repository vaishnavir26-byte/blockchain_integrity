import React, { useState } from "react";
import { Shield, Wallet, CheckCircle2, ChevronDown, Zap, ExternalLink, X, KeyRound, Activity, Archive } from "lucide-react";
import { truncateHash } from "../utils/crypto";

interface NavbarProps {
  account: string | null;
  chainId: bigint | null;
  networkName: string;
  contractAddress: string;
  onConnectMetaMask: () => void;
  onConnectLocalNode: () => void;
  onDisconnect: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  networkName,
  contractAddress,
  onConnectMetaMask,
  onConnectLocalNode,
  onDisconnect,
  activeTab,
  setActiveTab,
}) => {
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "register", label: "Register File" },
    { id: "verify", label: "Verify Integrity" },
    { id: "history", label: "Version Lineage" },
    { id: "access", label: "Access Control" },
    { id: "audit", label: "Audit Trail" },
    { id: "recovery", label: "Backup & Recovery" },
    { id: "benchmark", label: "Performance Lab" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0c101a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setActiveTab("dashboard")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-cyan-400/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                  BlockSure
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  MVP v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Blockchain-Based File Integrity & Provenance System</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-wrap items-center justify-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-slate-800 text-xs sm:text-sm font-medium">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Wallet & Network Info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Network</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {networkName || "Hardhat Localhost (31337)"}
              </span>
            </div>

            {account ? (
              <div className="flex items-center gap-2 bg-[#141d33] border border-cyan-500/30 px-3 py-1.5 rounded-xl shadow-inner">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-mono text-cyan-300 font-medium">
                  {truncateHash(account, 6, 4)}
                </span>
                <button
                  onClick={onDisconnect}
                  className="text-[10px] text-slate-500 hover:text-rose-400 font-sans ml-1"
                  title="Disconnect"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowWalletModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 border border-cyan-400/30 transition-all active:scale-95"
              >
                <Wallet className="w-3.5 h-3.5" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[#111726] border border-cyan-500/30 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Blockchain Wallet</h3>
                  <p className="text-xs text-slate-400">Choose how to sign your transactions</p>
                </div>
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {/* Option 1: Instant Local Node Account */}
              <button
                type="button"
                onClick={() => {
                  setShowWalletModal(false);
                  onConnectLocalNode();
                }}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#17223b] to-[#1c2c4d] hover:from-[#1e2e50] hover:to-[#243963] border border-cyan-500/40 text-left transition-all hover:scale-[1.01] active:scale-95 group shadow-lg"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span className="font-bold text-white text-sm">Local Hardhat Account (Instant)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Connects directly to Node Account #0 with 10,000 ETH. <strong>Zero setup or extension required</strong>.
                </p>
              </button>

              {/* Option 2: MetaMask */}
              <button
                type="button"
                onClick={() => {
                  setShowWalletModal(false);
                  onConnectMetaMask();
                }}
                className="w-full p-4 rounded-2xl bg-[#0c101a] hover:bg-[#131b2e] border border-slate-800 hover:border-indigo-500/50 text-left transition-all hover:scale-[1.01] active:scale-95 group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <span className="font-bold text-white text-sm">MetaMask Browser Wallet</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Extension</span>
                </div>
                <p className="text-xs text-slate-400">
                  Requires MetaMask on <strong>Hardhat Localhost</strong> (RPC: <code>http://127.0.0.1:8545</code>, Chain ID: <code>31337</code>).
                </p>
              </button>
            </div>

            {/* Network Helper Info */}
            <div className="p-3 rounded-xl bg-[#090d16] border border-slate-800/80 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="text-[10px] font-sans font-bold uppercase text-slate-500">MetaMask Network Config:</div>
              <p>RPC URL: <span className="text-cyan-300">http://127.0.0.1:8545</span></p>
              <p>Chain ID: <span className="text-cyan-300">31337</span> • Currency: <span className="text-cyan-300">ETH</span></p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
