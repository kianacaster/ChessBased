import React, { useEffect, useState } from 'react';
import type { PrepComparisonResult, PrepScenario } from '../types/app';
import { Users, GitBranch, Table, Download, Play, Search, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { clsx } from 'clsx';

interface PrepState {
  heroName: string;
  opponentName: string;
  heroColor: 'white' | 'black'; // Added
  heroDbId: string | null;
  opponentDbId: string | null;
  result: PrepComparisonResult | null;
  scenarios: PrepScenario[];
  isLoading: boolean;
  status: string;
}

interface PrepExplorerProps {
  historySan: string[];
  onPlayMove?: (san: string) => void;
  onLoadGame?: (pgn: string) => void;
  onPlayLine?: (moves: string[]) => void;
  prepState: PrepState;
  setPrepState: React.Dispatch<React.SetStateAction<PrepState>>;
}

const PrepExplorer: React.FC<PrepExplorerProps> = ({ historySan, onPlayMove, onLoadGame, onPlayLine, prepState, setPrepState }) => {
  const [viewMode, setViewMode] = useState<'table' | 'scenarios'>('scenarios');

  // Silent update when moves change
  useEffect(() => {
    if (!window.electronAPI) return;
    if (!prepState.heroDbId || !prepState.opponentDbId) return;
    if (prepState.isLoading) return; 
    if (!prepState.result) return;

    const timer = setTimeout(() => {
        // Pass context (names + color) to get specific filtered logic
        const context = {
            heroName: prepState.heroName,
            opponentName: prepState.opponentName,
            heroColor: prepState.heroColor
        };

        const p1 = window.electronAPI.dbCompare([prepState.heroDbId!], [prepState.opponentDbId!], historySan)
            .then(res => setPrepState(prev => ({ ...prev, result: res })));
            
        const p2 = window.electronAPI.dbGetPrepScenarios([prepState.heroDbId!], [prepState.opponentDbId!], historySan, 6, context)
            .then(scens => setPrepState(prev => ({ ...prev, scenarios: scens })));

        Promise.all([p1, p2]).catch(console.error);
    }, 300);

    return () => clearTimeout(timer);
  }, [historySan, prepState.heroDbId, prepState.opponentDbId, prepState.heroColor]); // Added color dependency

  const handlePrepare = async () => {
      if (!prepState.heroName.trim() || !prepState.opponentName.trim()) return;
      if (!window.electronAPI) return;
      
      setPrepState(prev => ({ ...prev, isLoading: true, status: 'Initializing...', result: null, scenarios: [] }));
      
      try {
          if (prepState.heroDbId) window.electronAPI.dbDelete(prepState.heroDbId).catch(() => {});
          if (prepState.opponentDbId) window.electronAPI.dbDelete(prepState.opponentDbId).catch(() => {});

          // 1. Fetch Hero
          setPrepState(prev => ({ ...prev, status: `Fetching games for ${prev.heroName}...` }));
          // Fetch ALL games to ensure we get enough of specific color
          const heroFilter = { perfType: 'blitz,rapid,classical', max: 1000, color: prepState.heroColor };
          const heroPgn = await window.electronAPI.fetchLichessGames(prepState.heroName, heroFilter);
          
          if (!heroPgn) throw new Error(`No games found for ${prepState.heroName} as ${prepState.heroColor}`);
          
          const heroDbName = `prep_hero_${prepState.heroName}_${Date.now()}`;
          const heroEntry = await window.electronAPI.dbCreate(heroDbName);
          await window.electronAPI.dbAddGame(heroEntry.id, heroPgn);
          
          // 2. Fetch Opponent
          setPrepState(prev => ({ ...prev, status: `Fetching games for ${prev.opponentName}...` }));
          // Opponent plays opposite color
          const oppColor: 'white' | 'black' = prepState.heroColor === 'white' ? 'black' : 'white';
          const opponentFilter = { perfType: 'blitz,rapid,classical', max: 1000, color: oppColor };
          const oppPgn = await window.electronAPI.fetchLichessGames(prepState.opponentName, opponentFilter);
          
          if (!oppPgn) throw new Error(`No games found for ${prepState.opponentName} as ${oppColor}`);

          const oppDbName = `prep_opp_${prepState.opponentName}_${Date.now()}`;
          const oppEntry = await window.electronAPI.dbCreate(oppDbName);
          await window.electronAPI.dbAddGame(oppEntry.id, oppPgn);
          
          // 3. Analyze
          setPrepState(prev => ({ ...prev, status: 'Analyzing...', heroDbId: heroEntry.id, opponentDbId: oppEntry.id }));
          
          const context = {
            heroName: prepState.heroName,
            opponentName: prepState.opponentName,
            heroColor: prepState.heroColor
          };

          const res = await window.electronAPI.dbCompare([heroEntry.id], [oppEntry.id], historySan);
          const scens = await window.electronAPI.dbGetPrepScenarios([heroEntry.id], [oppEntry.id], historySan, 6, context);
          
          setPrepState(prev => ({ 
              ...prev, 
              result: res, 
              scenarios: scens, 
              isLoading: false, 
              status: '' 
          }));
          
      } catch (e: any) {
          console.error("Prep failed", e);
          setPrepState(prev => ({ 
              ...prev, 
              isLoading: false, 
              status: 'Error: ' + (e.message || 'Failed') 
          }));
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
         {prepState.result && (
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
             </div>
         )}
      </div>

      <div className="p-4 border-b border-border bg-card">
          <div className="space-y-3">
              <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Hero (You)</label>
                  <div className="flex space-x-2 mt-1">
                      <input 
                          type="text" 
                          value={prepState.heroName}
                          onChange={(e) => setPrepState(prev => ({ ...prev, heroName: e.target.value }))}
                          placeholder="Lichess Username"
                          className="flex-1 bg-input border border-border rounded px-2 py-1.5 text-sm"
                      />
                      <div className="flex bg-muted rounded p-0.5">
                          <button
                              onClick={() => setPrepState(prev => ({ ...prev, heroColor: 'white' }))}
                              className={clsx(
                                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                                  prepState.heroColor === 'white' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                              )}
                          >
                              White
                          </button>
                          <button
                              onClick={() => setPrepState(prev => ({ ...prev, heroColor: 'black' }))}
                              className={clsx(
                                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                                  prepState.heroColor === 'black' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                              )}
                          >
                              Black
                          </button>
                      </div>
                  </div>
              </div>
              <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase">Opponent</label>
                  <input 
                      type="text" 
                      value={prepState.opponentName}
                      onChange={(e) => setPrepState(prev => ({ ...prev, opponentName: e.target.value }))}
                      placeholder="Lichess Username"
                      className="w-full mt-1 bg-input border border-border rounded px-2 py-1.5 text-sm"
                  />
              </div>
              <button 
                  onClick={handlePrepare}
                  disabled={prepState.isLoading || !prepState.heroName || !prepState.opponentName}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                  {prepState.isLoading ? <Search size={16} className="animate-spin" /> : <Play size={16} />}
                  <span>{prepState.isLoading ? prepState.status || 'Analyzing...' : 'Prepare Strategy'}</span>
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto">
          {prepState.isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center space-y-2">
                  <Download className="animate-bounce w-6 h-6 opacity-50" />
                  <span>{prepState.status}</span>
              </div>
          ) : (!prepState.result && prepState.scenarios.length === 0) ? (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center space-y-3 opacity-60">
                  <ArrowRightLeft size={32} />
                  <p>Enter usernames above to analyze opening trends and find winning lines.</p>
                  {prepState.status.startsWith('Error') && (
                      <div className="text-red-500 bg-red-500/10 p-2 rounded">{prepState.status}</div>
                  )}
              </div>
          ) : (
              <>
                  {viewMode === 'table' && prepState.result && (
                      <div className="flex flex-col">
                          {/* Summary */}
                          <div className="p-4 border-b border-border grid grid-cols-2 gap-4">
                              <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-500">{prepState.result.statsA.totalGames}</div>
                                  <div className="text-xs text-muted-foreground uppercase">Hero Games</div>
                              </div>
                              <div className="text-center">
                                  <div className="text-2xl font-bold text-red-500">{prepState.result.statsB.totalGames}</div>
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
                                  {prepState.result.moves.map((move, i) => {
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
                              {prepState.scenarios.map((scenario, i) => {
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
                                                  <button 
                                                    className="text-muted-foreground hover:text-primary hover:underline"
                                                    onClick={() => {
                                                        if (onLoadGame && scenario.heroStats.exampleGame) {
                                                            onLoadGame(scenario.heroStats.exampleGame);
                                                        }
                                                    }}
                                                    title="Load Example Game"
                                                  >
                                                      ({games} games)
                                                  </button>
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
                              {prepState.scenarios.length === 0 && (
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