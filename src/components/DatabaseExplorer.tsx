import React, { useEffect, useState } from 'react';
import type { DatabaseEntry, ExplorerResult, GameFilter } from '../types/app';
import { BookOpen, Filter, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import AdvancedSearchModal from './AdvancedSearchModal';

interface DatabaseExplorerProps {
  historySan: string[];
  onPlayMove?: (san: string) => void;
  onLoadGame?: (pgn: string) => void;
  selectedDbIds: Set<string>;
  onToggleDb: (id: string) => void;
}

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({ historySan, onPlayMove, onLoadGame, selectedDbIds, onToggleDb }) => {
  const [databases, setDatabases] = useState<DatabaseEntry[]>([]);
  const [result, setResult] = useState<ExplorerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDbSelector, setShowDbSelector] = useState(false);
  
  const [filter, setFilter] = useState<GameFilter>({});
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  useEffect(() => {
    if (window.electronAPI) {
        window.electronAPI.dbGetList().then(dbs => {
            setDatabases(dbs);
        });
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI || selectedDbIds.size === 0) {
        setResult(null);
        return;
    }
    
    setLoading(true);
    const timer = setTimeout(() => {
        window.electronAPI.dbSearch(Array.from(selectedDbIds), historySan, filter)
            .then(res => {
                setResult(res);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, 300);

    return () => clearTimeout(timer);
  }, [historySan, selectedDbIds, filter]);

  const hasActiveFilter = Object.keys(filter).length > 0 && Object.values(filter).some(v => v !== undefined && v !== '');

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      <AdvancedSearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={setFilter}
        currentFilter={filter}
      />

      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/20">
         <div className="flex items-center space-x-2 text-sm font-semibold">
             <BookOpen size={16} />
             <span>Explorer</span>
         </div>
         <div className="flex space-x-1">
             <button 
               onClick={() => setIsSearchModalOpen(true)}
               className={clsx(
                   "p-1.5 rounded hover:bg-muted transition-colors relative",
                   hasActiveFilter ? "text-primary bg-primary/10" : "text-muted-foreground"
               )}
               title="Advanced Search"
             >
                 <Search size={16} />
                 {hasActiveFilter && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />}
             </button>
             <button 
               onClick={() => setShowDbSelector(!showDbSelector)}
               className={clsx(
                   "p-1.5 rounded hover:bg-muted transition-colors",
                   showDbSelector ? "text-primary bg-primary/10" : "text-muted-foreground"
               )}
               title="Select Databases"
             >
                 <Filter size={16} />
             </button>
         </div>
      </div>
      
      {hasActiveFilter && (
          <div className="bg-primary/5 px-4 py-2 border-b border-border flex justify-between items-center text-xs">
              <span className="text-primary font-medium">Active Filter applied</span>
              <button onClick={() => setFilter({})} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
              </button>
          </div>
      )}

      {showDbSelector && (
          <div className="p-3 bg-muted/30 border-b border-border text-sm max-h-40 overflow-y-auto">
              <div className="font-medium mb-2 text-xs uppercase text-muted-foreground">Source Databases</div>
              <div className="space-y-1">
                  {databases.map(db => (
                      <label key={db.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded">
                          <input 
                            type="checkbox" 
                            checked={selectedDbIds.has(db.id)}
                            onChange={() => onToggleDb(db.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="truncate">{db.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{db.gameCount}</span>
                      </label>
                  ))}
              </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto">
          {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Searching...</div>
          ) : !result ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Select databases to explore.</div>
          ) : (
              <div className="flex flex-col">
                  <div className="p-4 border-b border-border">
                      <div className="flex justify-between items-baseline mb-2">
                          <span className="text-2xl font-bold">{result.totalGames}</span>
                          <span className="text-xs text-muted-foreground uppercase">Games Found</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden w-full bg-gray-200">
                          <div style={{ width: `${result.whiteWinPercent}%` }} className="bg-gray-400" title={`White: ${result.whiteWinPercent.toFixed(1)}%`} />
                          <div style={{ width: `${result.drawPercent}%` }} className="bg-gray-300" title={`Draw: ${result.drawPercent.toFixed(1)}%`} />
                          <div style={{ width: `${result.blackWinPercent}%` }} className="bg-gray-800" title={`Black: ${result.blackWinPercent.toFixed(1)}%`} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{Math.round(result.whiteWinPercent)}% W</span>
                          <span>{Math.round(result.drawPercent)}% D</span>
                          <span>{Math.round(result.blackWinPercent)}% B</span>
                      </div>
                  </div>

                  <div className="border-b border-border">
                      <div className="px-4 py-2 bg-muted/10 text-xs font-bold text-muted-foreground uppercase tracking-wider">Candidate Moves</div>
                      <table className="w-full text-sm text-left">
                          <tbody>
                              {result.moves.map((move, i) => (
                                  <tr 
                                    key={i} 
                                    onClick={() => onPlayMove && onPlayMove(move.san)}
                                    className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                                  >
                                      <td className="px-4 py-2 font-bold font-mono">{move.san}</td>
                                      <td className="px-4 py-2 text-right">{move.total}</td>
                                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                                          {Math.round((move.white / move.total) * 100)}% / {Math.round((move.draw / move.total) * 100)}% / {Math.round((move.black / move.total) * 100)}%
                                      </td>
                                  </tr>
                              ))}
                              {result.moves.length === 0 && (
                                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No moves found</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>

                  <div>
                      <div className="px-4 py-2 bg-muted/10 text-xs font-bold text-muted-foreground uppercase tracking-wider">Top Games</div>
                      <div className="divide-y divide-border/50">
                          {result.games.map((game, i) => (
                              <div 
                                key={i} 
                                onClick={() => onLoadGame && game.pgn && onLoadGame(game.pgn)}
                                className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                              >
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="font-semibold text-sm">{game.White} vs {game.Black}</span>
                                      <span className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded">{game.Result}</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>{game.Event}</span>
                                      <span>{game.Date}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default DatabaseExplorer;