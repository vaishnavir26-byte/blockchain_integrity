import React, { useState, useEffect } from "react";
import { History, GitCommit, FileText, ArrowRight, Loader2, Calendar, User, Hash, Layers, ShieldCheck, Copy, CheckCircle2 } from "lucide-react";
import { formatBytes, truncateHash } from "../utils/crypto";
import { blockchainService, VersionRecordData } from "../services/contract";

interface VersionHistoryProps {
  initialFileId?: string;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({ initialFileId }) => {
  const [fileId, setFileId] = useState<string>(initialFileId || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<VersionRecordData[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (initialFileId) {
      setFileId(initialFileId);
      fetchHistory(initialFileId);
    }
  }, [initialFileId]);

  const loadFiles = async () => {
    try {
      const { files } = await blockchainService.getAllFiles(0, 50);
      setAvailableFiles(files);
      if (!fileId && files.length > 0 && !initialFileId) {
        setFileId(files[0]);
        fetchHistory(files[0]);
      }
    } catch (e) {
      console.warn("Could not load file list:", e);
    }
  };

  const fetchHistory = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const records = await blockchainService.getFileHistory(id.trim());
      setHistory(records);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load version history for this file ID.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(fileId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            FR-06 • Cryptographic Version Lineage
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">File Version Lineage & Provenance</h2>
          <p className="text-sm text-slate-400">
            Inspect the immutable cryptographic evolution of approved versions preserved across the blockchain.
          </p>
        </div>

        {availableFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Quick Select:</span>
            <select
              value={fileId}
              onChange={(e) => {
                setFileId(e.target.value);
                fetchHistory(e.target.value);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#111726] border border-slate-700 text-xs text-cyan-300 font-mono outline-none"
            >
              {availableFiles.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSubmit} className="flex gap-3 p-2 bg-[#111726] rounded-2xl border border-slate-800">
        <input
          type="text"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          placeholder="Enter File Identifier (e.g. SPEC-SEC-2026)"
          className="flex-1 px-4 py-2 bg-transparent text-sm text-white placeholder-slate-500 outline-none font-mono"
        />
        <button
          type="submit"
          disabled={loading || !fileId.trim()}
          className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
          Lookup Lineage
        </button>
      </form>

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Lineage Timeline */}
      {history.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-indigo-500/40 space-y-8 my-6">
          {history.map((ver, idx) => {
            const isLatest = idx === history.length - 1;
            return (
              <div key={ver.versionNumber} className="relative group">
                {/* Node indicator */}
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    isLatest
                      ? "bg-emerald-500 border-emerald-300 text-black shadow-lg shadow-emerald-500/50"
                      : "bg-[#111726] border-indigo-400 text-indigo-300"
                  }`}
                >
                  <span className="text-[10px] font-bold">{ver.versionNumber}</span>
                </div>

                {/* Version Card */}
                <div className={`p-5 rounded-2xl bg-[#111726] border ${isLatest ? "border-emerald-500/50 shadow-emerald-950/30 shadow-lg" : "border-slate-800"} space-y-3`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Version {ver.versionNumber}</span>
                      {isLatest ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Current Active Version
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-slate-800 text-slate-400">
                          Superseded Historical Version
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(ver.timestamp * 1000).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Hash info */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="p-2.5 rounded-xl bg-[#090d16] border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans text-slate-400 font-semibold uppercase">SHA-256 Digest:</span>
                        <button
                          onClick={() => copyToClipboard(ver.fileHash)}
                          className="text-slate-500 hover:text-cyan-400 flex items-center gap-1 text-[11px]"
                          title="Copy Digest"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                      <span className="text-cyan-300 break-all select-all block">{ver.fileHash}</span>
                    </div>

                    {ver.versionNumber > 1 && (
                      <div className="p-2.5 rounded-xl bg-[#090d16] border border-slate-800/60 text-slate-400 space-y-1">
                        <span className="text-[10px] font-sans text-slate-500 font-semibold uppercase block">
                          Cryptographic Parent Pointer (Previous Version Hash):
                        </span>
                        <span className="break-all select-all text-indigo-300/80 block">{ver.previousHash}</span>
                      </div>
                    )}
                  </div>

                  {/* Registered by wallet */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0c101a] px-3 py-1.5 rounded-xl border border-slate-800">
                    <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Registered by Signer:</span>
                    <span className="font-mono text-cyan-300 font-medium">{ver.updater}</span>
                    <button
                      onClick={() => copyToClipboard(ver.updater)}
                      className="text-slate-500 hover:text-cyan-400 ml-auto"
                      title="Copy Signer Address"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {/* File specs & metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800 text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>File: <strong className="text-slate-200">{ver.fileName}</strong></span>
                      <span>•</span>
                      <span>Size: <strong className="text-slate-200">{formatBytes(ver.fileSize)}</strong></span>
                    </div>
                    {ver.metadataNote && (
                      <div className="italic text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
                        "{ver.metadataNote}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading && (
        <div className="p-8 rounded-2xl bg-[#111726]/40 border border-slate-800/70 text-center space-y-2">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-300">No History Loaded</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Search for any registered file ID above to review its full audit lineage and previous version chain.
          </p>
        </div>
      )}
    </div>
  );
};
