import React, { useState, useEffect, useMemo } from 'react';
import { Download, Globe, CheckCircle, AlertCircle, User, Trophy, Cpu } from 'lucide-react';
import type { PublicDatabaseMetadata } from '../types/app';
import { clsx } from 'clsx';

interface DownloadState {
  progress: number;
  status: string;
  error?: string;
  isComplete?: boolean;
}

const DatabaseLibrary: React.FC = () => {
  const [databases, setDatabases] = useState<PublicDatabaseMetadata[]>([]);
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});
  const [activeTab, setActiveTab] = useState<'players' | 'masters' | 'engines'>('players');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getPublicDatabases().then(setDatabases);

      window.electronAPI.onPublicDbDownloadProgress(({ dbId, progress }) => {
        setDownloads(prev => ({
          ...prev,
          [dbId]: { ...prev[dbId], progress, error: undefined }
        }));
      });

      window.electronAPI.onPublicDbDownloadStatus(({ dbId, status }) => {
        setDownloads(prev => ({
          ...prev,
          [dbId]: { ...prev[dbId], status }
        }));
      });
      
      window.electronAPI.onPublicDbDownloadError(({ dbId, error }) => {
        setDownloads(prev => ({
          ...prev,
          [dbId]: { ...prev[dbId], error, status: 'Failed', progress: 0 }
        }));
      });
    }
  }, []);

  const handleDownload = async (dbId: string) => {
    if (downloads[dbId]?.progress > 0 && !downloads[dbId]?.error && !downloads[dbId]?.isComplete) return; // Already downloading
    
    setDownloads(prev => ({
      ...prev,
      [dbId]: { progress: 0, status: 'Starting...', error: undefined }
    }));
    
    if (window.electronAPI) {
        await window.electronAPI.downloadPublicDatabase(dbId);
    }
  };

  const filteredDatabases = useMemo(() => {
      return databases.filter(db => db.category === activeTab);
  }, [databases, activeTab]);

  const tabs = [
      { id: 'players', label: 'Top Players', icon: User },
      { id: 'masters', label: 'Masters & Events', icon: Trophy },
      { id: 'engines', label: 'Engines (TCEC/AlphaZero)', icon: Cpu },
  ];

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex flex-col px-6 py-4 border-b border-border bg-sidebar/50 backdrop-blur-sm sticky top-0 z-10 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Database Library</h2>
            <p className="text-sm text-muted-foreground">Download curated game collections from the cloud</p>
          </div>
        </div>
        
        <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg w-fit">
            {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2",
                            activeTab === tab.id 
                                ? "bg-background text-foreground shadow-sm" 
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <Icon size={16} />
                        <span>{tab.label}</span>
                    </button>
                );
            })}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
        {filteredDatabases.map(db => {
           const downloadState = downloads[db.id];
           const isDownloading = downloadState && downloadState.progress < 100 && !downloadState.error && downloadState.status !== 'Done!';
           const isComplete = downloadState && downloadState.status === 'Done!';
           const hasError = downloadState && downloadState.error;

           return (
             <div key={db.id} className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col min-h-[300px]">
               <div className="p-5 flex-1 flex flex-col">
                 <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg leading-tight">{db.name}</h3>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{db.size}</span>
                 </div>
                 
                 <p className="text-sm text-muted-foreground mb-4 flex-1">{db.description}</p>
                 
                 <div className="text-xs text-muted-foreground/50 mb-4">
                    Source: <a href={db.url} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">{db.credit}</a>
                 </div>

                 {isDownloading ? (
                   <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-muted-foreground">
                        <span>{downloadState.status}</span>
                        <span>{downloadState.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                           className="h-full bg-primary transition-all duration-300 ease-out"
                           style={{ width: `${downloadState.progress}%` }}
                        />
                      </div>
                   </div>
                 ) : hasError ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 flex items-start space-x-2">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{downloadState.error}</span>
                    </div>
                 ) : isComplete ? (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-600 flex items-center justify-center space-x-2 font-medium">
                        <CheckCircle size={16} />
                        <span>Downloaded Successfully</span>
                    </div>
                 ) : (
                    <button
                      onClick={() => handleDownload(db.id)}
                      className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2 shadow-sm"
                    >
                       <Download size={16} />
                       <span>Download</span>
                    </button>
                 )}
               </div>
             </div>
           );
        })}
        {filteredDatabases.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No databases found in this category.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseLibrary;
