import { app } from 'electron';
import * as fsPromises from 'fs/promises'; // Use fsPromises for async operations
import * as fs from 'fs'; // Use fs for sync operations like existsSync, readdirSync, statSync, rmSync
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import https from 'https';
import { AVAILABLE_ENGINES, getEngineDownloadUrl, isEngineArchived } from './engine-metadata';
import AdmZip from 'adm-zip'; // For unzipping .zip files

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

    const downloadUrl = getEngineDownloadUrl(engineId);
    if (!downloadUrl) {
      console.error(`[EngineDownloader] No download URL found for ${engineMetadata.name} on this platform.`);
      throw new Error(`No download URL found for ${engineMetadata.name} on this platform.`);
    }

    onStatus(`Starting download for ${engineMetadata.name}...`);
    console.log(`[EngineDownloader] Download URL: ${downloadUrl}`);
    const fileName = path.basename(new URL(downloadUrl).pathname);
    const downloadPath = path.join(this.enginesDir, fileName);
    console.log(`[EngineDownloader] Download path: ${downloadPath}`);

    // Ensure directory exists
    await fsPromises.mkdir(this.enginesDir, { recursive: true }); // Use fsPromises.mkdir

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
        fs.rmSync(downloadPath); // Use fs.rmSync
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
      await fsPromises.chmod(downloadPath, 0o755); // Use fsPromises.chmod
      console.log(`[EngineDownloader] Non-archived engine downloaded to: ${downloadPath}`);
      return downloadPath;
    }
  }

  private performDownload(url: string, destination: string, onProgress: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(destination);
      https.get(url, (response) => {
        if (response.statusCode && (response.statusCode < 200 || response.statusCode > 299)) {
          reject(new Error(`HTTP Status Code: ${response.statusCode}`));
          return;
        }

        const totalLength = response.headers['content-length'] ? parseInt(response.headers['content-length'], 10) : 0;
        let downloadedLength = 0;

        response.on('data', (chunk) => {
          downloadedLength += chunk.length;
          if (totalLength > 0) {
            onProgress(Math.floor((downloadedLength / totalLength) * 100));
          }
        });

        file.on('finish', () => {
          file.close(() => resolve()); // Fix here
        });

        file.on('error', (err) => {
          fsPromises.unlink(destination).catch(() => {}); // Delete the file if an error occurs
          reject(err);
        });
      }).on('error', (err) => {
        fsPromises.unlink(destination).catch(() => {}); // Delete the file if an error occurs
        reject(err);
      });
    });
  }

  private async extractArchive(archivePath: string, executableName: string): Promise<string> {
    if (!archivePath.endsWith('.zip')) {
      throw new Error('Only .zip archives are supported for automatic extraction currently.');
    }

    const zip = new AdmZip(archivePath);
    const targetDir = path.dirname(archivePath);
    zip.extractAllTo(targetDir, true); // Overwrite existing files

    const findExecutable = (dir: string): string | null => {
      const entries = fs.readdirSync(dir); // Use fs.readdirSync
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) { // Use fs.statSync
          const found = findExecutable(fullPath);
          if (found) return found;
        } else if (path.basename(fullPath) === executableName) {
          return fullPath;
        }
      }
      return null;
    };

    const extractedExecutablePath = findExecutable(targetDir);
    if (!extractedExecutablePath) {
      throw new Error(`Could not find executable '${executableName}' in extracted archive.`);
    }
    
    await fsPromises.chmod(extractedExecutablePath, 0o755); // Use fsPromises.chmod

    return extractedExecutablePath;
  }
}