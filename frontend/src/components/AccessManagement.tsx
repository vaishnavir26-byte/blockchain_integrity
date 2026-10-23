import React, { useState, useEffect } from "react";
import { UserCheck, UserX, UserPlus, Shield, AlertCircle, Loader2, Copy, CheckCircle2, RefreshCw, KeyRound, ExternalLink } from "lucide-react";
import { blockchainService } from "../services/contract";
import { truncateHash } from "../utils/crypto";

interface AccessManagementProps {
  account: string | null;
  onConnectWallet: () => void;
  initialFileId?: string;
}

export const AccessManagement: React.FC<AccessManagementProps> = ({
  account,
  onConnectWallet,
  initialFileId = "",
}) => {
  const [fileId, setFileId] = useState<string>(initialFileId);
  const [loading, setLoading] = useState<boolean>(false);
  const [fileOwner, setFileOwner] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [newCollaborator, setNewCollaborator] = useState<string>("");

  // Transaction states
  const [processing, setProcessing] = useState<boolean>(false);
  const [txReceipt, setTxReceipt] = useState<{ txHash: string; blockNumber: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Available file IDs for quick lookup
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableFiles();
    if (initialFileId) {
      loadAccessDetails(initialFileId);
    }
  }, [initialFileId]);

  const loadAvailableFiles = async () => {
    try {
      const { files } = await blockchainService.getAllFiles(0, 50);
      setAvailableFiles(files);
      if (!fileId && files.length > 0) {
        setFileId(files[0]);
        loadAccessDetails(files[0]);
      }
    } catch (e) {
      console.warn("Could not load files:", e);
    }
  };

  const loadAccessDetails = async (targetId: string) => {
    if (!targetId.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTxReceipt(null);

    try {
      const latest = await blockchainService.getLatestVersion(targetId.trim());
      setFileOwner(latest.owner);

      const collabs = await blockchainService.getCollaborators(targetId.trim());
      setCollaborators(collabs);
    } catch (err: any) {
      setFileOwner(null);
      setCollaborators([]);
      setErrorMsg(err.message || "Failed to retrieve access details for this file.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      onConnectWallet();
      return;
    }
    if (!fileId.trim() || !newCollaborator.trim()) {
      setErrorMsg("File ID and Collaborator address are required.");
      return;
    }

    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTxReceipt(null);

    try {
      const receipt = await blockchainService.authorizeCollaborator(fileId.trim(), newCollaborator.trim());
      setTxReceipt(receipt);
      setSuccessMsg(`Collaborator authorized successfully on-chain!`);
      setNewCollaborator("");
      await loadAccessDetails(fileId.trim());
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authorize collaborator.");
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (collabAddress: string) => {
    if (!account) {
      onConnectWallet();
      return;
    }

    const confirmRevoke = window.confirm(
      `Are you sure you want to revoke update privileges for:\n${collabAddress}?`
    );
    if (!confirmRevoke) return;

    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTxReceipt(null);

    try {
      const receipt = await blockchainService.revokeCollaborator(fileId.trim(), collabAddress);
      setTxReceipt(receipt);
      setSuccessMsg(`Collaborator revoked successfully on-chain.`);
      await loadAccessDetails(fileId.trim());
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to revoke collaborator.");
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const isCurrentAccountOwner =
    account && fileOwner && account.toLowerCase() === fileOwner.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            FR-05 • Smart Contract Access Control
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Collaborator Access Management</h2>
          <p className="text-sm text-slate-400">
            Authorize or revoke collaborator addresses permitted to sign and publish verified file versions.
          </p>
        </div>

        {availableFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Quick Select:</span>
            <select
              value={fileId}
              onChange={(e) => {
                setFileId(e.target.value);
                loadAccessDetails(e.target.value);
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

      {/* Target File Selector */}
      <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              File Identifier
            </label>
            <input
              type="text"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              placeholder="e.g. SPEC-SEC-2026"
              className="w-full px-4 py-2.5 rounded-xl bg-[#0c101a] border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-600 outline-none transition-all font-mono"
            />
          </div>
          <button
            onClick={() => loadAccessDetails(fileId)}
            disabled={loading || !fileId}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#17223b] hover:bg-[#1e2d4f] border border-slate-700 text-slate-200 text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-cyan-400" />}
            Query Access Rules
          </button>
        </div>

        {fileOwner && (
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold text-slate-400">File Owner:</span>
              <span className="font-mono text-xs text-indigo-300 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
                {fileOwner}
              </span>
              <button
                onClick={() => copyToClipboard(fileOwner)}
                className="text-slate-500 hover:text-cyan-400 transition-colors"
                title="Copy Owner Address"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              {isCurrentAccountOwner ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  ✓ Connected Wallet is Owner
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                  Read-Only (Only Owner can edit collaborators)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Status Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/80 flex items-start gap-3 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/80 flex items-start gap-3 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{successMsg}</p>
            {txReceipt && (
              <p className="font-mono text-[11px] text-emerald-300 break-all">
                Transaction: {txReceipt.txHash} (Block #{txReceipt.blockNumber})
              </p>
            )}
          </div>
        </div>
      )}

      {/* Collaborators List & Add Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Collaborators List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                Authorized Collaborators ({collaborators.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">On-Chain Enforced</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                Querying collaborator whitelist...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <Shield className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No external collaborators authorized yet.</p>
                <p className="text-[11px] text-slate-500">Only the file owner ({truncateHash(fileOwner || "", 6, 4)}) can add new versions.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {collaborators.map((collab, idx) => (
                  <div
                    key={collab}
                    className="p-3.5 rounded-xl bg-[#0c101a] border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-white truncate">{collab}</span>
                          <button
                            onClick={() => copyToClipboard(collab)}
                            className="text-slate-500 hover:text-cyan-400 shrink-0"
                            title="Copy Address"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Permitted to sign version updates
                        </span>
                      </div>
                    </div>

                    {isCurrentAccountOwner && (
                      <button
                        onClick={() => handleRevoke(collab)}
                        disabled={processing}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 text-xs font-medium transition-all shrink-0 flex items-center gap-1.5"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Collaborator Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleAuthorize} className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Authorize New Collaborator
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Grant an external Ethereum wallet address permission to submit authorized file updates for this file ID.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Collaborator Wallet Address
              </label>
              <input
                type="text"
                required
                value={newCollaborator}
                onChange={(e) => setNewCollaborator(e.target.value)}
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0c101a] border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs text-white placeholder-slate-600 outline-none transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={processing || !newCollaborator || !fileOwner || !isCurrentAccountOwner}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                processing || !newCollaborator || !fileOwner || !isCurrentAccountOwner
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-indigo-600/30 active:scale-95"
              }`}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting to Blockchain...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Sign & Authorize Collaborator
                </>
              )}
            </button>

            {!isCurrentAccountOwner && fileOwner && (
              <p className="text-[11px] text-amber-400/90 text-center">
                ⚠️ Connect the file owner wallet ({truncateHash(fileOwner, 6, 4)}) to grant update permissions.
              </p>
            )}
          </form>

          {/* Security Notice Card */}
          <div className="p-4 rounded-xl bg-[#0c101a] border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              On-Chain Permission Invariants
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
              <li>Smart contract strictly enforces permissions using <code className="text-cyan-300">msg.sender</code>.</li>
              <li>Unauthorized updates revert immediately with <code className="text-cyan-300">NotAuthorized</code>.</li>
              <li>Revoking access leaves historical versions completely tamper-evident and verifiable.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
