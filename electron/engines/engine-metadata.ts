import { platform } from 'os';
import type { EngineMetadata } from './engine-types';
export type { EngineMetadata };

const STOCKFISH_VERSION = '16';

export const AVAILABLE_ENGINES: EngineMetadata[] = [
  {
    id: 'stockfish_16',
    name: 'Stockfish 16',
    version: STOCKFISH_VERSION,
    description: `The strongest open source chess engine. Version ${STOCKFISH_VERSION}.`,
    githubRepo: 'official-stockfish/Stockfish',
    githubReleaseTag: 'sf_16',
    githubAssetPatterns: {
      'win-x64': 'stockfish-windows-x86-64-avx2\\.zip',
      'linux-x64': 'stockfish-ubuntu-x86-64-avx2\\.tar', 
      'darwin-x64': 'stockfish-macos-x86-64-avx2\\.tar',
      'darwin-arm64': 'stockfish-macos-m1-apple-silicon\\.tar',
    },
    executableName: platform() === 'win32' ? 'stockfish-windows-x86-64-avx2.exe' : 'stockfish',
    isArchived: true,
  },
];

export function getEngineDownloadUrlFromMetadata(engineId: string): string | undefined {
  const engine = AVAILABLE_ENGINES.find(e => e.id === engineId);
  if (!engine) return undefined;
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