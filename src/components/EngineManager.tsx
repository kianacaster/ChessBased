import React, { useEffect, useState, useCallback } from 'react';
import type { EngineMetadata } from '../../electron/engines/engine-metadata';
import { Download, Loader2, Cpu } from 'lucide-react';
import { clsx } from 'clsx';

interface EngineManagerProps {
  onEngineSelected: (path: string | null) => void;
  currentEnginePath: string | null;
}

const EngineManager: React.FC<EngineManagerProps> = ({ onEngineSelected, currentEnginePath }) => {
  const [availableEngines, setAvailableEngines] = useState<EngineMetadata[]>([]);
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

  return (
    <div className="flex flex-col h-full bg-[#302e2c] text-gray-200 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-100 flex items-center space-x-2">
        <Cpu className="w-7 h-7" />
        <span>Engine Manager</span>
      </h2>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-3">Current Engine</h3>
        <div className="bg-[#262421] p-4 rounded-lg flex items-center justify-between shadow-md border border-[#3e3c39]">
          <p className="text-lg truncate">
            {currentEnginePath ? `Selected: ${currentEnginePath}` : 'No engine selected'}
          </p>
          <button
            onClick={handleManualSelect}
            className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors"
          >
            Select Manually
          </button>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-3">Download & Install Engines</h3>
      {loadingEngines ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-lg">Loading available engines...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {availableEngines.map(engine => (
            <div key={engine.id} className="bg-[#262421] p-4 rounded-lg shadow-md border border-[#3e3c39]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold">{engine.name} (v{engine.version})</h4>
                  <p className="text-sm text-gray-400">{engine.description}</p>
                </div>
                <button
                  onClick={() => handleDownload(engine.id)}
                  disabled={downloadProgress[engine.id] !== undefined && downloadProgress[engine.id] < 100}
                  className={clsx(
                    "px-4 py-2 rounded-md text-white font-medium transition-colors flex items-center space-x-2",
                    downloadProgress[engine.id] !== undefined && downloadProgress[engine.id] < 100
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  )}
                >
                  {downloadProgress[engine.id] !== undefined && downloadProgress[engine.id] < 100 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{downloadProgress[engine.id]}%</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>
              {downloadStatus[engine.id] && (
                <p className="mt-2 text-sm text-gray-400">{downloadStatus[engine.id]}</p>
              )}
              {downloadError[engine.id] && (
                <p className="mt-2 text-sm text-red-500">Error: {downloadError[engine.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EngineManager;
