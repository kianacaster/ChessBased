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

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'databases.json');
    this.gameDatabase = new GameDatabase();
    this.init();
  }

  private async init() {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      this.databases = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty list
      this.databases = [];
    }
  }

  public async getDatabases(): Promise<DatabaseEntry[]> {
    return this.databases;
  }

  public async saveDatabases(): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify(this.databases, null, 2));
  }

  public async addDatabase(filePath: string, name?: string): Promise<DatabaseEntry> {
    try {
      const stats = await fs.stat(filePath);
      const existing = this.databases.find(db => db.path === filePath);
      
      if (existing) {
        return existing;
      }

      const dbName = name || path.basename(filePath, '.pgn');
      const entry: DatabaseEntry = {
        id: crypto.randomUUID(),
        name: dbName,
        path: filePath,
        gameCount: 0, // We'll update this later
        lastModified: stats.mtimeMs
      };

      // Count games (optional, might be slow for huge files)
      // For now, let's just add it. We can update count when we load it.
      
      this.databases.push(entry);
      await this.saveDatabases();
      return entry;
    } catch (error) {
      throw new Error(`Failed to add database: ${error}`);
    }
  }

  public async createDatabase(name: string): Promise<DatabaseEntry> {
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'databases');
    await fs.mkdir(dbDir, { recursive: true });
    
    const fileName = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pgn`;
    const filePath = path.join(dbDir, fileName);
    
    // Check if file exists, if so append number
    // For simplicity, just write empty file
    await fs.writeFile(filePath, '');
    
    return this.addDatabase(filePath, name);
  }

  public async loadDatabaseGames(id: string): Promise<GameHeader[]> {
    const db = this.databases.find(d => d.id === id);
    if (!db) {
        throw new Error('Database not found');
    }

    try {
        const content = await fs.readFile(db.path, 'utf-8');
        this.gameDatabase.clearGames();
        const headers = await this.gameDatabase.extractHeadersFromPgn(content);
        
        // Update game count
        if (db.gameCount !== headers.length) {
            db.gameCount = headers.length;
            await this.saveDatabases();
        }
        
        return headers;
    } catch (error) {
        throw new Error(`Failed to load database games: ${error}`);
    }
  }
  
  public async addGameToDatabase(id: string, pgn: string): Promise<void> {
      const db = this.databases.find(d => d.id === id);
      if (!db) throw new Error('Database not found');
      
      try {
          // Ensure directory exists
          const dir = path.dirname(db.path);
          await fs.mkdir(dir, { recursive: true });

          // Ensure newline separation
          const contentToAppend = `

${pgn}

`;
          await fs.appendFile(db.path, contentToAppend);
          
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
    return this.databases.find(d => d.path === filePath);
  }
}