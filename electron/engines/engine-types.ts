export interface EngineMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  githubRepo?: string; // e.g., "official-stockfish/Stockfish"
  githubReleaseTag?: string; // e.g., "sf_16"
  githubAssetPatterns?: { // Patterns to find asset in GitHub release (regex or exact name)
    [osAndArch: string]: string; // e.g., 'win-x64': 'stockfish-16-windows-x86-64-avx2\.zip'
  };
  executableName: string; // e.g., 'stockfish.exe' on Windows, 'stockfish' on Linux/macOS
  isArchived: boolean; // True if the download is a .zip, .tar.gz etc.
}
