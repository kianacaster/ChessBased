import { app } from 'electron';
import * as fsPromises from 'fs/promises'; // Use fsPromises for async operations
import * as fs from 'fs'; // Use fs for sync operations like existsSync, readdirSync, statSync, rmSync
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import https from 'https';
import { platform, arch } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AVAILABLE_ENGINES, isEngineArchived } from './engine-metadata';
import type { EngineMetadata } from './engine-types';
import AdmZip from 'adm-zip'; // For unzipping .zip files

const execAsync = promisify(exec);

export class EngineDownloader {
  private static instance: EngineDownloader;
  private appDataPath: string;
  private enginesDir: string;

  private constructor() {
    this.appDataPath = app.getPath('userData');
    this.enginesDir = path.join(this.appDataPath, 'engines');
    if (!fs.existsSync(this.enginesDir)) { // Use fs.existsSync
      fs.mkdirSync(this.enginesDir, { recursive: true }); // Use fs.mkdirSync
    }
  }

  public static getInstance(): EngineDownloader {
    if (!EngineDownloader.instance) {
      EngineDownloader.instance = new EngineDownloader();
    }
    return EngineDownloader.instance;
  }

  public getEnginesDirectory(): string {
    return this.enginesDir;
  }

  public async downloadAndExtract(
    engineId: string,
    onProgress: (progress: number) => void,
    onStatus: (status: string) => void
  ): Promise<string | undefined> {
    console.log(`[EngineDownloader] Starting downloadAndExtract for engineId: ${engineId}`);
    const engineMetadata = AVAILABLE_ENGINES.find(e => e.id === engineId);
    if (!engineMetadata) {
      console.error(`[EngineDownloader] Engine metadata not found for ID: ${engineId}`);
      throw new Error(`Engine metadata not found for ID: ${engineId}`);
    }

    let downloadUrl: string | undefined;
    if (engineMetadata.githubRepo && engineMetadata.githubReleaseTag && engineMetadata.githubAssetPatterns) {
      onStatus(`Fetching download URL from GitHub API for ${engineMetadata.name}...`);
      console.log(`[EngineDownloader] Fetching GitHub asset URL for ${engineId}`);
      downloadUrl = await this._fetchGitHubReleaseAssetUrl(
        engineMetadata.githubRepo,
        engineMetadata.githubReleaseTag,
        engineMetadata.githubAssetPatterns
      );
    }

    if (!downloadUrl) {
      console.error(`[EngineDownloader] No suitable download URL found for ${engineMetadata.name} on this platform.`);
      throw new Error(`No suitable download URL found for ${engineMetadata.name} on this platform.`);
    }

    onStatus(`Starting download for ${engineMetadata.name}...`);
    console.log(`[EngineDownloader] Download URL: ${downloadUrl}`);
    const fileName = path.basename(new URL(downloadUrl).pathname);
    const downloadPath = path.join(this.enginesDir, fileName);
    console.log(`[EngineDownloader] Download path: ${downloadPath}`);

    // Ensure directory exists
    await fsPromises.mkdir(this.enginesDir, { recursive: true });

    // Download file
    try {
      console.log(`[EngineDownloader] Calling performDownload...`);
      await this.performDownload(downloadUrl, downloadPath, onProgress);
      console.log(`[EngineDownloader] performDownload completed.`);
      onStatus('Download complete. Verifying...');
    } catch (error) {
      console.error(`[EngineDownloader] performDownload failed:`, error);
      onStatus(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }

    // Extract if archived
    if (isEngineArchived(engineId)) {
      onStatus('Extracting archive...');
      console.log(`[EngineDownloader] Calling extractArchive...`);
      try {
        const extractedPath = await this.extractArchive(downloadPath, engineMetadata.executableName);
        console.log(`[EngineDownloader] extractArchive completed. Extracted path: ${extractedPath}`);
        onStatus('Extraction complete.');
        // Clean up archive
        fs.rmSync(downloadPath);
        console.log(`[EngineDownloader] Archive removed: ${downloadPath}`);
        return extractedPath;
      } catch (error) {
        console.error(`[EngineDownloader] extractArchive failed:`, error);
        onStatus(`Extraction failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    } else {
      onStatus('Download complete.');
      // For non-archived executables, make it executable
      await fsPromises.chmod(downloadPath, 0o755);
      console.log(`[EngineDownloader] Non-archived engine downloaded to: ${downloadPath}`);
      return downloadPath;
    }
  }

  private performDownload(url: string, destination: string, onProgress: (progress: number) => void, redirectCount = 0): Promise<void> {
    if (redirectCount > 5) {
      return Promise.reject(new Error('Too many redirects'));
    }

    return new Promise((resolve, reject) => {
      // Do not create write stream yet if we might redirect
      // Wait until we get a 200 OK to open the file stream?
      // Actually, createWriteStream overwrites. But if we redirect, we recurse. 
      // The recursive call will handle the stream.
      // So, we only create the stream if we are proceeding with the download.
      
      const request = https.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
          'Accept': 'application/zip, application/octet-stream'
        }
      }, (response) => {
        console.log(`[EngineDownloader] Download: Received response for ${url} with status ${response.statusCode}`);
        
        // Handle Redirects
        if (response.statusCode && [301, 302, 303, 307, 308].includes(response.statusCode)) {
           const location = response.headers.location;
           if (location) {
             console.log(`[EngineDownloader] Redirecting to: ${location}`);
             this.performDownload(location, destination, onProgress, redirectCount + 1)
               .then(resolve)
               .catch(reject);
             return;
           }
        }

        if (response.statusCode && (response.statusCode < 200 || response.statusCode > 299)) {
          reject(new Error(`HTTP Status Code: ${response.statusCode}`));
          return;
        }

        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
          reject(new Error(`Download failed: Server returned HTML instead of a file. Content-Type: ${contentType}`));
          return;
        }

        const contentLengthHeader = response.headers['content-length'];
        const totalLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : -1;
        console.log(`[EngineDownloader] Download: Content-Length header: ${contentLengthHeader} (parsed: ${totalLength} bytes)`);

        const file = createWriteStream(destination);
        let downloadedLength = 0;

        response.pipe(file);

        response.on('data', (chunk) => {
          downloadedLength += chunk.length;
          if (totalLength > 0) {
            onProgress(Math.floor((downloadedLength / totalLength) * 100));
          }
        });

        file.on('finish', () => {
          console.log(`[EngineDownloader] Download: File stream finished for ${destination}. Downloaded ${downloadedLength} bytes.`);
          if (totalLength > 0 && downloadedLength !== totalLength) {
            fsPromises.unlink(destination).catch(() => {});
            reject(new Error(`Incomplete download: Expected ${totalLength} bytes, got ${downloadedLength} bytes.`));
            return;
          } else if (totalLength === -1 && downloadedLength === 0) {
            // Check if file is empty
             fsPromises.stat(destination).then(stats => {
                if(stats.size === 0) {
                    reject(new Error(`Download failed: 0 bytes downloaded.`));
                } else {
                    file.close(() => resolve());
                }
             }).catch(err => {
                 reject(err);
             });
             return;
          }
          file.close(() => resolve());
        });

        file.on('error', (err) => {
          console.error(`[EngineDownloader] Download: File stream error for ${destination}:`, err);
          fsPromises.unlink(destination).catch(() => {});
          reject(err);
        });
      });

      request.on('timeout', () => {
        request.destroy(new Error('Download request timed out after 15 seconds.'));
        console.error(`[EngineDownloader] Download: Request timed out for ${url}`);
      });

      request.on('error', (err) => {
        console.error(`[EngineDownloader] Download: Request error for ${url}:`, err);
        fsPromises.unlink(destination).catch(() => {});
        reject(err);
      });
    });
  }

  private async _fetchGitHubReleaseAssetUrl(
    repo: string,
    tag: string,
    assetPatterns: { [osAndArch: string]: string }
  ): Promise<string | undefined> {
    const osType = platform();
    const archType = arch();

    const githubApiUrl = `https://api.github.com/repos/${repo}/releases/tags/${tag}`;
    console.log(`[EngineDownloader] GitHub API: Fetching release info from ${githubApiUrl}`);

    return new Promise((resolve, reject) => {
      const request = https.get(githubApiUrl, {
        headers: {
          'User-Agent': 'ElectronApp-ChessBased-Downloader/1.0', // GitHub API requires User-Agent
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000 // 10 seconds timeout for API call
      }, (response) => {
        let data = '';
        response.on('data', (chunk) => (data += chunk));
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            try {
              const releaseInfo = JSON.parse(data);
              console.log(`[EngineDownloader] GitHub API: Received release info.`);

              // Determine target asset pattern
              let targetPattern: string | undefined;
              const exactMatchKey = `${osType}-${archType}`;
              if (assetPatterns[exactMatchKey]) {
                targetPattern = assetPatterns[exactMatchKey];
              } else if (archType === 'x64' && assetPatterns[`${osType}-x64`]) {
                targetPattern = assetPatterns[`${osType}-x64`];
              }
              // Fallback for universal mac
              if (!targetPattern && osType === 'darwin' && (archType === 'x64' || archType === 'arm64') && assetPatterns['darwin-universal']) {
                  targetPattern = assetPatterns['darwin-universal'];
              }

              if (targetPattern) {
                  const asset = releaseInfo.assets.find((a: any) => new RegExp(targetPattern!).test(a.name));
                  if (asset) {
                      console.log(`[EngineDownloader] GitHub API: Found asset '${asset.name}'. Download URL: ${asset.browser_download_url}`);
                      resolve(asset.browser_download_url);
                  } else {
                      console.warn(`[EngineDownloader] GitHub API: No asset found matching pattern '${targetPattern}' for ${repo} tag ${tag}`);
                      resolve(undefined);
                  }
              } else {
                  console.warn(`[EngineDownloader] GitHub API: No asset pattern defined for ${osType}-${archType}`);
                  resolve(undefined);
              }
            } catch (jsonError) {
              console.error(`[EngineDownloader] GitHub API: Failed to parse release info JSON:`, jsonError);
              reject(new Error('Failed to parse GitHub API response.'));
            }
          } else {
            console.error(`[EngineDownloader] GitHub API: Failed to fetch release info. Status: ${response.statusCode}. Response: ${data}`);
            reject(new Error(`Failed to fetch GitHub release info. Status: ${response.statusCode}`));
          }
        });
      }).on('error', (err) => {
        console.error(`[EngineDownloader] GitHub API: Request error:`, err);
        reject(new Error(`GitHub API request failed: ${err.message}`));
      }).on('timeout', () => {
        request.destroy(new Error('GitHub API request timed out.'));
        console.error(`[EngineDownloader] GitHub API: Request timed out for ${githubApiUrl}`);
      });
    });
  }

  private async extractArchive(archivePath: string, executableName: string): Promise<string> {
    console.log(`[EngineDownloader] Extract: Starting extraction for ${archivePath}`);
    const targetDir = path.dirname(archivePath);

    if (archivePath.endsWith('.zip')) {
      console.log(`[EngineDownloader] Extract: Initializing AdmZip with archive: ${archivePath}`);
      const zip = new AdmZip(archivePath);
      console.log(`[EngineDownloader] Extract: Extracting all to: ${targetDir}`);
      zip.extractAllTo(targetDir, true); // Overwrite existing files
    } else if (archivePath.endsWith('.tar') || archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
      console.log(`[EngineDownloader] Extract: Using tar command for: ${archivePath}`);
      try {
        await execAsync(`tar -xf "${archivePath}" -C "${targetDir}"`);
      } catch (error) {
        console.error(`[EngineDownloader] Extract: tar command failed:`, error);
        throw new Error(`Failed to extract tar archive: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      throw new Error('Unsupported archive format. Only .zip and .tar/.tar.gz are supported.');
    }

    console.log(`[EngineDownloader] Extract: Finished extracting archive.`);

    const findExecutable = (dir: string): string | null => {
      console.log(`[EngineDownloader] Extract: Searching for executable '${executableName}' in ${dir}`);
      let entries: string[];
      try {
        entries = fs.readdirSync(dir);
      } catch (e) {
        return null;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {
          continue;
        }

        if (stat.isDirectory()) { 
          const found = findExecutable(fullPath);
          if (found) return found;
        } else {
          // Check for exact match
          if (entry === executableName) {
            console.log(`[EngineDownloader] Extract: Found exact match at: ${fullPath}`);
            return fullPath;
          }
          // Check for partial match (starts with executableName, ignoring extension logic for simplicity)
          if (entry.toLowerCase().startsWith(executableName.toLowerCase())) {
             if (stat.size > 100 * 1024) { // > 100KB
                console.log(`[EngineDownloader] Extract: Found likely match (starts with ${executableName}) at: ${fullPath}`);
                return fullPath;
             }
          }
        }
      }
      return null;
    };

    const extractedExecutablePath = findExecutable(targetDir);
    if (!extractedExecutablePath) {
      throw new Error(`Could not find executable '${executableName}' (or reasonable match) in extracted archive.`);
    }
    
    await fsPromises.chmod(extractedExecutablePath, 0o755); // Use fsPromises.chmod
    console.log(`[EngineDownloader] Extract: Made executable: ${extractedExecutablePath}`);

    return extractedExecutablePath;
  }
}