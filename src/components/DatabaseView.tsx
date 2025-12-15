import React, { useEffect, useState, useMemo } from 'react';
import type { DatabaseEntry, GameHeader } from '../types/app';
import { ArrowLeft, Search, PlayCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface DatabaseViewProps {
  database: DatabaseEntry;
  onBack: () => void;
  onLoadGame: (pgn: string) => void; // We might need to fetch the full PGN. 
  // Wait, GameHeader doesn't have the moves. 
  // The current `GameDatabase.ts` stores headers but maybe not full PGN content easily retrievable by index unless we keep it in memory.
  // In `extractHeadersFromPgn`, we are throwing away moves or just storing headers?
  // Let's check `GameDatabase.ts` again.
}

// Re-checking Database.ts logic...
// It creates `GameHeader` objects. It stores them in `this.games`.
// It DOES NOT store the move text in `this.games`.
// So we can't load the game unless we change `GameDatabase` to store the full PGN block or offset/length.

// For now, I will modify the props to assume we can get the full PGN.
// But first I need to fix `GameDatabase.ts` to actually store the moves or the raw PGN string for each game.

const DatabaseView: React.FC<DatabaseViewProps> = ({ database, onBack, onLoadGame }) => {
  const [games, setGames] = useState<GameHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadGames = async () => {
      if (window.electronAPI) {
        try {
          const headers = await window.electronAPI.dbLoadGames(database.id);
          setGames(headers);
        } catch (error) {
          console.error("Failed to load games", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadGames();
  }, [database.id]);

  const filteredGames = useMemo(() => {
    if (!search) return games;
    const lowerSearch = search.toLowerCase();
    return games.filter(g => 
        (g.White && g.White.toLowerCase().includes(lowerSearch)) ||
        (g.Black && g.Black.toLowerCase().includes(lowerSearch)) ||
        (g.Event && g.Event.toLowerCase().includes(lowerSearch))
    );
  }, [games, search]);

  const handleGameClick = async (index: number) => {
      const game = filteredGames[index];
      if (game && game.pgn) {
          onLoadGame(game.pgn);
      } else {
          console.warn("Game does not have PGN content");
      }
  };

  if (loading) {
     return <div className="p-8 text-center text-muted-foreground">Loading games...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center space-x-4 p-4 border-b border-border bg-card">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
            <h2 className="text-xl font-bold">{database.name}</h2>
            <p className="text-xs text-muted-foreground">{games.length} games</p>
        </div>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
                type="text" 
                placeholder="Search players, event..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-input border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64"
            />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0">
                <tr>
                    <th className="px-6 py-3">White</th>
                    <th className="px-6 py-3">Black</th>
                    <th className="px-6 py-3">Result</th>
                    <th className="px-6 py-3">Event</th>
                    <th className="px-6 py-3">Date</th>
                </tr>
            </thead>
            <tbody>
                {filteredGames.map((game, i) => (
                    <tr 
                        key={i} 
                        onClick={() => handleGameClick(i)}
                        className="bg-card border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                        <td className="px-6 py-4 font-medium">{game.White}</td>
                        <td className="px-6 py-4 font-medium">{game.Black}</td>
                        <td className="px-6 py-4">{game.Result}</td>
                        <td className="px-6 py-4 text-muted-foreground">{game.Event}</td>
                        <td className="px-6 py-4 text-muted-foreground">{game.Date}</td>
                    </tr>
                ))}
                {filteredGames.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            No games found matching your search.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default DatabaseView;
