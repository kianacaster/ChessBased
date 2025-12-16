import React, { useEffect, useState, useCallback } from 'react';
import type { EngineMetadata } from '../types/app';
import { Download, Loader2, Cpu, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface EngineManagerProps {
  onEngineSelected: (path: string | null) => void;
  currentEnginePath: string | null;
}

const EngineManager: React.FC<EngineManagerProps> = ({ onEngineSelected, currentEnginePath }) => {
  const [availableEngines, setAvailableEngines] = useState<EngineMetadata[]>([]);
  const [installedEngines, setInstalledEngines] = useState<{ name: string; path: string }[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [id: string]: number }>({});
  const [downloadStatus, setDownloadStatus] = useState<{ [id: string]: string }>({});
  const [downloadError, setDownloadError] = useState<{ [id: string]: string }>({});
  const [loadingEngines, setLoadingEngines] = useState(true);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAvailableEngines().then(engines => {
        setAvailableEngines(engines);
        setLoadingEngines(false);
      });
      
      window.electronAPI.getInstalledEngines().then(engines => {
          setInstalledEngines(engines);
      });

      window.electronAPI.onEngineDownloadProgress((data) => {
        setDownloadProgress(prev => ({ ...prev, [data.engineId]: data.progress }));
        setDownloadStatus(prev => ({ ...prev, [data.engineId]: `Downloading... ${data.progress}%` }));
      });
      window.electronAPI.onEngineDownloadStatus((data) => {
        setDownloadStatus(prev => ({ ...prev, [data.engineId]: data.status }));
      });
      window.electronAPI.onEngineDownloadError((data) => {
        setDownloadError(prev => ({ ...prev, [data.engineId]: data.error }));
        setDownloadStatus(prev => ({ ...prev, [data.engineId]: `Error: ${data.error}` }));
      });
    }
  }, []);

  const handleDownload = useCallback(async (engineId: string) => {
    if (window.electronAPI) {
      setDownloadProgress(prev => ({ ...prev, [engineId]: 0 }));
      setDownloadStatus(prev => ({ ...prev, [engineId]: 'Starting download...' }));
      setDownloadError(prev => ({ ...prev, [engineId]: '' }));

      try {
        const path = await window.electronAPI.downloadEngine(engineId);
        if (path) {
          onEngineSelected(path);
          setDownloadStatus(prev => ({ ...prev, [engineId]: 'Download and selection complete!' }));
          // Refresh installed list
          window.electronAPI.getInstalledEngines().then(engines => setInstalledEngines(engines));
        } else {
          setDownloadError(prev => ({ ...prev, [engineId]: 'Download failed or cancelled.' }));
          setDownloadStatus(prev => ({ ...prev, [engineId]: 'Download failed or cancelled.' }));
        }
      } catch (error) {
        setDownloadError(prev => ({ ...prev, [engineId]: error instanceof Error ? error.message : String(error) }));
        setDownloadStatus(prev => ({ ...prev, [engineId]: `Error: ${error instanceof Error ? error.message : String(error)}` }));
      }
    }
  }, [onEngineSelected]);

  const handleManualSelect = useCallback(async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectEngine();
      onEngineSelected(path);
    }
  }, [onEngineSelected]);
  
  const isInstalled = (engine: EngineMetadata) => {
      // Check if any installed engine matches the executable name
      // engine.executableName e.g. "stockfish" or "stockfish.exe"
      return installedEngines.some(e => e.name === engine.executableName || e.name.startsWith(engine.executableName.split('.')[0]));
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold mb-8 text-foreground flex items-center space-x-3 tracking-tight">
          <Cpu className="w-8 h-8 text-primary" />
          <span>Engine Manager</span>
        </h2>

        <div className="mb-10">
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-xs">Active Engine</h3>
          <div className="bg-card p-6 rounded-lg flex items-center justify-between shadow-sm border border-border">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground mb-1">Current Path</span>
              <p className="text-base font-mono bg-muted/50 px-3 py-1.5 rounded text-foreground truncate max-w-xl">
                {currentEnginePath || 'No engine selected'}
              </p>
            </div>
            <button
              onClick={handleManualSelect}
              className="ml-4 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md font-medium transition-colors text-sm"
            >
              Select Manually
            </button>
          </div>
        </div>
        
        {installedEngines.length > 0 && (
            <div className="mb-10">
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-xs">Installed Engines</h3>
              <div className="bg-card rounded-lg shadow-sm border border-border divide-y divide-border">
                  {installedEngines.map((engine, i) => (
                      <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col">
                             <span className="font-medium text-sm">{engine.name}</span>
                             <span className="text-xs text-muted-foreground truncate max-w-md">{engine.path}</span>
                          </div>
                          <button 
                             onClick={() => onEngineSelected(engine.path)}
                             className={clsx(
                                 "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                                 currentEnginePath === engine.path 
                                    ? "bg-green-500/10 text-green-500 border-green-500/20 cursor-default" 
                                    : "bg-background hover:bg-accent text-foreground border-border"
                             )}
                             disabled={currentEnginePath === engine.path}
                          >
                             {currentEnginePath === engine.path ? 'Active' : 'Select'}
                          </button>
                      </div>
                  ))}
              </div>
            </div>
        )}

        <h3 className="text-lg font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-xs">Available for Download</h3>
        {loadingEngines ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-3 text-sm font-medium">Loading catalog...</span>
          </div>
        ) : (
          <div className="grid gap-4">
            {availableEngines.map(engine => {
              const installed = isInstalled(engine);
              return (
              <div key={engine.id} className="bg-card p-6 rounded-lg shadow-sm border border-border hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-foreground flex items-center">
                      {engine.name} 
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono">v{engine.version}</span>
                      {installed && <span className="ml-2 text-green-500 text-xs flex items-center"><Check className="w-3 h-3 mr-1" /> Installed</span>}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{engine.description}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(engine.id)}
                    disabled={(downloadProgress[engine.id] !== undefined && downloadProgress[engine.id] < 100) || installed}
                    className={clsx(
                      "px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2 text-sm",
                      (downloadProgress[engine.id] !== undefined && downloadProgress[engine.id] < 100) || installed
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {downloadProgress[engine.id] !== undefined && downloadProgress[engine.id] < 100 ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{downloadProgress[engine.id]}%</span>
                      </>
                    ) : installed ? (
                        <>
                           <Check className="w-4 h-4" />
                           <span>Installed</span>
                        </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </>
                    )}
                  </button>
                </div>
                {(downloadStatus[engine.id] || downloadError[engine.id]) && (
                  <div className="mt-4 pt-4 border-t border-border">
                     {downloadStatus[engine.id] && (
                        <p className="text-xs text-muted-foreground font-mono">{downloadStatus[engine.id]}</p>
                      )}
                      {downloadError[engine.id] && (
                        <p className="text-xs text-destructive font-bold mt-1">Error: {downloadError[engine.id]}</p>
                      )}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EngineManager;