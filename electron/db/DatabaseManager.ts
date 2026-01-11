import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { GameHeader, GameDatabase } from './Database';

export interface DatabaseEntry {
  id: string;
  name: string;
  path: string;
  gameCount: number;
  lastModified: number;
}

import { Worker } from 'worker_threads';

export class DatabaseManager {
  private databases: DatabaseEntry[] = [];
  private configPath: string;
  private gameDatabase: GameDatabase;
  private initPromise: Promise<void>;
  private dbBaseDir: string; 
  // Cache: Map dbId -> GameHeader[] (Main thread cache for UI/Management)
  // We keep main thread cache for loadDatabaseGames but use Worker for search
  private loadedDatabases: Map<string, GameHeader[]> = new Map();
  
  private worker: Worker | null = null;
  private workerPath: string = '';
  private pendingRequests: Map<string, { resolve: (val: any) => void, reject: (err: any) => void }> = new Map();

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'databases.json');
    this.dbBaseDir = path.join(userDataPath, 'pgn_data'); 
    this.gameDatabase = new GameDatabase();
    this.initPromise = this.init();
    this.initWorker();
  }

  private initWorker() {
      // In production (asar), the worker file needs to be unpacked or handled correctly.
      // Vite electron builder usually puts main files in dist-electron/
      // We assume searchWorker.js will be next to DatabaseManager.js or in a workers subdir.
      
    this.workerPath = path.join(__dirname, '../workers/searchWorker.js');
    console.log('[DatabaseManager] Initializing worker at', this.workerPath);

      // Fix for dev environment where it might be .ts if running via ts-node directly
      // or if directory structure differs.
      
      if (!require('fs').existsSync(this.workerPath)) {
          // Try flat structure
          this.workerPath = path.join(__dirname, '../searchWorker.js');
      }
      
      console.log(`[DatabaseManager] Initializing worker at ${this.workerPath}`);
      
      try {
          this.worker = new Worker(this.workerPath);
          this.worker.on('message', (message) => {
              const { type, requestId, result, error } = message;
              if (this.pendingRequests.has(requestId)) {
                  const { resolve, reject } = this.pendingRequests.get(requestId)!;
                  this.pendingRequests.delete(requestId);
                  if (type === 'error') reject(new Error(error));
                  else resolve(result);
              }
          });
          this.worker.on('error', (err) => console.error('Worker error:', err));
          this.worker.on('exit', (code) => {
              if (code !== 0) console.error(`Worker stopped with exit code ${code}`);
              this.worker = null;
          });
      } catch (e) {
          console.error("Failed to init worker", e);
      }
  }

  private postWorkerMessage(type: string, payload: any): Promise<any> {
      if (!this.worker) this.initWorker();
      if (!this.worker) return Promise.reject(new Error("Worker not available"));

      const requestId = crypto.randomUUID();
      return new Promise((resolve, reject) => {
          this.pendingRequests.set(requestId, { resolve, reject });
          this.worker!.postMessage({ type, requestId, payload });
      });
  }

  private async init() {
    try {
      const userDataPath = app.getPath('userData');
      console.log(`[DatabaseManager] userDataPath: ${userDataPath}`);
      
      // Ensure the base directory for PGN files exists on init
      try {
          await fs.mkdir(this.dbBaseDir, { recursive: true });
          console.log(`[DatabaseManager] Ensured pgn_data directory exists at: ${this.dbBaseDir}`);
      } catch (e) {
          console.error(`[DatabaseManager] Failed to create pgn_data directory: ${e}`);
          try {
              const stat = await fs.stat(userDataPath);
              console.log(`[DatabaseManager] userDataPath stats:`, stat);
          } catch (e2) {
              console.error(`[DatabaseManager] userDataPath not found/stat failed: ${e2}`);
          }
      }

      const data = await fs.readFile(this.configPath, 'utf-8');
      this.databases = JSON.parse(data);
      console.log(`[DatabaseManager] Loaded ${this.databases.length} databases.`);
      
      // Verify files and adjust paths for potential directory name change
      for (const db of this.databases) {
          const expectedPath = path.join(this.dbBaseDir, path.basename(db.path));
          if (db.path !== expectedPath) {
              console.warn(`[DatabaseManager] Adjusting path for ${db.name}: ${db.path} -> ${expectedPath}`);
              db.path = expectedPath;
          }
          try {
              await fs.access(db.path);
          } catch {
              console.warn(`[DatabaseManager] Warning: Database file missing for ${db.name} at ${db.path}`);
          }
      }
      // Save changes if paths were adjusted
      await this._saveDatabases();

    } catch (error) {
      console.log('[DatabaseManager] No databases.json found or invalid, starting empty.');
      this.databases = [];
    }
  }

  public async getDatabases(): Promise<DatabaseEntry[]> {
    await this.initPromise;
    return this.databases;
  }

  private async _saveDatabases(): Promise<void> {
      await fs.writeFile(this.configPath, JSON.stringify(this.databases, null, 2));
  }

  public async saveDatabases(): Promise<void> {
    await this.initPromise;
    await this._saveDatabases();
  }

  public async addDatabase(filePath: string, name?: string): Promise<DatabaseEntry> {
    await this.initPromise;
    try {
      // Ensure dbBaseDir exists before any file operations
      await fs.mkdir(this.dbBaseDir, { recursive: true });

      const stats = await fs.stat(filePath);
      
      const dbName = name || path.basename(filePath, '.pgn');
      const newManagedPath = path.join(this.dbBaseDir, path.basename(filePath));

      const existing = this.databases.find(db => db.path === newManagedPath); // Check against new path
      if (existing) {
        return existing;
      }
      
      const entry: DatabaseEntry = {
        id: crypto.randomUUID(),
        name: dbName,
        path: newManagedPath,
        gameCount: 0, 
        lastModified: stats.mtimeMs
      };

      // Copy the imported file to the app's managed directory
      await fs.copyFile(filePath, newManagedPath);

      this.databases.push(entry);
      await this.saveDatabases();
      return entry;
    } catch (error) {
      throw new Error(`Failed to add database: ${error}`);
    }
  }

  public async createDatabase(name: string): Promise<DatabaseEntry> {
    await this.initPromise;
    // Ensure dbBaseDir exists before any file operations
    await fs.mkdir(this.dbBaseDir, { recursive: true });
    
    const fileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pgn`;
    const filePath = path.join(this.dbBaseDir, fileName);
    
    // Check if file exists, if so append number (not implemented, just overwrite for now)
    await fs.writeFile(filePath, '');
    console.log(`[DatabaseManager] Created empty database file at: ${filePath}`);
    
    return this.addDatabase(filePath, name);
  }

  public async loadDatabaseGames(id: string): Promise<GameHeader[]> {
    await this.initPromise;
    const db = this.databases.find(d => d.id === id);
    if (!db) {
        throw new Error('Database not found');
    }

    try {
        console.log(`[DatabaseManager] Loading games from ${db.path}`);
        
        // Ensure dbBaseDir exists immediately before trying to access file
        await fs.mkdir(this.dbBaseDir, { recursive: true });

        // Check if file exists and log stats
        try {
            const stats = await fs.stat(db.path);
            console.log(`[DatabaseManager] File size: ${stats.size} bytes`);
        } catch (e) {
            console.error(`[DatabaseManager] File not found or unreadable: ${db.path}`);
            // Debug: List directory contents
            try {
                const dir = path.dirname(db.path);
                const files = await fs.readdir(dir);
                console.log(`[DatabaseManager] Contents of ${dir}:`, files);
            } catch (dirErr) {
                console.error(`[DatabaseManager] Could not list directory: ${dirErr}`);
            }
            return [];
        }

        const content = await fs.readFile(db.path, 'utf-8');
        // console.log(`[DatabaseManager] File content length: ${content.length}`);
        
        this.gameDatabase.clearGames();
        const headers = await this.gameDatabase.extractHeadersFromPgn(content);
        console.log(`[DatabaseManager] Extracted ${headers.length} games.`);
        
        // Update game count
        if (db.gameCount !== headers.length) {
            console.log(`[DatabaseManager] Updating game count from ${db.gameCount} to ${headers.length}`);
            db.gameCount = headers.length;
            await this.saveDatabases();
        }
        
        return headers;
    } catch (error) {
        throw new Error(`Failed to load database games: ${error}`);
    }
  }
  
  public async addGameToDatabase(id: string, pgn: string): Promise<void> {
      await this.initPromise;
      const db = this.databases.find(d => d.id === id);
      if (!db) throw new Error('Database not found');
      
      try {
          // Ensure dbBaseDir exists immediately before trying to access file
          await fs.mkdir(this.dbBaseDir, { recursive: true });

          // Ensure newline separation
          const contentToAppend = `\n\n${pgn}\n\n`;
          await fs.appendFile(db.path, contentToAppend);
          console.log(`[DatabaseManager] Appended game to ${db.path}`);
          
          // Update last modified
          const stats = await fs.stat(db.path);
          db.lastModified = stats.mtimeMs;
          db.gameCount += 1; // Approximation
          await this.saveDatabases();
      } catch (error) {
          throw new Error(`Failed to save game to database: ${error}`);
      }
  }

  public async findDatabaseByPath(filePath: string): Promise<DatabaseEntry | undefined> {
    await this.initPromise;
    return this.databases.find(d => d.path === filePath);
  }

  public async deleteDatabase(id: string): Promise<void> {
    await this.initPromise;
    const dbIndex = this.databases.findIndex(d => d.id === id);
    if (dbIndex === -1) {
      throw new Error('Database not found');
    }

    const db = this.databases[dbIndex];
    
    // Ensure dbBaseDir exists for trash operations
    await fs.mkdir(this.dbBaseDir, { recursive: true });
    const trashDir = path.join(this.dbBaseDir, 'trash'); // Trash inside pgn_data
    await fs.mkdir(trashDir, { recursive: true });

    // Move file
    try {
        const fileName = path.basename(db.path);
        const trashPath = path.join(trashDir, `${Date.now()}_${fileName}`); // Append timestamp to avoid collisions
        
        // Check if source file exists before trying to move
        // If it doesn't exist, we just remove the entry
        try {
            await fs.access(db.path);
            await fs.rename(db.path, trashPath);
            console.log(`Database moved to trash: ${trashPath}`);
        } catch (e) {
            // File might not exist, ignore move error
            console.warn(`File for database ${db.name} not found, just removing entry.`);
        }
    } catch (error) {
        throw new Error(`Failed to move database to trash: ${error}`);
    }

    // Remove from list
    this.databases.splice(dbIndex, 1);
    await this.saveDatabases();
  }

  public async renameDatabase(id: string, newName: string): Promise<void> {
      await this.initPromise;
      const db = this.databases.find(d => d.id === id);
      if (!db) throw new Error('Database not found');
      
      db.name = newName;
      await this.saveDatabases();
  }

  public async mergeDatabases(sourceIds: string[], newName: string): Promise<DatabaseEntry> {
      await this.initPromise;
      
      // 1. Create new database
      const newDb = await this.createDatabase(newName);
      
      try {
          // 2. Read contents of all source databases
          let combinedContent = '';
          
          for (const id of sourceIds) {
              const sourceDb = this.databases.find(d => d.id === id);
              if (!sourceDb) continue;
              
              try {
                  const content = await fs.readFile(sourceDb.path, 'utf-8');
                  // Ensure separation
                  combinedContent += content + '\n\n';
              } catch (e) {
                  console.warn(`Failed to read source DB ${sourceDb.name} for merge`, e);
              }
          }
          
          // 3. Write combined content to new DB file
          // Note: createDatabase creates an empty file. We overwrite it.
          await fs.writeFile(newDb.path, combinedContent);
          
          // 4. Update stats
          const stats = await fs.stat(newDb.path);
          newDb.lastModified = stats.mtimeMs;
          
          // Recalculate game count
          this.gameDatabase.clearGames();
          const headers = await this.gameDatabase.extractHeadersFromPgn(combinedContent);
          newDb.gameCount = headers.length;
          
          await this.saveDatabases();
          
          return newDb;
      } catch (error) {
          throw new Error(`Failed to merge databases: ${error}`);
      }
  }

  public async removeGames(id: string, gameIndices: number[]): Promise<void> {
      await this.initPromise;
      const db = this.databases.find(d => d.id === id);
      if (!db) throw new Error('Database not found');
      
      try {
          // 1. Load all games
          const content = await fs.readFile(db.path, 'utf-8');
          this.gameDatabase.clearGames();
          const headers = await this.gameDatabase.extractHeadersFromPgn(content);
          
          // 2. Filter out specific indices
          // Create a Set for O(1) lookup
          const indicesToRemove = new Set(gameIndices);
          const remainingGames = headers.filter((_, index) => !indicesToRemove.has(index));
          
          if (remainingGames.length === headers.length) {
              return; // Nothing to remove
          }
          
          // 3. Reconstruct PGN
          const newContent = remainingGames.map(g => g.pgn).join('\n\n');
          
          // 4. Write back
          await fs.writeFile(db.path, newContent);
          
          // 5. Update stats
          const stats = await fs.stat(db.path);
          db.lastModified = stats.mtimeMs;
          db.gameCount = remainingGames.length;
          await this.saveDatabases();
          
      } catch (error) {
          throw new Error(`Failed to remove games: ${error}`);
      }
  }

  // Optimized Search via Worker
  public async searchGames(dbIds: string[], moves: string[], filter?: any): Promise<any> { 
      await this.initPromise;
      
      const dbPaths: string[] = [];
      for (const id of dbIds) {
          const db = this.databases.find(d => d.id === id);
          if (db) dbPaths.push(db.path);
      }
      
      if (dbPaths.length === 0) {
          return {
              games: [],
              moves: [],
              totalGames: 0,
              whiteWinPercent: 0,
              drawPercent: 0,
              blackWinPercent: 0
          };
      }

      return this.postWorkerMessage('search', { dbPaths, moves, filter });
  }

  public async compareGames(dbIdsA: string[], dbIdsB: string[], moves: string[]): Promise<any> {
      const resA = await this.searchGames(dbIdsA, moves);
      const resB = await this.searchGames(dbIdsB, moves);

      // Merge moves
      const moveMap = new Map<string, { statsA?: any, statsB?: any }>();
      
      resA.moves.forEach((m: any) => {
          if (!moveMap.has(m.san)) moveMap.set(m.san, {});
          moveMap.get(m.san)!.statsA = m;
      });
      
      resB.moves.forEach((m: any) => {
          if (!moveMap.has(m.san)) moveMap.set(m.san, {});
          moveMap.get(m.san)!.statsB = m;
      });

      const mergedMoves = Array.from(moveMap.entries()).map(([san, val]) => ({
          san,
          statsA: val.statsA,
          statsB: val.statsB
      })).sort((a, b) => {
          // Sort by total games (A + B)
          const totalA = a.statsA ? a.statsA.total : 0;
          const totalB = b.statsB ? b.statsB.total : 0;
          return (totalA + totalB) - (totalA + totalB); // Wait, b - a for descending
      }).sort((a, b) => {
           const totalA = (a.statsA ? a.statsA.total : 0) + (a.statsB ? a.statsB.total : 0);
           const totalB = (b.statsB ? b.statsB.total : 0) + (b.statsB ? b.statsB.total : 0); // Typo in prev logic attempt
           return totalB - totalA;
      });

      return {
          statsA: resA,
          statsB: resB,
          moves: mergedMoves
      };
  }

  private async _loadGamesFromIds(dbIds: string[]): Promise<GameHeader[]> {
      let allGames: GameHeader[] = [];
      for (const id of dbIds) {
          const db = this.databases.find(d => d.id === id);
          if (db) {
              try {
                  // Optimization: could cache this
                  const content = await fs.readFile(db.path, 'utf-8');
                  this.gameDatabase.clearGames();
                  const headers = await this.gameDatabase.extractHeadersFromPgn(content);
                  allGames = allGames.concat(headers);
              } catch (e) {
                  console.error(`Failed to load db ${db.name}`, e);
              }
          }
      }
      return allGames;
  }

  private _filterByMove(games: GameHeader[], move: string, depth: number): GameHeader[] {
      // Helper to strictly filter games that have 'move' at 'depth'
      // We can use GameDatabase.filterGames but it tokenizes everything.
      // Since we already have a subset, maybe it's fine.
      // Actually, filterGames returns matchingGames.
      // But filterGames takes a full sequence.
      // We only know the *next* move is `move`.
      // The games passed in `games` are assumed to match up to `depth`.
      // So checking `move` at `depth` is enough.
      
      const filtered = games.filter(g => {
          if (!g.pgn) return false;
          // We need to tokenize again to find move at specific index.
          // This is inefficient but safe.
          // Duplicate tokenization logic from Database.ts for now.
          let body = g.pgn.replace(/\{[^}]*\}/g, '').replace(/\([^)]*\)/g, '').replace(/\[.*?\]/gs, '').replace(/\d+\.+/g, '');
          const tokens = body.trim().split(/\s+/);
          
          const match = tokens.length > depth && tokens[depth] === move;
          return match;
      });
      
      // Extensive Debugging for the 0% issue
      if (filtered.length === 0 && games.length > 0) {
         console.log(`[DatabaseManager] _filterByMove FAILED match. Move: '${move}', Depth: ${depth}. Source Games: ${games.length}.`);
         const sample = games[0];
         console.log(`[DatabaseManager] Sample PGN Raw (First 100 chars): ${sample.pgn?.substring(0, 100)}`);
         
         let body = sample.pgn.replace(/\{[^}]*\}/g, '').replace(/\([^)]*\)/g, '').replace(/\[.*?\\]/gs, '').replace(/\d+\.+/g, '');
         const tokens = body.trim().split(/\s+/);
         console.log(`[DatabaseManager] Sample Tokens (First 10): ${tokens.slice(0, 10).join(', ')}`);
         if (tokens.length > depth) {
             console.log(`[DatabaseManager] Token at depth ${depth}: '${tokens[depth]}' (Expected: '${move}')`);
             console.log(`[DatabaseManager] Match check: '${tokens[depth]}' === '${move}' is ${tokens[depth] === move}`);
         } else {
             console.log(`[DatabaseManager] Token list length ${tokens.length} <= depth ${depth}`);
         }
      }
      
      return filtered;
  }

  public async getPrepScenarios(
      dbIdsA: string[], 
      dbIdsB: string[], 
      rootMoves: string[], 
      maxDepth: number = 12,
      context?: { heroName: string, opponentName: string, heroColor: 'white' | 'black' }
  ): Promise<any> {
      await this.initPromise;
      
      let gamesA = await this._loadGamesFromIds(dbIdsA);
      let gamesB = await this._loadGamesFromIds(dbIdsB);
      
      // Filter by Color/Name if context provided
      if (context) {
          const { heroName, opponentName, heroColor } = context;
          const heroNameLower = heroName.toLowerCase();
          const opponentNameLower = opponentName.toLowerCase();
          
          gamesA = gamesA.filter(g => {
              if (heroColor === 'white') return g.White?.toLowerCase().includes(heroNameLower);
              else return g.Black?.toLowerCase().includes(heroNameLower);
          });
          
          gamesB = gamesB.filter(g => {
              // If Hero is White, Opponent is Black
              if (heroColor === 'white') return g.Black?.toLowerCase().includes(opponentNameLower);
              else return g.White?.toLowerCase().includes(opponentNameLower);
          });
      }
      
      // Initial Filter to Root
      const rootResA = GameDatabase.filterGames(gamesA, rootMoves);
      const rootResB = GameDatabase.filterGames(gamesB, rootMoves);
      
      // Queue items now track two probabilities:
      // prob: Historical probability (what actually happened in DBs)
      // oppProb: Opportunity probability (likelihood of reaching this if I choose the moves)
      let queue = [{
          line: [] as string[],
          prob: 1.0,
          oppProb: 1.0,
          gamesA: rootResA.matchingGames,
          gamesB: rootResB.matchingGames
      }];
      
      const scenarios: any[] = [];
      const rootDepth = rootMoves.length;
      
      // Beam Search Width
      const BEAM_WIDTH = 5;

      // Iterative deepening / BFS
      // Actually, standard BFS is fine if we prune queue.
      
      // We process queue by depth layers to apply beam search.
      // Current queue is depth 0.
      
      for (let d = 0; d < maxDepth; d++) {
          const nextQueue = [];
          
          while (queue.length > 0) {
              const current = queue.shift()!;
              const currentDepth = rootDepth + current.line.length;
              
              // Determine turn relative to Hero.
              // If context provided:
              //   rootMoves.length % 2 == 0 => White to move.
              //   If heroColor == 'white', it is Hero's turn.
              // If no context, assume A is Hero and Hero is always to move? No, that's impossible.
              // Let's assume standard chess rules.
              
              const isWhiteToMove = (currentDepth % 2) === 0;
              let isHeroTurn = true;
              
              if (context) {
                  isHeroTurn = (isWhiteToMove && context.heroColor === 'white') || (!isWhiteToMove && context.heroColor === 'black');
              } else {
                  // Fallback: Even local depth = Hero Move (Assuming root is Hero turn)
                  isHeroTurn = current.line.length % 2 === 0;
              }
              
              const sourceGames = isHeroTurn ? current.gamesA : current.gamesB;
              const totalSource = sourceGames.length;
              
              if (totalSource === 0) {
                  scenarios.push(this._buildScenarioResult(current));
                  continue;
              }

              const fullPath = [...rootMoves, ...current.line];
              const { moveStats } = GameDatabase.filterGames(sourceGames, fullPath);
              
              // console.log(`Depth ${currentDepth}: Line [${fullPath.join(' ')}]. A: ${current.gamesA.length}, B: ${current.gamesB.length}. Next Moves: ${moveStats.size}`);
              
              let hasChildren = false;
              for (const [san, stats] of moveStats.entries()) {
                  const freq = (stats.w + stats.d + stats.b) / totalSource;
                  
                  // Pruning logic
                  // If Hero Turn: We can choose ANY move, even low freq, if it scores well.
                  // But we shouldn't explode the tree.
                  // If Opponent Turn: We only care about high freq responses.
                  
                  if (!isHeroTurn && freq < 0.05) continue; // Prune rare opponent moves
                  // For Hero, we might keep low freq if we want to discover surprises.
                  // But let's prune extremely rare ones (< 1%) to keep speed.
                  if (isHeroTurn && freq < 0.01) continue;

                  hasChildren = true;
                  
                  const nextLine = [...current.line, san];
                  const nextGamesA = this._filterByMove(current.gamesA, san, currentDepth);
                  const nextGamesB = this._filterByMove(current.gamesB, san, currentDepth);
                  
                  // Calc new probabilities
                  // Historical: always multiplies
                  const newProb = current.prob * freq;
                  
                  // Opportunity: Only multiplies on Opponent Turn
                  let newOppProb = current.oppProb;
                  if (!isHeroTurn) {
                      newOppProb *= freq;
                  }
                  // If Hero Turn, oppProb stays same (we choose 100%).
                  
                  nextQueue.push({
                      line: nextLine,
                      prob: newProb,
                      oppProb: newOppProb,
                      gamesA: nextGamesA,
                      gamesB: nextGamesB
                  });
              }
              
              if (!hasChildren) {
                  scenarios.push(this._buildScenarioResult(current));
              }
          }
          
          // Apply Beam Search on nextQueue
          // Sort by Probability (Frequency) to find the most "Likely" lines.
          // Previously we weighted by Win Rate, which favored 1-game-100%-win outliers.
          
          nextQueue.sort((a, b) => {
              return b.prob - a.prob; // Descending probability
          });
          
          queue = nextQueue.slice(0, BEAM_WIDTH * 2); // Keep top branches
      }
      
      // Add remaining queue items as leaf scenarios
      for (const item of queue) {
          scenarios.push(this._buildScenarioResult(item));
      }
      
      // Final Sort for Display: Most likely first
      return scenarios.sort((a, b) => {
          return b.probability - a.probability;
      }).slice(0, 50);
  }

  private _calcScore(node: any): number {
      // Deprecated in favor of direct probability sort for "Likely Lines"
      return node.prob;
  }

  private _getAggStats(games: GameHeader[]) {
      let w = 0, d = 0, b = 0;
      for (const g of games) {
          if (g.Result === '1-0') w++;
          else if (g.Result === '0-1') b++;
          else d++;
      }
      return { w, d, b, total: games.length, exampleGame: games.length > 0 ? games[0].pgn : null };
  }

  private _getWinRate(stats: { w: number, d: number, b: number, total: number }): number {
      if (stats.total === 0) return 0;
      // Simple win rate: w / total. Or w + d/2.
      // Let's use W + D/2 for fairness.
      return (stats.w + 0.5 * stats.d) / stats.total;
  }

  private _buildScenarioResult(node: any): any {
      return {
          line: node.line,
          probability: node.prob,
          opportunityProb: node.oppProb, // Add this to interface if needed or just use for internal
          heroStats: this._getAggStats(node.gamesA),
          opponentStats: this._getAggStats(node.gamesB)
      };
  }
}
