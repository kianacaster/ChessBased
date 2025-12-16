import React, { useEffect, useState } from 'react';
import type { DatabaseEntry } from '../types/app';
import { Database, Plus, FolderOpen, FileText, Calendar, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface DatabaseListProps {
  onSelectDatabase: (db: DatabaseEntry) => void;
}

const DatabaseList: React.FC<DatabaseListProps> = ({ onSelectDatabase }) => {
  const [databases, setDatabases] = useState<DatabaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDbName, setNewDbName] = useState('');

  const loadDatabases = async () => {
    try {
      if (window.electronAPI) {
        const dbs = await window.electronAPI.dbGetList();
        setDatabases(dbs);
      }
    } catch (err) {
      console.error("Failed to load databases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabases();
    
    // Listen for new downloads completion to refresh list
    if (window.electronAPI) {
        const removeListener = window.electronAPI.onLichessDownloadComplete((db) => {
            setDatabases(prev => {
                if (prev.find(d => d.id === db.id)) return prev;
                return [...prev, db];
            });
        });
        // cleanup? The listener returns void currently in preload... 
        // We might need to implement removeListener in preload if we want to be strict,
        // but for this app structure it might be fine.
    }
  }, []);

  const handleCreate = async () => {
    if (!newDbName.trim()) return;
    try {
      const newDb = await window.electronAPI.dbCreate(newDbName);
      setDatabases([...databases, newDb]);
      setIsCreating(false);
      setNewDbName('');
    } catch (err) {
      console.error("Failed to create database", err);
    }
  };

  const handleImport = async () => {
    try {
      const newDb = await window.electronAPI.dbImport();
      if (newDb) {
        setDatabases(prev => {
            // Avoid duplicates
            if (prev.find(d => d.id === newDb.id)) return prev;
            return [...prev, newDb];
        });
      }
    } catch (err) {
      console.error("Failed to import database", err);
    }
  };
  
  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this database? The file will be moved to the trash.')) {
          try {
              await window.electronAPI.dbDelete(id);
              setDatabases(prev => prev.filter(db => db.id !== id));
          } catch (err) {
              console.error("Failed to delete database", err);
          }
      }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading databases...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Databases</h2>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={handleImport}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
            >
                <FolderOpen size={16} />
                <span>Import PGN</span>
            </button>
            <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
            >
                <Plus size={16} />
                <span>New Database</span>
            </button>
        </div>
      </div>

      {isCreating && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-medium mb-2">Create New Database</h3>
            <div className="flex space-x-2">
                <input 
                    type="text" 
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    placeholder="Database Name"
                    className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                />
                <button 
                    onClick={handleCreate}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                >
                    Create
                </button>
                <button 
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {databases.map(db => (
            <button 
                key={db.id}
                onClick={() => onSelectDatabase(db)}
                className="flex flex-col text-left p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all group relative"
            >
                <div className="flex items-center space-x-3 mb-3">
                    <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-semibold text-lg truncate w-full pr-8">{db.name}</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center justify-between">
                        <span>Games</span>
                        <span className="font-mono">{db.gameCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>Modified</span>
                        </span>
                        <span className="text-xs">
                            {new Date(db.lastModified).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground truncate w-full opacity-70">
                    {db.path}
                </div>
                
                <div 
                    onClick={(e) => handleDelete(db.id, e)}
                    className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Database"
                >
                    <Trash2 size={16} />
                </div>
            </button>
        ))}
        {databases.length === 0 && !isCreating && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <Database className="w-12 h-12 mb-4 opacity-20" />
                <p>No databases found.</p>
                <p className="text-sm">Create a new one or import a PGN file.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseList;