import { app } from 'electron';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import path from 'path';
import https from 'https';
import { createWriteStream } from 'fs';
import AdmZip from 'adm-zip';
import { PUBLIC_DATABASES } from './public-databases';
import { DatabaseManager } from './DatabaseManager';

export class DatabaseDownloader {
  private static instance: DatabaseDownloader;
  private tempDir: string;
  private dbManager: DatabaseManager;

  private constructor(dbManager: DatabaseManager) {
    this.tempDir = path.join(app.getPath('userData'), 'tmp_downloads');
    this.dbManager = dbManager;
  }

  public static getInstance(dbManager: DatabaseManager): DatabaseDownloader {
    if (!DatabaseDownloader.instance) {
      DatabaseDownloader.instance = new DatabaseDownloader(dbManager);
    }
    return DatabaseDownloader.instance;
  }

  public async downloadDatabase(
    dbId: string,
    onProgress: (progress: number) => void,
    onStatus: (status: string) => void
  ): Promise<void> {
    const dbMeta = PUBLIC_DATABASES.find(d => d.id === dbId);
    if (!dbMeta) {
      throw new Error(`Database metadata not found for ID: ${dbId}`);
    }

    try {
        await fsPromises.mkdir(this.tempDir, { recursive: true });
        const fileName = path.basename(new URL(dbMeta.url).pathname);
        const downloadPath = path.join(this.tempDir, fileName);

        onStatus(`Downloading ${dbMeta.name}...`);
        await this.performDownload(dbMeta.url, downloadPath, onProgress);

        let finalPgnPath: string;

        if (fileName.toLowerCase().endsWith('.zip')) {
            onStatus('Processing archive...');
            // Extract
            const zip = new AdmZip(downloadPath);
            const zipEntries = zip.getEntries();
            
            // Find largest PGN
            let pgnEntry = null;
            let maxBytes = 0;
            
            for (const entry of zipEntries) {
                if (entry.entryName.toLowerCase().endsWith('.pgn')) {
                    if (entry.header.size > maxBytes) {
                        maxBytes = entry.header.size;
                        pgnEntry = entry;
                    }
                }
            }

            if (!pgnEntry) {
                throw new Error('No PGN file found in the downloaded archive.');
            }

            onStatus(`Extracting ${pgnEntry.entryName}...`);
            const extractPath = path.join(this.tempDir, 'extracted');
            zip.extractEntryTo(pgnEntry, extractPath, false, true);
            
            finalPgnPath = path.join(extractPath, pgnEntry.entryName);
        } else if (fileName.toLowerCase().endsWith('.pgn')) {
            // It's already a PGN
            finalPgnPath = downloadPath;
        } else {
             // Fallback: Check magic number or try to unzip? 
             // For now assume extension is correct or throw.
             throw new Error('Unsupported file format. Only .zip and .pgn are supported.');
        }
        
        onStatus('Importing into database...');
        // Add to DatabaseManager
        // This copies the file to the managed directory
        await this.dbManager.addDatabase(finalPgnPath, dbMeta.name);

        // Cleanup
        onStatus('Cleaning up...');
        if (fileName.toLowerCase().endsWith('.zip')) {
             await fsPromises.rm(downloadPath, { force: true });
             await fsPromises.rm(path.dirname(finalPgnPath), { recursive: true, force: true });
        } else {
             // If it was a direct PGN download, addDatabase copied it. We can delete the temp one.
             await fsPromises.rm(downloadPath, { force: true });
        }
        
        onStatus('Done!');

    } catch (error) {
        console.error('Database download failed:', error);
        throw error;
    }
  }

  private performDownload(url: string, destination: string, onProgress: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = https.get(url, {
        headers: {
            'User-Agent': 'ChessBased-App'
        }
      }, (response) => {
        if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
            // Handle redirects if simple, but pgnmentor usually direct.
             if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                 this.performDownload(response.headers.location, destination, onProgress).then(resolve).catch(reject);
                 return;
             }
            reject(new Error(`HTTP Status Code: ${response.statusCode}`));
            return;
        }

        const len = parseInt(response.headers['content-length'] || '0', 10);
        let cur = 0;
        const file = createWriteStream(destination);
        
        response.pipe(file);
        
        response.on('data', (chunk) => {
            cur += chunk.length;
            if (len > 0) {
                onProgress(Math.floor((cur / len) * 100));
            }
        });

        file.on('finish', () => {
            file.close(() => resolve());
        });

        file.on('error', (err) => {
            fsPromises.unlink(destination).catch(() => {});
            reject(err);
        });
      });
      
      request.on('error', (err) => {
         fsPromises.unlink(destination).catch(() => {});
         reject(err);
      });
    });
  }
}
