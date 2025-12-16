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

export class DatabaseManager {
  private databases: DatabaseEntry[] = [];
  private configPath: string;
  private gameDatabase: GameDatabase;
  private initPromise: Promise<void>;
  private dbBaseDir: string; // New member to store the base directory for pgn files

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'databases.json');
    this.dbBaseDir = path.join(userDataPath, 'pgn_data'); // Define the base directory here
    this.gameDatabase = new GameDatabase();
    this.initPromise = this.init();
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

  public async searchGames(dbIds: string[], moves: string[]): Promise<any> { // return ExplorerResult type if imported, using any to avoid import cycles for now or just inline structure
      await this.initPromise;
      
      let allGames: GameHeader[] = [];
      
      for (const id of dbIds) {
          const db = this.databases.find(d => d.id === id);
          if (db) {
              try {
                  // Ensure dbBaseDir exists immediately before trying to access file
                  await fs.mkdir(this.dbBaseDir, { recursive: true });

                  // We need to load games from file. 
                  // Optimization: Cache loaded games? For now, read file.
                  const content = await fs.readFile(db.path, 'utf-8');
                  // We need a temp instance to parse? Or static method?
                  // extractHeadersFromPgn is instance method.
                  // We can reuse this.gameDatabase but it clears games.
                  // Let's reuse it sequentially.
                  this.gameDatabase.clearGames();
                  const headers = await this.gameDatabase.extractHeadersFromPgn(content);
                  allGames = allGames.concat(headers);
              } catch (e) {
                  console.error(`Failed to load db ${db.name} for search`, e);
              }
          }
      }

      const { matchingGames, moveStats } = GameDatabase.filterGames(allGames, moves);
      
      // Calculate Aggregates
      let total = matchingGames.length;
      let w = 0, d = 0, b = 0;
      matchingGames.forEach(g => {
          if (g.Result === '1-0') w++;
          else if (g.Result === '0-1') b++;
          else d++;
      });

      const movesList = Array.from(moveStats.entries()).map(([san, s]) => ({
          san,
          white: s.w,
          draw: s.d,
          black: s.b,
          total: s.w + s.d + s.b
      })).sort((a, b) => b.total - a.total);

      return {
          games: matchingGames.slice(0, 100), // Limit return
          moves: movesList,
          totalGames: total,
          whiteWinPercent: total ? (w / total) * 100 : 0,
          drawPercent: total ? (d / total) * 100 : 0,
          blackWinPercent: total ? (b / total) * 100 : 0
      };
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

  public async getPrepScenarios(dbIdsA: string[], dbIdsB: string[], rootMoves: string[], maxDepth: number = 12): Promise<any> {
      await this.initPromise;
      
      const gamesA = await this._loadGamesFromIds(dbIdsA);
      const gamesB = await this._loadGamesFromIds(dbIdsB);
      
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
              
              // Determine turn.
              // We assume Group A is Hero (Me).
              // If I am White, I move on even plies (0, 2..).
              // If I am Black, I move on odd plies (1, 3..).
              // How do we know if Hero is White or Black?
              // Usually prep is "I am Player X".
              // If I enter my username, I play both colors.
              // BUT "Opening Prep" is usually for a specific color context starting from root.
              // If root is empty, I am White.
              // If root is 1. e4, I am Black.
              // So: Hero moves when (rootDepth + line.length) % 2 == (rootDepth % 2).
              // Wait.
              // Root [] (0). White to move. Hero moves.
              // Root ['e4'] (1). Black to move. Hero moves.
              // So Hero moves when it is the turn of the Root side? Yes.
              
              // Wait, if I want to prep against e4 as Black.
              // I load My games (A) and Opp games (B).
              // I set board to 1. e4.
              // It is Black's turn (My turn).
              // So at depth 0 relative to root, it is My turn.
              // So **Depth 0 is ALWAYS Hero's turn** in this logic?
              // No, user said "I play c4... opponent plays c5".
              // This implies Root is empty. I move first.
              
              // So: Even local depth = Hero Move. Odd local depth = Opponent Move.
              const isHeroTurn = current.line.length % 2 === 0;
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
          // Sort by "Score". Score = Opportunity Prob * Hero Win Rate.
          // We need to calc win rate for each candidate to sort.
          // This is expensive? No, we have nextGamesA.
          
          // We only keep the best BEAM_WIDTH branches.
          
          nextQueue.sort((a, b) => {
              const scoreA = this._calcScore(a);
              const scoreB = this._calcScore(b);
              return scoreB - scoreA;
          });
          
          queue = nextQueue.slice(0, BEAM_WIDTH * 2); // Keep top 10 per ply to allow diversity
      }
      
      // Add remaining queue items as leaf scenarios
      for (const item of queue) {
          scenarios.push(this._buildScenarioResult(item));
      }
      
      // Final Sort for Display
      return scenarios.sort((a, b) => {
          // Recalculate scores for final sort
          // Score = oppProb * winRate
          // We want to show the user the "Best" lines.
          const scoreA = a.opportunityProb * this._getWinRate(a.heroStats);
          const scoreB = b.opportunityProb * this._getWinRate(b.heroStats);
          return scoreB - scoreA;
      }).slice(0, 50);
  }

  private _calcScore(node: any): number {
      // Score = Opportunity Prob * Hero Win Rate
      // Win Rate calculation from gamesA
      const stats = this._getAggStats(node.gamesA);
      const winRate = this._getWinRate(stats);
      return node.oppProb * winRate;
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
