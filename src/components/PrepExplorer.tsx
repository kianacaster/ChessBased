import React, { useEffect, useState } from 'react';
import type { DatabaseEntry, PrepComparisonResult, PrepScenario } from '../types/app';
import { BookOpen, Filter, ArrowRightLeft, Users, GitBranch, Table, List } from 'lucide-react';
import { clsx } from 'clsx';

interface PrepExplorerProps {
  historySan: string[];
  onPlayMove?: (san: string) => void;
  onLoadGame?: (pgn: string) => void;
  onPlayLine?: (moves: string[]) => void;
}

const PrepExplorer: React.FC<PrepExplorerProps> = ({ historySan, onPlayMove, onLoadGame, onPlayLine }) => {
  const [databases, setDatabases] = useState<DatabaseEntry[]>([]);
  const [selectedIdsA, setSelectedIdsA] = useState<Set<string>>(new Set());
  const [selectedIdsB, setSelectedIdsB] = useState<Set<string>>(new Set());
  
  const [result, setResult] = useState<PrepComparisonResult | null>(null);
  const [scenarios, setScenarios] = useState<PrepScenario[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showSelectors, setShowSelectors] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'scenarios'>('scenarios');

  useEffect(() => {
    if (window.electronAPI) {
        window.electronAPI.dbGetList().then(dbs => {
            setDatabases(dbs);
        });
    }
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    if (selectedIdsA.size === 0 && selectedIdsB.size === 0) return;
    
    setLoading(true);
    const timer = setTimeout(() => {
        const p1 = window.electronAPI.dbCompare(Array.from(selectedIdsA), Array.from(selectedIdsB), historySan)
            .then(setResult);
            
        const p2 = window.electronAPI.dbGetPrepScenarios(Array.from(selectedIdsA), Array.from(selectedIdsB), historySan, 6)
            .then(setScenarios);

        Promise.all([p1, p2])
            .catch(console.error)
            .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [historySan, selectedIdsA, selectedIdsB]);

  const toggleDb = (id: string, group: 'A' | 'B') => {
      if (group === 'A') {
          const next = new Set(selectedIdsA);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIdsA(next);
      } else {
          const next = new Set(selectedIdsB);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          setSelectedIdsB(next);
      }
  };

  const getWinRate = (stats: any) => {
      if (!stats || !stats.total) return 0;
      return ((stats.white + stats.draw * 0.5) / stats.total) * 100;
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/20">
         <div className="flex items-center space-x-2 text-sm font-semibold">
             <Users size={16} />
             <span>Prep Tool</span>
         </div>
         <div className="flex space-x-1">
             <button 
               onClick={() => setViewMode('scenarios')}
               className={clsx(
                   "p-1.5 rounded hover:bg-muted transition-colors",
                   viewMode === 'scenarios' ? "text-primary bg-primary/10" : "text-muted-foreground"
               )}
               title="Likely Scenarios"
             >
                 <GitBranch size={16} />
             </button>
             <button 
               onClick={() => setViewMode('table')}
               className={clsx(
                   "p-1.5 rounded hover:bg-muted transition-colors",
                   viewMode === 'table' ? "text-primary bg-primary/10" : "text-muted-foreground"
               )}
               title="Move Table"
             >
                 <Table size={16} />
             </button>
             <button 
               onClick={() => setShowSelectors(!showSelectors)}
               className={clsx(
                   "p-1.5 rounded hover:bg-muted transition-colors ml-2",
                   showSelectors ? "text-primary bg-primary/10" : "text-muted-foreground"
               )}
               title="Select Databases"
             >
                 <Filter size={16} />
             </button>
         </div>
      </div>

      {showSelectors && (
          <div className="p-3 bg-muted/30 border-b border-border text-sm max-h-60 overflow-y-auto grid grid-cols-2 gap-4">
              <div>
                  <div className="font-bold text-xs uppercase text-blue-500 mb-2">Hero (Me)</div>
                  <div className="space-y-1">
                      {databases.map(db => (
                          <label key={`a-${db.id}`} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded">
                              <input 
                                type="checkbox" 
                                checked={selectedIdsA.has(db.id)}
                                onChange={() => toggleDb(db.id, 'A')}
                                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                              />
                              <span className="truncate">{db.name}</span>
                          </label>
                      ))}
                  </div>
              </div>
              <div>
                  <div className="font-bold text-xs uppercase text-red-500 mb-2">Opponent</div>
                  <div className="space-y-1">
                      {databases.map(db => (
                          <label key={`b-${db.id}`} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded">
                              <input 
                                type="checkbox" 
                                checked={selectedIdsB.has(db.id)}
                                onChange={() => toggleDb(db.id, 'B')}
                                className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                              />
                              <span className="truncate">{db.name}</span>
                          </label>
                      ))}
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto">
          {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Analyzing...</div>
          ) : (!result && scenarios.length === 0) ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Select databases for Hero and Opponent to start.</div>
          ) : (
              <>
                  {viewMode === 'table' && result && (
                      <div className="flex flex-col">
                          {/* Summary */}
                          <div className="p-4 border-b border-border grid grid-cols-2 gap-4">
                              <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-500">{result.statsA.totalGames}</div>
                                  <div className="text-xs text-muted-foreground uppercase">Hero Games</div>
                              </div>
                              <div className="text-center">
                                  <div className="text-2xl font-bold text-red-500">{result.statsB.totalGames}</div>
                                  <div className="text-xs text-muted-foreground uppercase">Opp Games</div>
                              </div>
                          </div>

                          {/* Move Table */}
                          <table className="w-full text-sm text-left">
                              <thead className="bg-muted/10 text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-0">
                                  <tr>
                                      <th className="px-4 py-2">Move</th>
                                      <th className="px-2 py-2 text-center text-blue-500">Hero</th>
                                      <th className="px-2 py-2 text-center text-red-500">Opp</th>
                                      <th className="px-2 py-2 text-center">Diff</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {result.moves.map((move, i) => {
                                      const scoreA = getWinRate(move.statsA);
                                      const scoreB = getWinRate(move.statsB);
                                      const diff = scoreA - scoreB;
                                      const countA = move.statsA?.total || 0;
                                      const countB = move.statsB?.total || 0;

                                      return (
                                          <tr 
                                            key={i} 
                                            onClick={() => onPlayMove && onPlayMove(move.san)}
                                            className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                                          >
                                              <td className="px-4 py-2 font-bold font-mono">
                                                  {move.san}
                                                  <div className="text-[10px] text-muted-foreground font-normal">
                                                      {countA} vs {countB}
                                                  </div>
                                              </td>
                                              <td className="px-2 py-2 text-center font-medium">
                                                  {countA > 0 ? `${scoreA.toFixed(0)}%` : '-'}
                                              </td>
                                              <td className="px-2 py-2 text-center font-medium">
                                                  {countB > 0 ? `${scoreB.toFixed(0)}%` : '-'}
                                              </td>
                                              <td className={clsx(
                                                  "px-2 py-2 text-center font-bold",
                                                  diff > 5 ? "text-green-500" : diff < -5 ? "text-red-500" : "text-muted-foreground"
                                              )}>
                                                  {countA > 0 && countB > 0 ? (diff > 0 ? `+${diff.toFixed(0)}` : diff.toFixed(0)) : '-'}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {viewMode === 'scenarios' && (
                      <div className="flex flex-col">
                          <div className="px-4 py-3 bg-muted/10 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider flex justify-between">
                              <span>Likely Scenarios</span>
                              <span>Prob.</span>
                          </div>
                          <div className="divide-y divide-border/50">
                              {scenarios.map((scenario, i) => {
                                  const winRate = getWinRate(scenario.heroStats);
                                  const games = scenario.heroStats.total;
                                  
                                  return (
                                      <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                                          <div className="flex justify-between items-start mb-2">
                                              <div className="flex-1 font-mono text-sm leading-relaxed mr-4">
                                                  {scenario.line.map((move, idx) => (
                                                      <span key={idx} className={clsx(idx % 2 === 0 ? "text-foreground" : "text-muted-foreground")}>
                                                          {move}{' '}
                                                      </span>
                                                  ))}
                                              </div>
                                              <div className="text-right">
                                                  <div className="text-lg font-bold text-primary">
                                                      {(scenario.probability * 100).toFixed(1)}%
                                                  </div>
                                                  <div className="text-[10px] text-muted-foreground uppercase">Probability</div>
                                              </div>
                                          </div>
                                          
                                          <div className="flex items-center justify-between text-xs">
                                              <div className="flex items-center space-x-2">
                                                  <span className={clsx(
                                                      "font-bold",
                                                      winRate > 55 ? "text-green-500" : winRate < 45 ? "text-red-500" : "text-muted-foreground"
                                                  )}>
                                                      Hero Score: {winRate.toFixed(0)}%
                                                  </span>
                                                  <span className="text-muted-foreground">({games} games)</span>
                                              </div>
                                              <button 
                                                className="text-primary hover:underline"
                                                onClick={() => {
                                                    if (onPlayLine) {
                                                        onPlayLine(scenario.line);
                                                    } else if (onLoadGame) {
                                                        const fullLine = [...historySan, ...scenario.line].join(' ');
                                                        onLoadGame(fullLine);
                                                    }
                                                }}
                                              >
                                                  Play Line
                                              </button>
                                          </div>
                                      </div>
                                  );
                              })}
                              {scenarios.length === 0 && (
                                  <div className="p-8 text-center text-muted-foreground text-sm">
                                      No scenarios found matching criteria.
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </>
          )}
      </div>
    </div>
  );
};

export default PrepExplorer;