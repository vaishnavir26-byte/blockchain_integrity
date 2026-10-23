import React, { useState, useEffect } from "react";
import { Archive, Download, ShieldCheck, ShieldAlert, UploadCloud, RefreshCw, FileText, CheckCircle2, AlertTriangle, ArrowRight, HardDriveDownload } from "lucide-react";
import { computeSHA256, formatBytes, truncateHash } from "../utils/crypto";
import { blockchainService, VerificationResultData } from "../services/contract";

interface LocalBackupRecord {
  fileId: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileDataUrl: string;
  registeredHash: string;
  savedAt: number;
}

const STORAGE_KEY = "blocksure_offchain_backups";

export const BackupRecovery: React.FC = () => {
  const [backups, setBackups] = useState<LocalBackupRecord[]>([]);
  const [fileId, setFileId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingBackup, setSavingBackup] = useState<boolean>(false);
  const [verifyingBackup, setVerifyingBackup] = useState<string | null>(null);
  const [verificationOutcome, setVerificationOutcome] = useState<{ [id: string]: VerificationResultData }>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setBackups(JSON.parse(data));
      }
    } catch (e) {
      console.warn("Could not load backups:", e);
    }
  };

  const handleSaveBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileId.trim() || !selectedFile) {
      alert("Please specify the File ID and select the file to back up.");
      return;
    }

    setSavingBackup(true);
    setStatusMessage(null);

    try {
      // 1. Compute SHA-256
      const hashRes = await computeSHA256(selectedFile);

      // 2. Query blockchain to ensure file is registered and get version
      const onchainVer = await blockchainService.verifyHash(fileId.trim(), hashRes.hashHex);
      if (onchainVer.status === "NOT_REGISTERED") {
        throw new Error(`File ID "${fileId}" is not registered on the blockchain. Register it first.`);
      }

      // 3. Read file data as Base64 Data URL for local off-chain storage
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newBackup: LocalBackupRecord = {
          fileId: fileId.trim(),
          versionNumber: onchainVer.matchedVersion || onchainVer.latestVersion,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type || "application/octet-stream",
          fileDataUrl: dataUrl,
          registeredHash: hashRes.hashHex,
          savedAt: Math.floor(Date.now() / 1000),
        };

        const updated = [...backups.filter((b) => !(b.fileId === newBackup.fileId && b.versionNumber === newBackup.versionNumber)), newBackup];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setBackups(updated);
        setStatusMessage(`Off-chain backup created for ${fileId} (v${newBackup.versionNumber})!`);
        setSelectedFile(null);
        setSavingBackup(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      alert("Backup failed: " + err.message);
      setSavingBackup(false);
    }
  };

  const handleVerifyAndRestore = async (backup: LocalBackupRecord) => {
    setVerifyingBackup(backup.fileId);
    try {
      // Re-verify the backup data hash
      const response = await fetch(backup.fileDataUrl);
      const blob = await response.blob();
      const file = new (window as any).File([blob], backup.fileName);

      const computed = await computeSHA256(file);

      // Verify against the smart contract
      const result = await blockchainService.verifyHash(backup.fileId, computed.hashHex);
      setVerificationOutcome((prev) => ({ ...prev, [backup.fileId]: result }));

      if (result.isMatch || result.matchedVersion > 0) {
        // Trigger download
        const a = document.createElement("a");
        a.href = backup.fileDataUrl;
        a.download = `RESTORED_${backup.fileName}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatusMessage(`File successfully restored and verified from cryptographic backup!`);
      } else {
        alert("SECURITY WARNING: The backup file content has been corrupted or tampered with! Restoration aborted.");
      }
    } catch (e: any) {
      alert("Restoration verification failed: " + e.message);
    } finally {
      setVerifyingBackup(null);
    }
  };

  const handleDeleteBackup = (fileId: string, version: number) => {
    const updated = backups.filter((b) => !(b.fileId === fileId && b.versionNumber === version));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setBackups(updated);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <Archive className="w-3.5 h-3.5 text-cyan-400" />
          FR-09 • Cryptographically Verified Off-Chain Recovery
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Backup & Verified Recovery</h2>
        <p className="text-sm text-slate-400">
          Securely preserve pristine file copies off-chain. Before restoration, the file's SHA-256 fingerprint is verified against the smart contract to prevent corrupted restores.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/80 flex items-center gap-3 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Backup Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleSaveBackup} className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-cyan-400" />
              Create Off-Chain Backup
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Registered File Identifier
              </label>
              <input
                type="text"
                required
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
                placeholder="e.g. SPEC-SEC-2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c101a] border border-slate-700 focus:border-cyan-500 text-xs text-white placeholder-slate-600 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Original Document File
              </label>
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl bg-[#0c101a] cursor-pointer transition-colors group">
                <UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors mb-1" />
                <span className="text-xs text-slate-300">
                  {selectedFile ? selectedFile.name : "Select file to back up"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={savingBackup || !selectedFile || !fileId}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                savingBackup || !selectedFile || !fileId
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-indigo-600/30"
              }`}
            >
              {savingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Hashing & Verifying with Ledger...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Save Verified Backup
                </>
              )}
            </button>
          </form>

          {/* Privacy info */}
          <div className="p-4 rounded-xl bg-[#0c101a] border border-slate-800 space-y-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 block">Off-Chain Preservation Rule (PRD 1.4 & 4.9)</span>
            <p className="text-[11px] leading-relaxed">
              File contents are stored locally off-chain. The blockchain maintains only the cryptographic root-of-truth.
              When restoring, the file hash is dynamically checked against the smart contract to guarantee 0-byte corruption before download.
            </p>
          </div>
        </div>

        {/* Backups List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-cyan-400" />
                Preserved Backups ({backups.length})
              </h3>
              <span className="text-[11px] text-slate-500">Verified Against Smart Contract</span>
            </div>

            {backups.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <Archive className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No off-chain backups saved yet.</p>
                <p className="text-[11px] text-slate-500">Save an off-chain backup of your registered files for tamper-proof recovery.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((b) => {
                  const outcome = verificationOutcome[b.fileId];
                  const isVerifying = verifyingBackup === b.fileId;

                  return (
                    <div
                      key={`${b.fileId}-${b.versionNumber}`}
                      className="p-4 rounded-xl bg-[#0c101a] border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/50 px-2 py-0.5 rounded">
                              {b.fileId}
                            </span>
                            <span className="text-xs font-bold text-white">v{b.versionNumber}</span>
                            <span className="text-xs text-slate-400">({b.fileName})</span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-1">
                            Size: {formatBytes(b.fileSize)} • Saved: {new Date(b.savedAt * 1000).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleVerifyAndRestore(b)}
                            disabled={isVerifying}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-xs font-semibold transition-all shadow-md"
                          >
                            {isVerifying ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                Verify & Restore
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteBackup(b.fileId, b.versionNumber)}
                            className="text-slate-600 hover:text-rose-400 text-xs px-2 py-1"
                            title="Delete Backup"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {outcome && (
                        <div
                          className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                            outcome.isMatch
                              ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300"
                              : "bg-rose-950/60 border border-rose-800/60 text-rose-300"
                          }`}
                        >
                          {outcome.isMatch ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span>{outcome.message}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
