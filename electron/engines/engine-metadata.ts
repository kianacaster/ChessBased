// @ts-ignore
import { platform, arch } from 'os';

export interface EngineMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  downloadUrls: {
    [osAndArch: string]: string; // e.g., 'win-x64': 'url', 'linux-x64': 'url'
  };
  executableName: string; // e.g., 'stockfish.exe' on Windows, 'stockfish' on Linux/macOS
  isArchived: boolean; // True if the download is a .zip, .tar.gz etc.
}

const STOCKFISH_VERSION = '16'; // Using Stockfish 16

export const AVAILABLE_ENGINES: EngineMetadata[] = [
  {
    id: 'stockfish_16',
    name: 'Stockfish 16',
    version: STOCKFISH_VERSION,
    description: `The strongest open source chess engine. Version ${STOCKFISH_VERSION}.`,
    downloadUrls: {
      // These are example URLs. Actual direct download links from official sources should be used.
      // Often, GitHub releases provide direct links to binaries or archives.
      'win-x64': 'https://stockfishchess.org/files/stockfish-windows-x86-64-avx2.zip', // Placeholder
      'linux-x64': 'https://stockfishchess.org/files/stockfish-ubuntu-x86-64.zip', // Placeholder
      'darwin-x64': 'https://stockfishchess.org/files/stockfish-macos-x86-64.zip', // Placeholder
      'darwin-arm64': 'https://stockfishchess.org/files/stockfish-macos-arm64.zip', // Placeholder
    },
    executableName: platform() === 'win32' ? 'stockfish.exe' : 'stockfish',
    isArchived: true, // Most official downloads are zipped
  },
  // Add other engines here if desired
];

export function getEngineDownloadUrl(engineId: string): string | undefined {
  const osType = platform(); // 'darwin', 'linux', 'win32'
  const archType = arch();   // 'x64', 'arm64' etc.

  const engine = AVAILABLE_ENGINES.find(e => e.id === engineId);
  if (!engine) return undefined;

  // Prioritize exact match
  const exactMatchKey = `${osType}-${archType}`;
  if (engine.downloadUrls[exactMatchKey]) {
    return engine.downloadUrls[exactMatchKey];
  }

  // Fallback for general x64 if exact arch not found (e.g., specific Linux distros)
  if (archType === 'x64' && engine.downloadUrls[`${osType}-x64`]) {
    return engine.downloadUrls[`${osType}-x64`];
  }

  console.warn(`No suitable download URL found for ${engine.name} on ${osType}-${archType}.`);
  return undefined;
}

export function getEngineExecutableName(engineId: string): string | undefined {
  const engine = AVAILABLE_ENGINES.find(e => e.id === engineId);
  return engine?.executableName;
}

export function isEngineArchived(engineId: string): boolean {
  const engine = AVAILABLE_ENGINES.find(e => e.id === engineId);
  return engine?.isArchived || false;
}
