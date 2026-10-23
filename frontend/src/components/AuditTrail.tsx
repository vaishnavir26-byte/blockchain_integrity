import React, { useState, useEffect } from "react";
import { History, Shield, CheckCircle2, UserCheck, UserX, FilePlus, Filter, RefreshCw, Copy, ExternalLink, Search, Layers, Clock, Activity } from "lucide-react";
import { blockchainService, AuditTrailEvent } from "../services/contract";
import { truncateHash } from "../utils/crypto";

export const AuditTrail: React.FC = () => {
  const [events, setEvents] = useState<AuditTrailEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const logs = await blockchainService.getAuditEvents();
      setEvents(logs);
    } catch (e) {
      console.warn("Failed to fetch audit events:", e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const filteredEvents = events.filter((ev) => {
    // Type Filter
    if (filterType !== "ALL" && ev.eventType !== filterType) {
      return false;
    }
    // Search Term Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchFile = ev.fileId.toLowerCase().includes(term);
      const matchActor = ev.actor.toLowerCase().includes(term);
      const matchTx = ev.txHash.toLowerCase().includes(term);
      return matchFile || matchActor || matchTx;
    }
    return true;
  });

  const getEventBadge = (type: string) => {
    switch (type) {
      case "FileRegistered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
            <FilePlus className="w-3 h-3 text-cyan-400" />
            File Registered (v1)
          </span>
        );
      case "FileVersionAdded":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
            <Layers className="w-3 h-3 text-indigo-400" />
            New Version Added
          </span>
        );
      case "CollaboratorAuthorized":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            Collaborator Authorized
          </span>
        );
      case "CollaboratorRevoked":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
            <UserX className="w-3 h-3 text-rose-400" />
            Collaborator Revoked
          </span>
        );
      case "FileVerificationLogged":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
            <CheckCircle2 className="w-3 h-3 text-amber-400" />
            Verification Logged
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            FR-07 • Verifiable Blockchain Audit Trail
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Audit Log</h2>
          <p className="text-sm text-slate-400">
            Immutable chronicle of all file registrations, authorized updates, collaborator grants, and on-chain verifications.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#17223b] hover:bg-[#1e2d4f] border border-slate-700 text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
          Refresh Event Logs
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-[#111726] border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: "All Events" },
            { id: "FileRegistered", label: "Registrations" },
            { id: "FileVersionAdded", label: "Versions" },
            { id: "CollaboratorAuthorized", label: "Access Grants" },
            { id: "CollaboratorRevoked", label: "Revocations" },
            { id: "FileVerificationLogged", label: "Verifications" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === btn.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-[#0c101a] text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search File ID, wallet, or tx..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0c101a] border border-slate-700 focus:border-cyan-500 text-xs text-white placeholder-slate-600 outline-none"
          />
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="p-6 rounded-2xl bg-[#111726] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Recorded Ledger Events ({filteredEvents.length})
          </span>
          <span className="text-[11px] text-slate-500">Query direct from EVM event emission</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            Querying smart contract event topics...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
            <History className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No audit events match the selected criteria.</p>
            <p className="text-[11px] text-slate-500">Perform registrations or verifications to see real-time immutable events appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getEventBadge(ev.eventType)}
                    <span className="font-mono text-xs font-bold text-white bg-[#0c101a] px-2 py-0.5 rounded border border-slate-800">
                      {ev.fileId}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(ev.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>

                  {/* Event Details */}
                  <div className="text-xs text-slate-300 space-y-1 pl-1">
                    {ev.eventType === "FileRegistered" && (
                      <p>
                        Initial version registered by <span className="font-mono text-cyan-300">{ev.actor}</span>.
                        Original file: <span className="text-slate-100 font-semibold">{ev.details.fileName}</span>.
                      </p>
                    )}
                    {ev.eventType === "FileVersionAdded" && (
                      <p>
                        Version <span className="font-bold text-white">#{ev.details.versionNumber}</span> created by{" "}
                        <span className="font-mono text-cyan-300">{ev.actor}</span>.
                        Fingerprint: <span className="font-mono text-[11px] text-indigo-300">{truncateHash(ev.details.newHash, 10, 8)}</span>
                      </p>
                    )}
                    {ev.eventType === "CollaboratorAuthorized" && (
                      <p>
                        Owner <span className="font-mono text-cyan-300">{truncateHash(ev.actor, 6, 4)}</span> granted update permission to{" "}
                        <span className="font-mono text-emerald-300 font-semibold">{ev.details.collaborator}</span>.
                      </p>
                    )}
                    {ev.eventType === "CollaboratorRevoked" && (
                      <p>
                        Owner <span className="font-mono text-cyan-300">{truncateHash(ev.actor, 6, 4)}</span> revoked update permission from{" "}
                        <span className="font-mono text-rose-300 font-semibold">{ev.details.collaborator}</span>.
                      </p>
                    )}
                    {ev.eventType === "FileVerificationLogged" && (
                      <p>
                        Verifier <span className="font-mono text-cyan-300">{truncateHash(ev.actor, 6, 4)}</span> logged verification outcome:{" "}
                        {ev.details.isMatch ? (
                          <span className="text-emerald-400 font-bold">100% Match (Version #{ev.details.matchedVersion})</span>
                        ) : (
                          <span className="text-rose-400 font-bold">Tampered / Mismatch</span>
                        )}
                        .
                      </p>
                    )}
                  </div>
                </div>

                {/* Tx & Block info */}
                <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Block Number</span>
                    <span className="font-mono text-xs text-slate-300">#{ev.blockNumber}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#0c101a] border border-slate-800 px-2.5 py-1.5 rounded-lg">
                    <span className="font-mono text-xs text-slate-400">
                      {truncateHash(ev.txHash, 6, 4)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(ev.txHash)}
                      className="text-slate-500 hover:text-cyan-400 transition-colors ml-1"
                      title="Copy Transaction Hash"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
