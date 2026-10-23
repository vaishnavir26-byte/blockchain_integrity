import { ethers } from "ethers";
import contractInfo from "../contracts/contractInfo.json";

export interface VersionRecordData {
  versionNumber: number;
  fileHash: string;
  fileName: string;
  fileSize: number;
  timestamp: number;
  previousHash: string;
  metadataNote: string;
  updater: string;
}

export interface VerificationResultData {
  isMatch: boolean;
  matchedVersion: number;
  latestVersion: number;
  latestHash: string;
  owner: string;
  timestamp: number;
  status: "VERIFIED" | "MODIFIED" | "LEGITIMATE_OLD_VERSION" | "NOT_REGISTERED" | "FAILED";
  message: string;
}

export interface AuditTrailEvent {
  id: string;
  eventType: "FileRegistered" | "VersionAdded" | "FileVersionAdded" | "CollaboratorAuthorized" | "CollaboratorRevoked" | "FileVerificationLogged";
  fileId: string;
  actor: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
  details: Record<string, any>;
}

export interface ContractConfig {
  address: string;
  chainId: number;
  networkName: string;
}

// Fallback contract configuration
export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  address: contractInfo.address || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  chainId: 31337,
  networkName: "Hardhat Localhost (Chain ID: 31337)",
};

class BlockchainService {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string = DEFAULT_CONTRACT_CONFIG.address;

  public setContractAddress(addr: string) {
    if (ethers.isAddress(addr)) {
      this.contractAddress = addr;
      this.reinitContract();
    }
  }

