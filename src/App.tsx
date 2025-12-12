import Layout from './components/Layout';
import Board from './components/Board';
import useGame from './hooks/useGame';
import Notation from './components/Notation';
import LichessImport from './components/LichessImport';
import EngineManager from './components/EngineManager'; // Import EngineManager
import { Database, FileText, Settings, Play, Save, FolderOpen, Download, Cpu } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

function App() {
  const { fen, turn, move, dests, history, currentMoveIndex, jumpToMove } = useGame();
  
  const [engineOutput, setEngineOutput] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'board' | 'lichess' | 'engineManager'>('board'); // Add 'engineManager' view
  const [enginePath, setEnginePath] = useState<string | null>(null);
  const [engineDisplayName, setEngineDisplayName] = useState<string>('');

  // Load engine path on startup
  useEffect(() => {
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
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onEngineAnalysisUpdate((output) => {
        setEngineOutput(prev => [...prev.slice(-19), output]); // Keep last 20 lines
      });
    }
  }, []);

  const handleMove = (orig: string, dest: string) => {
    move(orig, dest);
    // Request engine analysis for the new position (simplified for now)
    if (window.electronAPI && enginePath) { // Only send command if engine path is set
      window.electronAPI.sendUciCommand(`position fen ${fen}`);
      window.electronAPI.sendUciCommand('go depth 10');
    }
  };

  const handleOpenFile = async () => {
    if (window.electronAPI) {
      await window.electronAPI.openPgnFile();
      // In a real app, we'd load the game here
    }
  };

  const handleEngineSelected = useCallback(async (path: string | null) => {
    setEnginePath(path);
    if (path) {
      const basename = await window.electronAPI.getBasename(path);
      setEngineDisplayName(basename);
    } else {
      setEngineDisplayName('');
    }
    setCurrentView('board'); // Go back to board view after selection
  }, []);

  const handleLichessImport = (pgn: string) => {
    console.log('Imported PGN length:', pgn.length);
    // Here we could load the games list or the first game
    setCurrentView('board');
  };

  const triggerManualEngineSelection = useCallback(async () => {
    if (window.electronAPI) {
      const fullPath = await window.electronAPI.selectEngine();
      handleEngineSelected(fullPath); // Use the existing handler to update state
    }
  }, [handleEngineSelected]);

  return (
    <div className="flex h-screen w-screen bg-[#161512] text-[#c0c0c0] overflow-hidden">
      <Layout
        sidebar={
          <div className="flex flex-col h-full bg-[#262421]">
            <div className="p-4 border-b border-gray-700 flex items-center space-x-2">
              <Database className="w-6 h-6 text-blue-500" />
              <h1 className="text-xl font-bold text-gray-200 tracking-tight">ChessBased</h1>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase">Library</div>
              <button 
                onClick={() => setCurrentView('board')}
                className={`w-full text-left px-4 py-2 hover:bg-white/5 flex items-center space-x-3 text-sm transition-colors ${currentView === 'board' ? 'bg-white/10 text-white' : ''}`}
              >
                <FolderOpen className="w-4 h-4" />
                <span>My Games</span>
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center space-x-3 text-sm transition-colors">
                <FileText className="w-4 h-4" />
                <span>Grandmaster DB</span>
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center space-x-3 text-sm transition-colors">
                <Save className="w-4 h-4" />
                <span>Saved Analysis</span>
              </button>
              
              <div className="px-3 mt-4 mb-2 text-xs font-semibold text-gray-500 uppercase">Tools</div>
              <button 
                onClick={() => setCurrentView('lichess')}
                className={`w-full text-left px-4 py-2 hover:bg-white/5 flex items-center space-x-3 text-sm transition-colors ${currentView === 'lichess' ? 'bg-white/10 text-white' : ''}`}
              >
                <Download className="w-4 h-4" />
                <span>Import from Lichess</span>
              </button>
              <button 
                onClick={() => setCurrentView('engineManager')}
                className={`w-full text-left px-4 py-2 hover:bg-white/5 flex items-center space-x-3 text-sm transition-colors ${currentView === 'engineManager' ? 'bg-white/10 text-white' : ''}`}
              >
                <Cpu className="w-4 h-4" />
                <span>Engine Manager</span>
              </button>
            </div>

            <div className="p-4 border-t border-gray-700">
               <div className="flex space-x-2 justify-center">
                  <button onClick={handleOpenFile} className="p-2 hover:bg-white/10 rounded" title="Open PGN">
                    <FolderOpen size={20} />
                  </button>
                   <button onClick={triggerManualEngineSelection} className="p-2 hover:bg-white/10 rounded" title="Select Engine">
                    <Cpu size={20} />
                  </button>
                   <button className="p-2 hover:bg-white/10 rounded" title="Settings">
                    <Settings size={20} />
                  </button>
               </div>
               {enginePath && (
                 <p className="mt-2 text-xs text-gray-500 text-center truncate" title={enginePath}>Engine: {engineDisplayName}</p>
               )}
               {!enginePath && (
                 <p className="mt-2 text-xs text-red-500 text-center">No engine selected. Click Engine Manager or CPU icon to select.</p>
               )}
            </div>
          </div>
        }
        main={
          currentView === 'lichess' ? (
            <div className="flex flex-col h-full bg-[#302e2c]">
              <LichessImport onImport={handleLichessImport} />
            </div>
          ) : currentView === 'engineManager' ? (
            <EngineManager onEngineSelected={handleEngineSelected} currentEnginePath={enginePath} />
          ) : (
            <div className="flex flex-col h-full bg-[#302e2c]">
             <div className="w-full bg-[#262421] px-4 py-2 flex items-center justify-between border-b border-[#3e3c39] shadow-sm z-10">
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-300">White Player vs Black Player</div>
                  <div className="text-xs text-gray-500">Event Name • 2024</div>
                </div>
                <div className="flex space-x-2">
                   {/* Board controls could go here */}
                </div>
             </div>
             
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <div className="w-full max-w-[80vh] aspect-square shadow-2xl rounded-sm overflow-hidden border-8 border-[#262421]">
                <Board fen={fen} turn={turn} onMove={handleMove} dests={dests} />
              </div>
            </div>
          </div>
          )
        }
        analysis={
          <div className="flex flex-col h-full bg-[#262421]">
             <div className="flex-1 overflow-hidden">
                <Notation history={history} currentMoveIndex={currentMoveIndex} onMoveClick={jumpToMove} />
             </div>
             
             <div className="h-1/3 border-t border-gray-700 bg-[#1e1d1b] flex flex-col">
                <div className="px-2 py-1 bg-[#2b2926] text-xs font-bold text-gray-400 border-b border-gray-700 flex justify-between items-center">
                   <span>ENGINE ANALYSIS</span>
                   <button className="hover:text-white" onClick={() => window.electronAPI?.startEngine()}>
                      <Play size={12} />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-xs text-green-400">
                   {engineOutput.length === 0 ? (
                     <span className="text-gray-600">Engine idle...</span>
                   ) : (
                     engineOutput.map((line, i) => <div key={i}>{line}</div>)
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