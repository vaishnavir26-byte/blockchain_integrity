/**
 * Cryptographic utility functions using the Browser Web Crypto API.
 * Files are hashed entirely in-browser; file content is NEVER transmitted over the network or to blockchain.
 */

export interface HashResult {
  hashHex: string;         // '0x' prefixed 64-char hex string (bytes32 format)
  rawHashHex: string;      // without 0x prefix
  fileSize: number;
  timeMs: number;
}

/**
 * Computes the SHA-256 digest of a File or Blob using the Browser Web Crypto API.
 * Supports progress callback for larger files.
 */
export async function computeSHA256(
  file: File | Blob,
  onProgress?: (percent: number) => void
): Promise<HashResult> {
  const startTime = performance.now();

  // For smaller files (< 32MB), compute directly via ArrayBuffer
  if (file.size <= 32 * 1024 * 1024) {
    if (onProgress) onProgress(20);
    const buffer = await file.arrayBuffer();
    if (onProgress) onProgress(60);
    const digestBuffer = await crypto.subtle.digest("SHA-256", buffer);
    if (onProgress) onProgress(100);

    const hashArray = Array.from(new Uint8Array(digestBuffer));
    const rawHashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const hashHex = "0x" + rawHashHex;
    const timeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      hashHex,
      rawHashHex,
      fileSize: file.size,
      timeMs,
    };
  }

  // For large files (> 32MB), read in 4MB slices with progress updates
  const chunkSize = 4 * 1024 * 1024; // 4MB chunks
  let offset = 0;
  const total = file.size;

  // Web Crypto SubtleCrypto does not support streaming digest directly without polyfill,
  // so for standard Web Crypto we read the buffer while updating progress
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 90));
      }
    };
    reader.readAsArrayBuffer(file);
  });

  if (onProgress) onProgress(92);
  const digestBuffer = await crypto.subtle.digest("SHA-256", buffer);
  if (onProgress) onProgress(100);

  const hashArray = Array.from(new Uint8Array(digestBuffer));
  const rawHashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  const hashHex = "0x" + rawHashHex;
  const timeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    hashHex,
    rawHashHex,
    fileSize: file.size,
    timeMs,
  };
}

/**
 * Format bytes into human-readable representation (e.g. 1.25 MB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Truncate a hash or address for clean UI presentation (e.g. 0x1234...abcd)
 */
export function truncateHash(hash: string, startChars: number = 8, endChars: number = 8): string {
  if (!hash) return "";
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}
