import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle, FileCheck, Loader2, ArrowRight, UploadCloud, Copy, File, Clock, User, CheckCircle2, RefreshCw } from "lucide-react";
import { computeSHA256, formatBytes, truncateHash, HashResult } from "../utils/crypto";
import { blockchainService, VerificationResultData } from "../services/contract";

interface VerifyFileProps {
  onNavigateToHistory: (fileId: string) => void;
  initialFileId?: string;
}

export const VerifyFile: React.FC<VerifyFileProps> = ({ onNavigateToHistory, initialFileId = "" }) => {
  const [fileId, setFileId] = useState<string>(initialFileId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState<boolean>(false);
  const [hashResult, setHashResult] = useState<HashResult | null>(null);

  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResultData | null>(null);
  const [loggingAudit, setLoggingAudit] = useState<boolean>(false);
  const [auditTxHash, setAuditTxHash] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableFiles();
  }, []);

  useEffect(() => {
    if (initialFileId) {
      setFileId(initialFileId);
    }
  }, [initialFileId]);

  const loadAvailableFiles = async () => {
    try {
      const { files } = await blockchainService.getAllFiles(0, 50);
      setAvailableFiles(files);
      if (!fileId && files.length > 0 && !initialFileId) {
        setFileId(files[0]);
      }
    } catch (e) {
      console.warn("Could not load available files:", e);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setVerificationResult(null);
    setAuditTxHash(null);
    setHashing(true);

    try {
      const res = await computeSHA256(file);
      setHashResult(res);
    } catch (err: any) {
      alert("Error hashing file: " + err.message);
    } finally {
      setHashing(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileId.trim()) {
      alert("Please enter the File Identifier to verify against.");
      return;
    }
    if (!hashResult) {
      alert("Please select a file to calculate its SHA-256 fingerprint.");
      return;
    }

    setVerifying(true);
    setAuditTxHash(null);

    try {
      const result = await blockchainService.verifyHash(fileId.trim(), hashResult.hashHex);
      setVerificationResult(result);
    } catch (err: any) {
      alert("Verification query failed: " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleLogAudit = async () => {
    if (!fileId || !hashResult) return;
    setLoggingAudit(true);
    try {
      const res = await blockchainService.logVerificationOnChain(fileId.trim(), hashResult.hashHex);
      setAuditTxHash(res.txHash);
    } catch (err: any) {
      alert("Failed to record on-chain verification: " + err.message);
    } finally {
      setLoggingAudit(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            FR-03 • Zero-Knowledge Integrity Verification
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Integrity Verification & Tamper Detection</h2>
          <p className="text-sm text-slate-400">
            Recalculate local SHA-256 hash and verify zero-byte alteration against immutable smart contract records.
          </p>
        </div>

        {availableFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Quick Select:</span>
            <select
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleVerify} className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Target File Identifier
              </label>
              <input
                type="text"
                required
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                placeholder="e.g. SPEC-SEC-2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c101a] border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 outline-none transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Select File to Check
              </label>
              <label className="relative flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl bg-[#0c101a] cursor-pointer transition-colors group">
                <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition-colors mb-1.5" />
                <span className="text-xs font-medium text-slate-200">
                  {selectedFile ? selectedFile.name : "Browse file to verify"}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">PDF, TXT, DOCX, PNG, JPG</span>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            {selectedFile && (
              <div className="p-3.5 rounded-xl bg-[#162035] border border-slate-700/70 space-y-2">
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4 text-cyan-400 shrink-0" />
                  <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Size: {formatBytes(selectedFile.size)}</span>
                  {hashResult && <span className="text-emerald-400">{hashResult.timeMs} ms hashing</span>}
                </div>
                {hashResult && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
                      <span>Calculated SHA-256 Digest:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(hashResult.hashHex, "calculated")}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedKey === "calculated" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="font-mono text-[10px] text-cyan-300 break-all bg-[#090d16] p-1.5 rounded select-all border border-slate-800">
                      {hashResult.hashHex}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || hashing || !selectedFile || !fileId}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                verifying || hashing || !selectedFile || !fileId
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-indigo-600/30 active:scale-95"
              }`}
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Querying Smart Contract...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Verify Hash with Blockchain
                </>
              )}
            </button>
          </form>
        </div>

        {/* Verification Result Display */}
        <div className="lg:col-span-7">
          {verificationResult ? (
            <div className="space-y-4">
              {/* STATUS BANNER */}
              {verificationResult.status === "VERIFIED" && (
                <div className="p-6 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/80 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-900/90 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-600/60 shadow-lg">
                      <ShieldCheck className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-900/90 text-emerald-300 border border-emerald-600">
                        VERIFIED • 100% INTEGRITY MATCH
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1">File Integrity Confirmed</h3>
                    </div>
                  </div>
                  <p className="text-sm text-emerald-200/90 leading-relaxed">
                    {verificationResult.message} The local SHA-256 digest matches the on-chain recorded fingerprint for{" "}
                    <strong>Version {verificationResult.matchedVersion}</strong> without a single bit of difference.
                  </p>
                </div>
              )}

              {verificationResult.status === "MODIFIED" && (
                <div className="p-6 rounded-2xl bg-rose-950/90 border-2 border-rose-500/90 shadow-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-900/90 text-rose-300 flex items-center justify-center shrink-0 border border-rose-600 shadow-lg animate-pulse">
                      <ShieldAlert className="w-7 h-7 text-rose-400" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-rose-900 text-rose-200 border border-rose-600">
                        CRITICAL TAMPERING DETECTED
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1">Hash Mismatch Alert!</h3>
                    </div>
                  </div>
                  <p className="text-sm text-rose-200 leading-relaxed font-medium">
                    {verificationResult.message} This file has been modified, corrupted, or forged after it was registered on the blockchain.
                  </p>
                </div>
              )}

              {verificationResult.status === "LEGITIMATE_OLD_VERSION" && (
                <div className="p-6 rounded-2xl bg-amber-950/80 border-2 border-amber-500/80 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-900/90 text-amber-300 flex items-center justify-center shrink-0 border border-amber-600 shadow-lg">
                      <AlertTriangle className="w-7 h-7 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-amber-900/90 text-amber-300 border border-amber-600">
                        HISTORICAL VERSION
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1">Superseded Version Matched</h3>
                    </div>
                  </div>
                  <p className="text-sm text-amber-200/90 leading-relaxed">
                    {verificationResult.message}
                  </p>
                </div>
              )}

              {verificationResult.status === "NOT_REGISTERED" && (
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-slate-600">
                      <HelpCircle className="w-7 h-7 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        NOT REGISTERED
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1">No Record Found</h3>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {verificationResult.message} You can register this file as a new initial version in the Register tab.
                  </p>
                </div>
              )}

              {/* TECHNICAL FINGERPRINT BREAKDOWN WITH COPY BUTTONS */}
              <div className="p-5 rounded-2xl bg-[#111726] border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cryptographic Digest Comparison</h4>

                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#090d16] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-sans text-slate-400">
                      <span>Calculated Digest (Your File Bytes):</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(hashResult?.hashHex || "", "calc-breakdown")}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedKey === "calc-breakdown" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <span className="text-cyan-300 break-all select-all block">{hashResult?.hashHex}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#090d16] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-sans text-slate-400">
                      <span>Expected Digest On-Chain (Latest v{verificationResult.latestVersion}):</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(verificationResult.latestHash, "expected-breakdown")}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedKey === "expected-breakdown" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <span className={verificationResult.isMatch ? "text-emerald-400 break-all select-all block" : "text-rose-400 break-all select-all block"}>
                      {verificationResult.latestHash}
                    </span>
                  </div>
                </div>

                {/* Additional Metadata */}
                {verificationResult.owner && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Owner: <strong className="text-slate-300 font-mono">{truncateHash(verificationResult.owner, 6, 4)}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Timestamp: <strong className="text-slate-300 font-mono">{verificationResult.timestamp > 0 ? new Date(verificationResult.timestamp * 1000).toLocaleString() : "—"}</strong></span>
                    </div>
                  </div>
                )}

                {/* Actions: View Lineage / Log Audit */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigateToHistory(fileId)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-4 flex items-center gap-1"
                  >
                    View Full Version Lineage & History &rarr;
                  </button>

                  <button
                    type="button"
                    onClick={handleLogAudit}
                    disabled={loggingAudit}
                    className="px-3.5 py-1.5 rounded-lg bg-[#1a233a] hover:bg-[#233050] border border-slate-700 text-xs text-slate-200 font-semibold transition-all flex items-center gap-1.5"
                  >
                    {loggingAudit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    Log Audit On-Chain
                  </button>
                </div>

                {auditTxHash && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-[11px] text-emerald-300 font-mono">
                    Audit Logged On-Chain: {auditTxHash}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-[#111726]/60 border border-slate-800/80 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Ready to Verify</p>
              <p className="text-xs text-slate-500 max-w-sm">
                Provide a File Identifier and select the file from your disk. BlockSure will recalculate its fingerprint and query the blockchain.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
