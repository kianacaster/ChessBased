import React, { useEffect, useState, useMemo } from 'react';
import type { DatabaseEntry, GameHeader } from '../types/app';
import { ArrowLeft, Search, Trash2, CheckSquare, Square } from 'lucide-react';
import { clsx } from 'clsx';

interface DatabaseViewProps {
  database: DatabaseEntry;
  onBack: () => void;
  onLoadGame: (pgn: string) => void; 
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ database, onBack, onLoadGame }) => {
  const [games, setGames] = useState<GameHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Selection
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

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

  const handleGameClick = (index: number) => {
      // Logic for selection vs opening
      // If clicking checkbox, toggle selection.
      // If clicking row, open game unless ctrl/shift is held?
      // Standard behavior: 
      // Click -> Open
      // Ctrl+Click -> Toggle Select
      // Shift+Click -> Range Select
      
      // But we have explicit checkbox column now.
      
      const game = filteredGames[index];
      if (game && game.pgn) {
          onLoadGame(game.pgn);
      }
  };
  
  const toggleSelection = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSelected = new Set(selectedIndices);
      
      if (e.shiftKey && lastSelectedIndex !== null) {
          const start = Math.min(lastSelectedIndex, index);
          const end = Math.max(lastSelectedIndex, index);
          for (let i = start; i <= end; i++) {
              newSelected.add(i);
          }
      } else {
          if (newSelected.has(index)) {
              newSelected.delete(index);
          } else {
              newSelected.add(index);
          }
          setLastSelectedIndex(index);
      }
      
      setSelectedIndices(newSelected);
  };
  
  const toggleSelectAll = () => {
      if (selectedIndices.size === filteredGames.length) {
          setSelectedIndices(new Set());
      } else {
          const all = new Set<number>();
          filteredGames.forEach((_, i) => all.add(i));
          setSelectedIndices(all);
      }
  };

  const handleDeleteSelected = async () => {
      if (selectedIndices.size === 0) return;
      if (!confirm(`Are you sure you want to delete ${selectedIndices.size} games? This cannot be undone.`)) return;
      
      try {
          // We need to map visual indices (filtered) back to original indices if we want to delete from DB correctly?
          // Wait, DatabaseManager implementation: removeGames(id, indices).
          // If we passed indices from `filteredGames`, they wouldn't match `games` if search is active.
          // BUT, DatabaseManager loads the FULL list.
          // So we need to map filtered indices to original indices.
          // Or just pass the PGNs? No, pass indices of the FULL list.
          
          // Let's find the true indices in the original `games` array.
          // Identifying games is hard without unique ID.
          // Assumption: `filteredGames` are a subset.
          // We need to know which index in `games` corresponds to the selected rows.
          // `filteredGames` are derived from `games` filter.
          // We can find them by reference equality? Yes, `games` contains objects.
          
          const indicesToDelete: number[] = [];
          selectedIndices.forEach(visualIndex => {
              const gameObj = filteredGames[visualIndex];
              const originalIndex = games.indexOf(gameObj);
              if (originalIndex !== -1) {
                  indicesToDelete.push(originalIndex);
              }
          });
          
          indicesToDelete.sort((a, b) => b - a); // Sort desc just in case, though backend handles set
          
          await window.electronAPI.dbRemoveGames(database.id, indicesToDelete);
          
          // Refresh
          const headers = await window.electronAPI.dbLoadGames(database.id);
          setGames(headers);
          setSelectedIndices(new Set());
          setLastSelectedIndex(null);
          
      } catch (err) {
          console.error("Failed to delete games", err);
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
        
        {selectedIndices.size > 0 && (
            <button 
                onClick={handleDeleteSelected}
                className="flex items-center space-x-2 px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors text-sm font-medium mr-2"
            >
                <Trash2 size={16} />
                <span>Delete ({selectedIndices.size})</span>
            </button>
        )}

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
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                <tr>
                    <th className="px-4 py-3 w-10 text-center">
                        <button onClick={toggleSelectAll} className="hover:text-primary">
                            {selectedIndices.size > 0 && selectedIndices.size === filteredGames.length ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                    </th>
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
                        className={clsx(
                            "border-b border-border transition-colors cursor-pointer",
                            selectedIndices.has(i) ? "bg-primary/5 hover:bg-primary/10" : "bg-card hover:bg-muted/50"
                        )}
                    >
                        <td className="px-4 py-4 text-center" onClick={(e) => toggleSelection(i, e)}>
                            <div className={clsx("flex justify-center", selectedIndices.has(i) ? "text-primary" : "text-muted-foreground")}>
                                {selectedIndices.has(i) ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                        </td>
                        <td className="px-6 py-4 font-medium">{game.White}</td>
                        <td className="px-6 py-4 font-medium">{game.Black}</td>
                        <td className="px-6 py-4">{game.Result}</td>
                        <td className="px-6 py-4 text-muted-foreground">{game.Event}</td>
                        <td className="px-6 py-4 text-muted-foreground">{game.Date}</td>
                    </tr>
                ))}
                {filteredGames.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
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
