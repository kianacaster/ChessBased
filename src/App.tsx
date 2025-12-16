import Layout from './components/Layout';
import Board from './components/Board';
import useGame from './hooks/useGame';
import Notation from './components/Notation';
import LichessImport from './components/LichessImport';
import EngineManager from './components/EngineManager';
import DatabaseList from './components/DatabaseList';
import DatabaseView from './components/DatabaseView';
import SaveToDatabaseModal from './components/SaveToDatabaseModal';
import DatabaseExplorer from './components/DatabaseExplorer';
import PrepExplorer from './components/PrepExplorer';
import { Database, FileText, Settings, Play, Save, FolderOpen, Download, Cpu, LayoutDashboard, History, Activity, ChevronsUp, ArrowLeft, PlusCircle, BookOpen, Users } from 'lucide-react';
import * as React from 'react';
import { clsx } from 'clsx';
import { parseUciInfo, type EngineInfo } from './utils/engine';
import type { DatabaseEntry } from './types/app';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: SidebarItemProps) => (
  <button 
    onClick={onClick}
    className={clsx(
      "w-full text-left px-3 py-2 rounded-md flex items-center space-x-3 text-sm font-medium transition-all duration-200 group",
      active 
        ? "bg-primary/10 text-primary" 
        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    )}
  >
    <Icon className={clsx("w-4 h-4", active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")} />
    <span>{label}</span>
  </button>
);

function App() {
  const { fen, turn, move, dests, history, currentMoveIndex, jumpToMove, nodes, currentNode, goToNode, lastMove, loadPgn, exportPgn, goBack, goForward, goToStart, goToEnd, playSan, playLine, gameMetadata } = useGame();
  
  // Engine State
  const [engineInfo, setEngineInfo] = React.useState<EngineInfo | null>(null);
  const [isEngineRunning, setIsEngineRunning] = React.useState(false);
  const [isDeepAnalysis, setIsDeepAnalysis] = React.useState(false);
  const [engineOutput, setEngineOutput] = React.useState<string[]>([]); // Keep raw output for debug if needed

  const [currentView, setCurrentView] = React.useState<'board' | 'lichess' | 'engineManager' | 'databases' | 'databaseDetail'>('board');
  const [analysisTab, setAnalysisTab] = React.useState<'notation' | 'explorer' | 'prep'>('notation');
  const [enginePath, setEnginePath] = React.useState<string | null>(null);
  const [engineDisplayName, setEngineDisplayName] = React.useState<string>('');
  
  const [selectedDatabase, setSelectedDatabase] = React.useState<DatabaseEntry | null>(null);
  const [showSaveDbModal, setShowSaveDbModal] = React.useState(false);

  // Load engine path on startup
  React.useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getEnginePath().then(fullPath => {
        setEnginePath(fullPath);
        if (fullPath) {
          window.electronAPI.getBasename(fullPath).then(basename => {
            setEngineDisplayName(basename);
          });
        } else {
            setEngineDisplayName('');
        }
      });
    }
  }, []);

  // Listen for engine output
  React.useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onEngineAnalysisUpdate((output) => {
        // Parse info
        const info = parseUciInfo(output);
        if (info) {
          setEngineInfo(info);
        }
        // Also keep raw log for now
        setEngineOutput(prev => [...prev.slice(-19), output]);
      });
    }
  }, []);

  // React to FEN changes or Engine status changes to update analysis
  React.useEffect(() => {
    if (isEngineRunning && enginePath && window.electronAPI) {
      window.electronAPI.startEngine().then(() => {
        window.electronAPI.sendUciCommand('stop');
        window.electronAPI.sendUciCommand(`position fen ${fen}`);
        window.electronAPI.sendUciCommand(isDeepAnalysis ? 'go infinite' : 'go depth 20');
      });
    }
  }, [fen, isEngineRunning, enginePath, isDeepAnalysis]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid interfering with inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          goBack();
          break;
        case 'ArrowRight':
          goForward();
          break;
        case 'ArrowUp':
          goToStart();
          break;
        case 'ArrowDown':
          goToEnd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward, goToStart, goToEnd]);

  const handleMove = (orig: string, dest: string) => {
    move(orig, dest);
  };

  const toggleEngine = async () => {
    if (!window.electronAPI || !enginePath) return;

    if (isEngineRunning) {
      await window.electronAPI.sendUciCommand('stop');
      setIsEngineRunning(false);
    } else {
      setIsEngineRunning(true);
    }
  };

  const toggleDeepAnalysis = () => {
    setIsDeepAnalysis(!isDeepAnalysis);
  };

  const handleOpenFile = async () => {
    if (window.electronAPI) {
      const content = await window.electronAPI.openPgnFile();
      if (content) {
          loadPgn(content);
          setCurrentView('board');
      }
    }
  };
  
  const handleSaveGameFile = async () => {
      const pgn = exportPgn();
      if (window.electronAPI) {
          await window.electronAPI.savePgnFile(pgn);
      }
  };
  
  const handleSaveToDb = async (dbId: string) => {
      const pgn = exportPgn();
      if (window.electronAPI) {
          try {
             await window.electronAPI.dbAddGame(dbId, pgn);
             setShowSaveDbModal(false);
             // Optional: Show success toast
          } catch (e) {
              console.error("Failed to save to DB", e);
          }
      }
  };

  const handleEngineSelected = React.useCallback(async (path: string | null) => {
    setEnginePath(path);
    if (path) {
      const basename = await window.electronAPI.getBasename(path);
      setEngineDisplayName(basename);
    } else {
      setEngineDisplayName('');
    }
    setCurrentView('board');
  }, []);

  const handleLichessImport = (pgn: string) => {
    loadPgn(pgn);
    setCurrentView('board');
  };

  const triggerManualEngineSelection = React.useCallback(async () => {
    if (window.electronAPI) {
      const fullPath = await window.electronAPI.selectEngine();
      handleEngineSelected(fullPath);
    }
  }, [handleEngineSelected]);

  // Compute shapes for best move arrow
  const shapes = React.useMemo(() => {
    if (!engineInfo || !engineInfo.pv || engineInfo.pv.length === 0) return [];
    const bestMove = engineInfo.pv[0];
    if (bestMove.length < 4) return [];
    
    return [{
      orig: bestMove.substring(0, 2),
      dest: bestMove.substring(2, 4),
      brush: 'blue' // or 'green'
    }];
  }, [engineInfo]);
  
  const handleSelectDatabase = (db: DatabaseEntry) => {
      setSelectedDatabase(db);
      setCurrentView('databaseDetail');
  };
  
  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
      {showSaveDbModal && (
          <SaveToDatabaseModal 
             onClose={() => setShowSaveDbModal(false)}
             onSave={handleSaveToDb}
          />
      )}
      <Layout
        sidebar={
          <div className="flex flex-col h-full bg-sidebar">
            <div className="p-6 pb-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-1.5 bg-primary rounded-lg">
                  <Database className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">ChessBased</h1>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Library</div>
                <div className="space-y-1">
                  <SidebarItem 
                    icon={LayoutDashboard} 
                    label="My Games" 
                    active={currentView === 'board' && analysisTab === 'notation'}
                    onClick={() => { setCurrentView('board'); setAnalysisTab('notation'); }}
                  />
                  <SidebarItem 
                    icon={FileText} 
                    label="Databases" 
                    active={currentView === 'databases' || currentView === 'databaseDetail'} 
                    onClick={() => setCurrentView('databases')}
                  />
                  <SidebarItem 
                    icon={Users} 
                    label="Opening Prep" 
                    active={currentView === 'board' && analysisTab === 'prep'}
                    onClick={() => { setCurrentView('board'); setAnalysisTab('prep'); }}
                  />
                </div>
              </div>
              
              <div>
                <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tools</div>
                <div className="space-y-1">
                  <SidebarItem 
                    icon={Download} 
                    label="Import from Lichess" 
                    active={currentView === 'lichess'}
                    onClick={() => setCurrentView('lichess')}
                  />
                  <SidebarItem 
                    icon={Cpu} 
                    label="Engine Manager" 
                    active={currentView === 'engineManager'}
                    onClick={() => setCurrentView('engineManager')}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-sidebar-border bg-sidebar">
               <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-xs font-medium text-muted-foreground">Quick Actions</span>
               </div>
               <div className="grid grid-cols-4 gap-2">
                  <button onClick={handleOpenFile} className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-accent-foreground transition-colors" title="Open PGN">
                    <FolderOpen size={18} />
                    <span className="text-[10px] mt-1">Open</span>
                  </button>
                   <button onClick={() => setShowSaveDbModal(true)} className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-accent-foreground transition-colors" title="Save to Database">
                    <PlusCircle size={18} />
                    <span className="text-[10px] mt-1">Add to DB</span>
                  </button>
                   <button onClick={handleSaveGameFile} className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-accent-foreground transition-colors" title="Save to PGN File">
                    <Save size={18} />
                    <span className="text-[10px] mt-1">Save File</span>
                  </button>
                   <button onClick={triggerManualEngineSelection} className="flex flex-col items-center justify-center p-2 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-accent-foreground transition-colors" title="Select Engine">
                    <Cpu size={18} />
                    <span className="text-[10px] mt-1">Engine</span>
                  </button>
               </div>
               
               <div className="mt-4 px-2 py-2 bg-black/20 rounded border border-sidebar-border/50">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 overflow-hidden">
                       <div className={clsx("w-2 h-2 rounded-full shrink-0", enginePath ? "bg-green-500" : "bg-red-500")} />
                       <span className="text-xs text-muted-foreground truncate font-medium">
                         {enginePath ? engineDisplayName : 'No Engine'}
                       </span>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        }
        main={
          currentView === 'lichess' ? (
            <div className="flex flex-col h-full bg-background">
              <LichessImport onImport={handleLichessImport} />
            </div>
          ) : currentView === 'engineManager' ? (
            <EngineManager onEngineSelected={handleEngineSelected} currentEnginePath={enginePath} />
          ) : currentView === 'databases' ? (
             <DatabaseList onSelectDatabase={handleSelectDatabase} />
          ) : currentView === 'databaseDetail' && selectedDatabase ? (
             <DatabaseView 
                database={selectedDatabase} 
                onBack={() => setCurrentView('databases')} 
                onLoadGame={(pgn) => {
                    loadPgn(pgn);
                    setCurrentView('board');
                }}
             />
          ) : (
            <div className="flex flex-col h-full bg-background relative">
             <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-background to-transparent z-0 pointer-events-none" />
             
             <div className="w-full px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {gameMetadata ? `${gameMetadata.White || 'White'} vs ${gameMetadata.Black || 'Black'}` : 'White Player vs Black Player'}
                  </h2>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center space-x-2">
                     <span>{gameMetadata?.Event || 'Event Name'}</span>
                     <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                     <span>{gameMetadata?.Date ? gameMetadata.Date.substring(0,4) : '2024'}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                   {/* Board controls could go here */}
                </div>
             </div>
             
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
              <div className="relative w-full max-w-[80vh] aspect-square shadow-2xl rounded-sm overflow-hidden ring-1 ring-border/50">
                <Board fen={fen} turn={turn} onMove={handleMove} dests={dests} shapes={shapes} lastMove={lastMove} />
              </div>
            </div>
          </div>
          )
        }
        analysis={
          <div className="flex flex-col h-full bg-sidebar border-l border-sidebar-border">
             <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-sidebar-border flex items-center justify-between bg-sidebar">
                  <div className="flex space-x-1 bg-muted/20 p-1 rounded-lg">
                      <button 
                        onClick={() => setAnalysisTab('notation')}
                        className={clsx(
                            "px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-2",
                            analysisTab === 'notation' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <History size={14} />
                        <span>Moves</span>
                      </button>
                      <button 
                        onClick={() => setAnalysisTab('explorer')}
                        className={clsx(
                            "px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-2",
                            analysisTab === 'explorer' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <BookOpen size={14} />
                        <span>Explorer</span>
                      </button>
                      <button 
                        onClick={() => setAnalysisTab('prep')}
                        className={clsx(
                            "px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-2",
                            analysisTab === 'prep' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Users size={14} />
                        <span>Prep</span>
                      </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {analysisTab === 'notation' ? (
                      <Notation 
                        history={history} 
                        currentMoveIndex={currentMoveIndex} 
                        onMoveClick={jumpToMove}
                        nodes={nodes}
                        currentNodeId={currentNode.id}
                        onNodeClick={goToNode} 
                      />
                  ) : analysisTab === 'explorer' ? (
                      <DatabaseExplorer 
                        historySan={history.map(m => m.san)}
                        onPlayMove={(san) => {
                            playSan(san);
                        }}
                        onLoadGame={(pgn) => {
                            loadPgn(pgn);
                            setAnalysisTab('notation');
                        }}
                      />
                  ) : (
                      <PrepExplorer 
                        historySan={history.map(m => m.san)}
                        onPlayMove={(san) => {
                            playSan(san);
                        }}
                        onLoadGame={(pgn) => {
                            loadPgn(pgn);
                            setAnalysisTab('notation');
                        }}
                        onPlayLine={(moves) => {
                            playLine(moves);
                            setAnalysisTab('notation');
                        }}
                      />
                  )}
                </div>
             </div>
             
             <div className="h-1/3 border-t border-sidebar-border bg-sidebar flex flex-col">
                <div className="px-4 py-2 bg-sidebar-accent/30 border-b border-sidebar-border flex justify-between items-center">
                   <div className="flex items-center space-x-2">
                      <Activity size={14} className={isEngineRunning ? "text-green-500 animate-pulse" : "text-muted-foreground"} />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Engine Analysis</span>
                   </div>
                   <button 
                      className={clsx(
                        "text-xs px-2 py-0.5 rounded transition-colors border",
                        isEngineRunning 
                          ? "border-red-500/50 text-red-400 hover:bg-red-500/10" 
                          : "border-green-500/50 text-green-400 hover:bg-green-500/10"
                      )}
                      onClick={toggleEngine}
                   >
                      {isEngineRunning ? 'Stop' : 'Start'}
                   </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                   {!engineInfo ? (
                     <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 italic space-y-2">
                       <Cpu size={24} />
                       <span>{isEngineRunning ? 'Calculating...' : 'Engine idle'}</span>
                     </div>
                   ) : (
                     <div className="space-y-4">
                       <div className="flex items-baseline space-x-4 pb-2 border-b border-sidebar-border/50">
                         <span className={clsx(
                           "text-2xl font-bold",
                           engineInfo.score.unit === 'mate' 
                             ? "text-pink-500" 
                             : ((engineInfo.score.value * (turn === 'white' ? 1 : -1)) > 0 ? "text-green-400" : ((engineInfo.score.value * (turn === 'white' ? 1 : -1)) < 0 ? "text-red-400" : "text-gray-400"))
                         )}>
                           {engineInfo.score.unit === 'cp' 
                             ? ((engineInfo.score.value * (turn === 'white' ? 1 : -1)) / 100).toFixed(2) 
                             : `#${engineInfo.score.value}`}
                         </span>
                         <div className="flex flex-col text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                               <span>Depth {engineInfo.depth}/{engineInfo.seldepth}</span>
                               <button 
                                 onClick={toggleDeepAnalysis}
                                 className={clsx(
                                   "p-0.5 rounded transition-colors hover:bg-muted-foreground/20",
                                   isDeepAnalysis ? "text-primary" : "text-muted-foreground"
                                 )}
                                 title={isDeepAnalysis ? "Disable Deep Analysis" : "Enable Deep Analysis (Infinite)"}
                               >
                                 <ChevronsUp size={14} />
                               </button>
                            </div>
                            <span>{Math.round(engineInfo.nps / 1000)}k nodes/s</span>
                         </div>
                       </div>
                       
                       <div className="space-y-1">
                          <div className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Best Line</div>
                          <div className="text-sm leading-relaxed text-foreground/90 break-words">
                            {engineInfo.pv && engineInfo.pv.map((move, i) => (
                              <span key={i} className={clsx(
                                "inline-block mr-1.5",
                                i === 0 ? "text-blue-400 font-bold" : ""
                              )}>
                                {move}
                              </span>
                            ))}
                          </div>
                       </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        }
      />
    </div>
  );
}

export default App;