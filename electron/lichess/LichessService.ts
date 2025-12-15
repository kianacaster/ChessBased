import { EventEmitter } from 'events';
import fs from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

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

  public async fetchUserGames(username: string, filters: LichessGameFilter = {}): Promise<string> {
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
    console.log('Fetching Lichess games from URL:', url); // Added for debugging

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/x-chess-pgn'
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Lichess API error: ${response.status} ${response.statusText}`);
      }

      const pgn = await response.text();
      return pgn;
    } catch (error) {
      console.error('Error fetching games from Lichess:', error);
      throw error;
    }
  }

  public async downloadUserGames(username: string, filePath: string, filters: LichessGameFilter = {}): Promise<void> {
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

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/x-chess-pgn'
        }
      });

      if (!response.ok) {
        throw new Error(`Lichess API error: ${response.status} ${response.statusText}`);
      }
      
      if (!response.body) {
          throw new Error('No body in response');
      }

      const fileStream = fs.createWriteStream(filePath);
      
      // Node 18 fetch returns a web stream, we need to convert or iterate
      // @ts-ignore
      await pipeline(Readable.fromWeb(response.body), fileStream);
      
      console.log('Download complete');

    } catch (error) {
      console.error('Error downloading games from Lichess:', error);
      throw error;
    }
  }
}
