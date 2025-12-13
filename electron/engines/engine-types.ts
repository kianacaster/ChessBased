export interface EngineMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  githubRepo?: string;
  githubReleaseTag?: string;
  githubAssetPatterns?: {
    [osAndArch: string]: string;
  };
  executableName: string;
  isArchived: boolean;
}
