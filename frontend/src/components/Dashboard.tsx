import React, { useState, useEffect } from "react";
import { Shield, FileCheck, History, Activity, Database, Lock, CheckCircle2, ArrowRight, Zap, RefreshCw, KeyRound, Archive, FileText, Search, ExternalLink } from "lucide-react";
import { truncateHash } from "../utils/crypto";
import { blockchainService } from "../services/contract";

interface DashboardProps {
  account: string | null;
  totalFiles: number;
  userFilesCount: number;
  contractAddress: string;
  onNavigate: (tab: string, fileId?: string) => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  account,
  totalFiles,
  userFilesCount,
  contractAddress,
  onNavigate,
  onRefresh,
}) => {
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);

  useEffect(() => {
    loadRecentFiles();
  }, [totalFiles]);

  const loadRecentFiles = async () => {
    setLoadingFiles(true);
    try {
      const { files } = await blockchainService.getAllFiles(0, 8);
      setRecentFiles(files);
    } catch (e) {
      console.warn("Could not load recent files:", e);
    } finally {
      setLoadingFiles(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#11192e] via-[#0d1322] to-[#090d16] border border-cyan-500/20 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            Zero-Knowledge Data Model • Off-Chain Storage
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Cryptographic File Integrity, Provenance & Authorized Updates
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            BlockSure computes SHA-256 digests entirely inside your browser using the Web Crypto API.
            Only cryptographic fingerprints, version trees, and ownership records are recorded on-chain.
            Raw document contents are never transmitted across the network, ensuring complete confidentiality.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate("register")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <FileCheck className="w-4 h-4" />
              Register New File
            </button>
            <button
              onClick={() => onNavigate("verify")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#17223b] hover:bg-[#1e2d4f] border border-slate-700 text-slate-200 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              Verify File Integrity
            </button>
            <button
              onClick={() => onNavigate("access")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#17223b]/50 hover:bg-[#1e2d4f] border border-slate-800 text-slate-300 text-sm font-medium transition-all"
            >
              <KeyRound className="w-4 h-4 text-indigo-400" />
              Access Control
            </button>
            <button
              onClick={() => onNavigate("audit")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#17223b]/50 hover:bg-[#1e2d4f] border border-slate-800 text-slate-300 text-sm font-medium transition-all"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              Audit Trail
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Registered</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-950/70 text-cyan-400 flex items-center justify-center border border-cyan-800/40 group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{totalFiles}</div>
          <p className="text-xs text-slate-400 mt-2">Files indexed across contract</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 hover:border-indigo-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Your Files</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-950/70 text-indigo-400 flex items-center justify-center border border-indigo-800/40 group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">{account ? userFilesCount : "—"}</div>
          <p className="text-xs text-slate-400 mt-2">Owned by connected wallet</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 hover:border-emerald-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Contract Address</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/70 text-emerald-400 flex items-center justify-center border border-emerald-800/40 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-sm font-mono text-emerald-300 font-bold truncate">
            {truncateHash(contractAddress, 6, 6)}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Active on Local EVM
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 hover:border-amber-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Security Standard</span>
            <div className="w-10 h-10 rounded-xl bg-amber-950/70 text-amber-400 flex items-center justify-center border border-amber-800/40 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">SHA-256</div>
          <p className="text-xs text-slate-400 mt-2">NIST FIPS 180-4 standard</p>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="p-8 rounded-3xl bg-[#111726] border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Quick Actions & System Modules</h2>
            <p className="text-sm text-slate-400">Access all core functions of the BlockSure file provenance architecture</p>
          </div>
          <button
            onClick={() => {
              onRefresh();
              loadRecentFiles();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate("register")}
            className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.01] group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 text-cyan-400 flex items-center justify-center border border-cyan-800/40">
                <FileCheck className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h3 className="font-semibold text-white text-sm">Register File (v1)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hash local documents in-browser and publish initial root-of-trust on the blockchain.
            </p>
          </div>

          <div
            onClick={() => onNavigate("verify")}
            className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all hover:scale-[1.01] group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
                <Shield className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="font-semibold text-white text-sm">Verify Integrity</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant 0-gas verification against on-chain hash. Flags any single-byte alteration.
            </p>
          </div>

          <div
            onClick={() => onNavigate("history")}
            className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:scale-[1.01] group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/80 text-indigo-400 flex items-center justify-center border border-indigo-800/40">
                <History className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="font-semibold text-white text-sm">Version Lineage (FR-06)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore the full cryptographic linked chain of approved historical versions.
            </p>
          </div>

          <div
            onClick={() => onNavigate("access")}
            className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.01] group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-950/80 text-purple-400 flex items-center justify-center border border-purple-800/40">
                <KeyRound className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="font-semibold text-white text-sm">Collaborator Access (FR-05)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authorize or revoke external wallet addresses permitted to update file versions.
            </p>
          </div>

          <div
            onClick={() => onNavigate("audit")}
            className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.01] group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 text-cyan-400 flex items-center justify-center border border-cyan-800/40">
                <Activity className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h3 className="font-semibold text-white text-sm">Audit Trail (FR-07)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Review on-chain emitted event logs, transaction hashes, and caller addresses.
            </p>
          </div>

          <div
            onClick={() => onNavigate("recovery")}
            className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all hover:scale-[1.01] group space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
                <Archive className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="font-semibold text-white text-sm">Backup & Recovery (FR-09)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Preserve off-chain backups and cryptographically verify them before restoration.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Files Table */}
      {recentFiles.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#111726] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Indexed Files on Blockchain
              </h3>
              <p className="text-xs text-slate-400">Recently registered documents in the smart contract registry</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">{recentFiles.length} records</span>
          </div>

          <div className="divide-y divide-slate-800">
            {recentFiles.map((fId) => (
              <div key={fId} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-mono text-xs font-bold text-white bg-[#0c101a] px-2.5 py-1 rounded-lg border border-slate-800">
                    {fId}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onNavigate("verify", fId)}
                    className="px-3 py-1 rounded-lg bg-[#17223b] hover:bg-[#1f2e50] text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => onNavigate("history", fId)}
                    className="px-3 py-1 rounded-lg bg-[#17223b] hover:bg-[#1f2e50] text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                  >
                    History
                  </button>
                  <button
                    onClick={() => onNavigate("access", fId)}
                    className="px-3 py-1 rounded-lg bg-[#17223b] hover:bg-[#1f2e50] text-indigo-300 text-xs font-medium border border-indigo-900/60 transition-colors"
                  >
                    Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Architecture 3-Step Overview */}
      <div className="p-8 rounded-3xl bg-[#111726] border border-slate-800 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Security & Verification Workflow</h2>
          <p className="text-sm text-slate-400">How BlockSure guarantees independent, tamper-evident document auditing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800/80 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold text-sm border border-cyan-800/50">
              1
            </div>
            <h3 className="font-semibold text-slate-200 text-sm">Client-Side Hashing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When you pick a file, your browser's Web Crypto API calculates a 256-bit hash. 
              The actual file is never uploaded anywhere.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800/80 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-800/50">
              2
            </div>
            <h3 className="font-semibold text-slate-200 text-sm">On-Chain Anchoring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The hash, file metadata, timestamp, and previous-version pointer are recorded in the smart contract 
              and signed by the owner's Ethereum wallet.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#0c101a] border border-slate-800/80 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-800/50">
              3
            </div>
            <h3 className="font-semibold text-slate-200 text-sm">Independent Audit & Alerts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Anyone with the file can re-verify it anytime. The application compares fresh hashes with on-chain records, 
              instantly flagging even a 1-byte unauthorized alteration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
