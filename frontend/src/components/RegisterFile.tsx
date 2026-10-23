import React, { useState } from "react";
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, ArrowRight, Layers, FilePlus2, Copy } from "lucide-react";
import { computeSHA256, formatBytes, HashResult } from "../utils/crypto";
import { blockchainService } from "../services/contract";

interface RegisterFileProps {
  account: string | null;
  onConnectWallet: () => void;
  onRegisteredSuccess: () => void;
}

export const RegisterFile: React.FC<RegisterFileProps> = ({
  account,
  onConnectWallet,
  onRegisteredSuccess,
}) => {
  const [mode, setMode] = useState<"initial" | "version">("initial");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState<boolean>(false);
  const [hashProgress, setHashProgress] = useState<number>(0);
  const [hashResult, setHashResult] = useState<HashResult | null>(null);

  // Form Fields
  const [fileId, setFileId] = useState<string>("");
  const [metadataNote, setMetadataNote] = useState<string>("");

  // Transaction State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [txReceipt, setTxReceipt] = useState<{ txHash: string; blockNumber: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // File selection and immediate hashing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setTxReceipt(null);
    setErrorMsg(null);
    setHashing(true);
    setHashProgress(0);

    try {
      // Auto-suggest file ID if blank
      if (!fileId) {
        const cleanName = file.name.replace(/[^a-zA-Z0-9_-]/g, "_").toUpperCase();
        setFileId(`DOC-${cleanName.slice(0, 15)}-${Math.floor(1000 + Math.random() * 9000)}`);
      }

      const result = await computeSHA256(file, (p) => setHashProgress(p));
      setHashResult(result);
    } catch (err: any) {
      setErrorMsg("Failed to compute SHA-256 hash: " + (err.message || "Unknown error"));
    } finally {
      setHashing(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      onConnectWallet();
      return;
    }
    if (!selectedFile || !hashResult) {
      setErrorMsg("Please select a file to hash before submitting.");
      return;
    }
    if (!fileId.trim()) {
      setErrorMsg("File Identifier is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setTxReceipt(null);

    try {
      let receipt;
      if (mode === "initial") {
        receipt = await blockchainService.registerFile(
          fileId.trim(),
          hashResult.hashHex,
          selectedFile.name,
          selectedFile.size,
          metadataNote.trim() || "Initial v1 registration"
        );
      } else {
        receipt = await blockchainService.registerNewVersion(
          fileId.trim(),
          hashResult.hashHex,
          selectedFile.name,
          selectedFile.size,
          metadataNote.trim() || "New version release"
        );
      }

      setTxReceipt(receipt);
      onRegisteredSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Blockchain transaction failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Register File Fingerprint</h2>
          <p className="text-sm text-slate-400">
            Anchor cryptographic SHA-256 digests into the FileIntegrityRegistry smart contract.
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="inline-flex bg-[#111726] p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("initial");
              setTxReceipt(null);
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === "initial"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            Initial Version (v1)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("version");
              setTxReceipt(null);
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              mode === "version"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            New Version (v+1)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Upload & Hash Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Select Document
            </label>

            <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl bg-[#0c101a] cursor-pointer transition-colors group">
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition-colors mb-2" />
              <span className="text-sm font-medium text-slate-200 text-center">
                Click to browse or drop file here
              </span>
              <span className="text-xs text-slate-500 mt-1">PDF, DOCX, ZIP, EXE, TXT, or any format</span>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* Selected File Details */}
            {selectedFile && (
              <div className="p-3.5 rounded-xl bg-[#162035] border border-slate-700/70 space-y-2">
                <div className="flex items-center gap-2.5">
                  <File className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-400">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>

                {/* Progress bar during hashing */}
                {hashing && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-cyan-400">
                      <span>Computing SHA-256 digest...</span>
                      <span>{hashProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-150"
                        style={{ width: `${hashProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Hash Output Preview */}
                {hashResult && !hashing && (
                  <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">SHA-256 Digest:</span>
                      <span className="text-emerald-400 text-[10px] font-mono">{hashResult.timeMs} ms</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#090d16] p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300 break-all select-all">
                      <span>{hashResult.hashHex}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(hashResult.hashHex)}
                        className="ml-auto text-slate-500 hover:text-slate-300 p-1"
                        title="Copy Hash"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metadata & Submit Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleRegister} className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Registration Metadata
              </label>
              <span className="text-xs text-slate-500">
                {mode === "initial" ? "Initial v1 registration" : "Creates linked version"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Unique File Identifier <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                  placeholder="e.g. DOC-RESEARCH-2026-001"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c101a] border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 outline-none transition-all font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Unique business key or document slug used to reference this file's version chain.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Changelog Note / Description
                </label>
                <textarea
                  rows={3}
                  value={metadataNote}
                  onChange={(e) => setMetadataNote(e.target.value)}
                  placeholder={
                    mode === "initial"
                      ? "e.g. Initial signed specification draft submitted for peer review"
                      : "e.g. Version 2.0 with corrected data table in Section 4"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c101a] border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 outline-none transition-all resize-none"
                />
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Transaction Error</p>
                  <p className="leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Success Receipt Alert */}
            {txReceipt && (
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Successfully Registered on Blockchain!
                </div>
                <div className="font-mono text-[11px] space-y-1 text-emerald-100/90 pt-1 border-t border-emerald-800/50">
                  <p>Transaction: <span className="text-cyan-300 select-all">{txReceipt.txHash}</span></p>
                  <p>Block Number: #{txReceipt.blockNumber}</p>
                  <p>File ID: <span className="text-white font-bold">{fileId}</span></p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || hashing || !selectedFile}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                  submitting || hashing || !selectedFile
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    : mode === "initial"
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.01] active:scale-95"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-purple-600/30 hover:scale-[1.01] active:scale-95"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting to Blockchain...
                  </>
                ) : hashing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    Hashing File ({hashProgress}%)...
                  </>
                ) : !account ? (
                  "Connect Wallet to Register"
                ) : mode === "initial" ? (
                  <>
                    Sign & Register Initial Version (v1)
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Sign & Register New Version (v+1)
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