  public getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Initializes a read-only provider (Localhost node or RPC via Vite proxy)
   */
  public async getReadOnlyProvider(): Promise<ethers.Provider> {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        return new ethers.BrowserProvider(window.ethereum);
      } catch (e) {
        // fallback
      }
    }
    const rpcUrl = typeof window !== "undefined" && window.location.origin ? `${window.location.origin}/rpc` : "http://127.0.0.1:8545";
    return new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Connect using MetaMask with automatic Hardhat network addition/switching
   */
  public async connectMetaMask(): Promise<{ address: string; chainId: bigint; networkName: string }> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not detected in your browser. You can use 'Local Test Account' instead.");
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);

    // Request accounts
    await this.provider.send("eth_requestAccounts", []);

    // Try to auto-switch to Hardhat Localhost (Chain ID: 31337 -> 0x7a69)
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x7a69" }],
      });
    } catch (switchError: any) {
      // Chain 31337 not added yet to MetaMask
      if (switchError.code === 4902 || switchError?.message?.includes("Unrecognized chain ID")) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x7a69",
                chainName: "Hardhat Localhost",
                rpcUrls: ["http://127.0.0.1:8545"],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          });
        } catch (addError) {
          console.warn("Failed to add Hardhat chain automatically:", addError);
        }
      }
    }

    this.signer = await this.provider.getSigner();
    const address = await this.signer.getAddress();
    const network = await this.provider.getNetwork();

    this.contract = new ethers.Contract(this.contractAddress, contractInfo.abi, this.signer);

    return {
      address,
      chainId: network.chainId,
      networkName: network.chainId === 31337n ? "Hardhat Localhost (31337)" : (network.name || `Chain ${network.chainId}`),
    };
  }

  /**
   * Connect directly to the local Hardhat node account (No browser extension required)
   */
  public async connectLocalNodeWallet(): Promise<{ address: string; chainId: bigint; networkName: string }> {
    const rpcUrl = typeof window !== "undefined" && window.location.origin ? `${window.location.origin}/rpc` : "http://127.0.0.1:8545";
    const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
    this.provider = rpcProvider;

    // Hardhat pre-funded Account #0 private key: 10,000 ETH
    const localWallet = new ethers.Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      rpcProvider
    );
    this.signer = localWallet;

    const address = await localWallet.getAddress();
    let chainId = 31337n;
    try {
      const network = await rpcProvider.getNetwork();
      chainId = network.chainId;
    } catch (e) {
      // default chainId
    }

    this.contract = new ethers.Contract(this.contractAddress, contractInfo.abi, localWallet);

    return {
      address,
      chainId,
      networkName: "Hardhat Account #0 (10,000 ETH)",
    };
  }

  /**
   * Default connect wallet: attempts MetaMask first, otherwise auto-connects to local node wallet
   */
  public async connectWallet(): Promise<{ address: string; chainId: bigint; networkName: string }> {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        return await this.connectMetaMask();
      } catch (err: any) {
        if (err?.code === 4001 || err?.message?.includes("User rejected")) {
          throw err;
        }
        console.warn("MetaMask connection failed, trying Local Node Wallet:", err);
      }
    }

    // Fallback directly to local Hardhat node
    return await this.connectLocalNodeWallet();
  }

  private reinitContract() {
    if (this.signer) {
      this.contract = new ethers.Contract(this.contractAddress, contractInfo.abi, this.signer);
    }
  }

  private async getContractInstance(needSigner: boolean = false): Promise<ethers.Contract> {
    if (needSigner) {
      if (!this.signer) {
        await this.connectWallet();
      }
      return this.contract!;
    }

    if (this.contract) {
      return this.contract;
    }

    const provider = await this.getReadOnlyProvider();
    return new ethers.Contract(this.contractAddress, contractInfo.abi, provider);
  }

  /**
   * Register a new file (v1)
   */
  public async registerFile(
    fileId: string,
    fileHashBytes32: string,
    fileName: string,
    fileSize: number,
    metadataNote: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const contract = await this.getContractInstance(true);

    try {
      const tx = await contract.registerFile(
        fileId,
        fileHashBytes32,
        fileName,
        fileSize,
        metadataNote
      );
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Register a new version of an existing file (Restricted to owner or authorized collaborator)
   */
  public async registerNewVersion(
    fileId: string,
    newHashBytes32: string,
    fileName: string,
    fileSize: number,
    metadataNote: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const contract = await this.getContractInstance(true);

    try {
      const tx = await contract.registerNewVersion(
        fileId,
        newHashBytes32,
        fileName,
        fileSize,
        metadataNote
      );
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Alias for registerNewVersion (PRD Section 5: addVersion)
   */
  public async addVersion(
    fileId: string,
    newHashBytes32: string,
    fileName: string,
    fileSize: number,
    metadataNote: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    return this.registerNewVersion(fileId, newHashBytes32, fileName, fileSize, metadataNote);
  }

  /**
   * Authorize a collaborator wallet address for file updates (Owner only)
   */
  public async authorizeCollaborator(
    fileId: string,
    collaboratorAddress: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const contract = await this.getContractInstance(true);
    try {
      const tx = await contract.authorizeCollaborator(fileId, collaboratorAddress);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Revoke a collaborator wallet address (Owner only)
   */
  public async revokeCollaborator(
    fileId: string,
    collaboratorAddress: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const contract = await this.getContractInstance(true);
    try {
      const tx = await contract.revokeCollaborator(fileId, collaboratorAddress);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Get all active collaborators for a file
   */
  public async getCollaborators(fileId: string): Promise<string[]> {
    const contract = await this.getContractInstance(false);
    try {
      const list = await contract.getCollaborators(fileId);
      return Array.from(list);
    } catch (err) {
      return [];
    }
  }

  /**
   * Check if an address is authorized to update a file (owner or collaborator)
   */
  public async isAuthorized(fileId: string, wallet: string): Promise<boolean> {
    const contract = await this.getContractInstance(false);
    try {
      return await contract.isAuthorized(fileId, wallet);
    } catch (err) {
      return false;
    }
  }

  /**
   * Verify file hash against smart contract
   */
  public async verifyHash(
    fileId: string,
    computedHashBytes32: string
  ): Promise<VerificationResultData> {
    const contract = await this.getContractInstance(false);

    try {
      const [isMatch, matchedVersion, latestVersion, latestHash, owner, timestamp] =
        await contract.verifyHash(fileId, computedHashBytes32);

      const mVer = Number(matchedVersion);
      const lVer = Number(latestVersion);
      const ts = Number(timestamp);

      if (isMatch) {
        return {
          isMatch: true,
          matchedVersion: mVer,
          latestVersion: lVer,
          latestHash,
          owner,
          timestamp: ts,
          status: "VERIFIED",
          message: `Integrity Confirmed! File hash perfectly matches registered Version ${mVer}.`,
        };
      } else if (mVer > 0) {
        return {
          isMatch: false,
          matchedVersion: mVer,
          latestVersion: lVer,
          latestHash,
          owner,
          timestamp: ts,
          status: "LEGITIMATE_OLD_VERSION",
          message: `Historical Version Detected! This file matches Version ${mVer}, but has been superseded by Version ${lVer}.`,
        };
      } else {
        return {
          isMatch: false,
          matchedVersion: 0,
          latestVersion: lVer,
          latestHash,
          owner,
          timestamp: ts,
          status: "MODIFIED",
          message: `TAMPERING ALERT! Computed SHA-256 hash does NOT match the registered blockchain fingerprint (Latest: Version ${lVer}).`,
        };
      }
    } catch (err: any) {
      if (err.message && (err.message.includes("FileNotFound") || err.message.includes("revert"))) {
        return {
          isMatch: false,
          matchedVersion: 0,
          latestVersion: 0,
          latestHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          owner: "0x0000000000000000000000000000000000000000",
          timestamp: 0,
          status: "NOT_REGISTERED",
          message: `File Identifier "${fileId}" is not registered on the blockchain.`,
        };
      }

      return {
        isMatch: false,
        matchedVersion: 0,
        latestVersion: 0,
        latestHash: "",
        owner: "",
        timestamp: 0,
        status: "FAILED",
        message: `Verification failed due to error: ${err.message || "Unknown error"}`,
      };
    }
  }

  /**
   * Log verification on-chain for immutable audit logging
   */
  public async logVerificationOnChain(
    fileId: string,
    computedHashBytes32: string
  ): Promise<{ txHash: string; isMatch: boolean; matchedVersion: number }> {
    const contract = await this.getContractInstance(true);
    try {
      const tx = await contract.logVerification(fileId, computedHashBytes32);
      const receipt = await tx.wait();
      return {
        txHash: receipt.hash,
        isMatch: true,
        matchedVersion: 1,
      };
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Get version history for a file
   */
  public async getFileHistory(fileId: string): Promise<VersionRecordData[]> {
    const contract = await this.getContractInstance(false);
    try {
      const rawHistory = await contract.getFileHistory(fileId);
      return rawHistory.map((item: any) => ({
        versionNumber: Number(item.versionNumber),
        fileHash: item.fileHash,
        fileName: item.fileName,
        fileSize: Number(item.fileSize),
        timestamp: Number(item.timestamp),
        previousHash: item.previousHash,
        metadataNote: item.metadataNote,
        updater: item.updater || "0x0000000000000000000000000000000000000000",
      }));
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Get all registered file IDs (paginated)
   */
  public async getAllFiles(offset: number = 0, limit: number = 20): Promise<{ files: string[]; total: number }> {
    const contract = await this.getContractInstance(false);
    try {
      const [files, total] = await contract.getAllFiles(offset, limit);
      return {
        files: Array.from(files),
        total: Number(total),
      };
    } catch (err) {
      return { files: [], total: 0 };
    }
  }

  /**
   * Get files owned by a specific address
   */
  public async getUserFiles(userAddress: string): Promise<string[]> {
    const contract = await this.getContractInstance(false);
    try {
      const files = await contract.getUserFiles(userAddress);
      return Array.from(files);
    } catch (err) {
      return [];
    }
  }

  /**
   * Get details for the latest version
   */
  public async getLatestVersion(fileId: string): Promise<any> {
    const contract = await this.getContractInstance(false);
    try {
      const res = await contract.getLatestVersion(fileId);
      return {
        versionNumber: Number(res[0]),
        fileHash: res[1],
        fileName: res[2],
        fileSize: Number(res[3]),
        timestamp: Number(res[4]),
        previousHash: res[5],
        metadataNote: res[6],
        owner: res[7],
        totalVersions: Number(res[8]),
      };
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Retrieve file metadata (PRD Section 5: getFile)
   */
  public async getFile(fileId: string): Promise<{ id: string; owner: string; currentVersion: number; createdAt: number }> {
    const contract = await this.getContractInstance(false);
    try {
      const res = await contract.getFile(fileId);
      return {
        id: res[0],
        owner: res[1],
        currentVersion: Number(res[2]),
        createdAt: Number(res[3]),
      };
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Retrieve a specific version (PRD Section 5: getVersion)
   */
  public async getVersion(fileId: string, versionNumber: number): Promise<VersionRecordData> {
    const contract = await this.getContractInstance(false);
    try {
      const res = await contract.getVersion(fileId, versionNumber);
      return {
        versionNumber: Number(res.versionNumber),
        fileHash: res.fileHash,
        fileName: res.fileName,
        fileSize: Number(res.fileSize),
        timestamp: Number(res.timestamp),
        previousHash: res.previousHash,
        metadataNote: res.metadataNote,
        updater: res.updater,
      };
    } catch (err: any) {
      throw new Error(this.decodeContractError(err));
    }
  }

  /**
   * Query contract event logs for the Audit Trail (FR-07)
   */
  public async getAuditEvents(fileIdFilter?: string): Promise<AuditTrailEvent[]> {
    const contract = await this.getContractInstance(false);
    const provider = contract.runner?.provider || (await this.getReadOnlyProvider());

    const eventsList: AuditTrailEvent[] = [];

    try {
      // Query FileRegistered events
      const regFilter = contract.filters.FileRegistered();
      const regLogs = await contract.queryFilter(regFilter, 0, "latest");
      for (const log of regLogs) {
        const parsed = contract.interface.parseLog(log);
        if (parsed) {
          const fId = parsed.args[0];
          if (!fileIdFilter || fId === fileIdFilter) {
            eventsList.push({
              id: `${log.transactionHash}-${log.index}`,
              eventType: "FileRegistered",
              fileId: fId,
              actor: parsed.args[1],
              timestamp: Number(parsed.args[5]),
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              details: {
                fileHash: parsed.args[2],
                fileName: parsed.args[3],
                fileSize: Number(parsed.args[4]),
              },
            });
          }
        }
      }

      // Query VersionAdded (or FileVersionAdded) events
      const verFilter = contract.filters.VersionAdded ? contract.filters.VersionAdded() : contract.filters.FileVersionAdded();
      const verLogs = await contract.queryFilter(verFilter, 0, "latest");
      for (const log of verLogs) {
        const parsed = contract.interface.parseLog(log);
        if (parsed) {
          const fId = parsed.args[0];
          if (!fileIdFilter || fId === fileIdFilter) {
            eventsList.push({
              id: `${log.transactionHash}-${log.index}`,
              eventType: "VersionAdded",
              fileId: fId,
              actor: parsed.args[1],
              timestamp: Number(parsed.args[5]),
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              details: {
                versionNumber: Number(parsed.args[2]),
                newHash: parsed.args[3],
                previousHash: parsed.args[4],
              },
            });
          }
        }
      }

      // Query CollaboratorAuthorized events
      const authFilter = contract.filters.CollaboratorAuthorized();
      const authLogs = await contract.queryFilter(authFilter, 0, "latest");
      for (const log of authLogs) {
        const parsed = contract.interface.parseLog(log);
        if (parsed) {
          const fId = parsed.args[0];
          if (!fileIdFilter || fId === fileIdFilter) {
            eventsList.push({
              id: `${log.transactionHash}-${log.index}`,
              eventType: "CollaboratorAuthorized",
              fileId: fId,
              actor: parsed.args[1],
              timestamp: Number(parsed.args[3]),
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              details: {
                collaborator: parsed.args[2],
              },
            });
          }
        }
      }

      // Query CollaboratorRevoked events
      const revFilter = contract.filters.CollaboratorRevoked();
      const revLogs = await contract.queryFilter(revFilter, 0, "latest");
      for (const log of revLogs) {
        const parsed = contract.interface.parseLog(log);
        if (parsed) {
          const fId = parsed.args[0];
          if (!fileIdFilter || fId === fileIdFilter) {
            eventsList.push({
              id: `${log.transactionHash}-${log.index}`,
              eventType: "CollaboratorRevoked",
              fileId: fId,
              actor: parsed.args[1],
              timestamp: Number(parsed.args[3]),
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              details: {
                collaborator: parsed.args[2],
              },
            });
          }
        }
      }

      // Query FileVerificationLogged events
      const verifyFilter = contract.filters.FileVerificationLogged();
      const verifyLogs = await contract.queryFilter(verifyFilter, 0, "latest");
      for (const log of verifyLogs) {
        const parsed = contract.interface.parseLog(log);
        if (parsed) {
          const fId = parsed.args[0];
          if (!fileIdFilter || fId === fileIdFilter) {
            eventsList.push({
              id: `${log.transactionHash}-${log.index}`,
              eventType: "FileVerificationLogged",
              fileId: fId,
              actor: parsed.args[1],
              timestamp: Number(parsed.args[5]),
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              details: {
                computedHash: parsed.args[2],
                isMatch: parsed.args[3],
                matchedVersion: Number(parsed.args[4]),
              },
            });
          }
        }
      }

      // Sort descending by blockNumber / timestamp
      return eventsList.sort((a, b) => b.blockNumber - a.blockNumber || b.timestamp - a.timestamp);
    } catch (e) {
      console.warn("Could not query contract events:", e);
      return [];
    }
  }

  /**
   * Friendly error decoding
   */
  private decodeContractError(err: any): string {
    if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
      return "Transaction was cancelled / rejected by the user in MetaMask.";
    }
    const msg = err?.data?.message || err?.message || "";
    if (msg.includes("FileAlreadyExists")) return "This File Identifier is already registered. Use 'Register New Version' to track updates.";
    if (msg.includes("FileNotFound")) return "File record was not found in the smart contract registry.";
    if (msg.includes("NotFileOwner")) return "Permission Denied: Only the original file owner can perform this operation.";
    if (msg.includes("NotAuthorized")) return "Permission Denied: Caller is neither the owner nor an authorized collaborator for this file.";
    if (msg.includes("AlreadyCollaborator")) return "This wallet address is already an authorized collaborator for this file.";
    if (msg.includes("NotCollaborator")) return "This wallet address is not currently an authorized collaborator.";
    if (msg.includes("CannotAuthorizeSelf")) return "Cannot authorize yourself; the file owner already has full update permissions.";
    if (msg.includes("InvalidAddress")) return "Invalid Ethereum wallet address specified.";
    if (msg.includes("IdenticalHash")) return "The selected file content is identical to the current active version.";
    if (msg.includes("InvalidFileId")) return "File identifier cannot be empty.";
    if (msg.includes("InvalidHash")) return "Cryptographic hash cannot be empty or zero.";
    return msg || "An unexpected blockchain transaction error occurred.";
  }
}

export const blockchainService = new BlockchainService();
