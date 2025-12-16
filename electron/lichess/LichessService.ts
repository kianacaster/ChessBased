import { EventEmitter } from 'events';
import fs from 'fs';
import https from 'https';

export interface LichessGameFilter {
  max?: number;
  rated?: boolean;
  perfType?: string; // 'bullet' | 'blitz' | 'rapid' | 'classical' ...
  color?: 'white' | 'black';
  analysed?: boolean;
  tags?: boolean;
  clocks?: boolean;
  evals?: boolean;
  opening?: boolean;
  since?: number;
  until?: number;
}

export class LichessService extends EventEmitter {
  private baseUrl = 'https://lichess.org/api';

  public fetchUserGames(username: string, filters: LichessGameFilter = {}): Promise<string> {
    const params = new URLSearchParams();
    if (filters.max) params.append('max', filters.max.toString());
    if (filters.rated !== undefined) params.append('rated', filters.rated.toString());
    if (filters.perfType) params.append('perfType', filters.perfType);
    if (filters.color) params.append('color', filters.color);
    if (filters.analysed !== undefined) params.append('analysed', filters.analysed.toString());
    if (filters.tags !== undefined) params.append('tags', filters.tags.toString());
    if (filters.clocks !== undefined) params.append('clocks', filters.clocks.toString());
    if (filters.evals !== undefined) params.append('evals', filters.evals.toString());
    if (filters.opening !== undefined) params.append('opening', filters.opening.toString());

    const url = `${this.baseUrl}/games/user/${username}?${params.toString()}`;
    console.log('Fetching Lichess games from URL:', url);

    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          'Accept': 'application/x-chess-pgn',
          'User-Agent': 'ChessBased/1.0 (https://github.com/yourusername/chessbased; contact@example.com)'
        },
        timeout: 60000, // 60s timeout
        family: 4 // Force IPv4 to avoid ENETUNREACH/ETIMEDOUT on dual-stack networks
      }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Lichess API error: ${res.statusCode} ${res.statusMessage}`));
          res.resume(); // Consume response to free up memory
          return;
        }

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve(data);
        });
      });

      req.on('error', (err) => {
        console.error('Error fetching games from Lichess:', err);
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Lichess request timed out'));
      });
    });
  }

  public downloadUserGames(username: string, filePath: string, filters: LichessGameFilter = {}): Promise<void> {
    const params = new URLSearchParams();
    if (filters.max) params.append('max', filters.max.toString());
    if (filters.rated !== undefined) params.append('rated', filters.rated.toString());
    if (filters.perfType) params.append('perfType', filters.perfType);
    if (filters.color) params.append('color', filters.color);
    if (filters.analysed !== undefined) params.append('analysed', filters.analysed.toString());
    if (filters.tags !== undefined) params.append('tags', filters.tags.toString());
    if (filters.clocks !== undefined) params.append('clocks', filters.clocks.toString());
    if (filters.evals !== undefined) params.append('evals', filters.evals.toString());
    if (filters.opening !== undefined) params.append('opening', filters.opening.toString());

    const url = `${this.baseUrl}/games/user/${username}?${params.toString()}`;
    console.log('Downloading Lichess games from URL:', url, 'to', filePath);

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(filePath);
      
      const req = https.get(url, {
        headers: {
          'Accept': 'application/x-chess-pgn',
          'User-Agent': 'ChessBased/1.0 (https://github.com/yourusername/chessbased; contact@example.com)'
        },
        timeout: 120000, // 2 minutes for downloads
        family: 4 // Force IPv4
      }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          fs.unlink(filePath, () => {}); // Delete partial file
          reject(new Error(`Lichess API error: ${res.statusCode} ${res.statusMessage}`));
          res.resume();
          return;
        }

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log('Download complete');
          resolve();
        });

        fileStream.on('error', (err) => {
          fs.unlink(filePath, () => {});
          reject(err);
        });
      });

      req.on('error', (err) => {
        console.error('Error downloading games from Lichess:', err);
        fs.unlink(filePath, () => {});
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        fs.unlink(filePath, () => {});
        reject(new Error('Lichess download timed out'));
      });
    });
  }
}
