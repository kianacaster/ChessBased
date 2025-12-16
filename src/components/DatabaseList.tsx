import React, { useEffect, useState } from 'react';
import type { DatabaseEntry } from '../types/app';
import { Database, Plus, FolderOpen, FileText, Calendar, Trash2, Edit2, Merge, CheckSquare, Square } from 'lucide-react';
import { clsx } from 'clsx';

interface DatabaseListProps {
  onSelectDatabase: (db: DatabaseEntry) => void;
}

const DatabaseList: React.FC<DatabaseListProps> = ({ onSelectDatabase }) => {
  const [databases, setDatabases] = useState<DatabaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  
  // Selection & Management State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeName, setMergeName] = useState('');

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
    
    if (window.electronAPI) {
        const removeListener = window.electronAPI.onLichessDownloadComplete((db) => {
            setDatabases(prev => {
                if (prev.find(d => d.id === db.id)) return prev;
                return [...prev, db];
            });
        });
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
              if (selectedIds.has(id)) {
                  const next = new Set(selectedIds);
                  next.delete(id);
                  setSelectedIds(next);
              }
          } catch (err) {
              console.error("Failed to delete database", err);
          }
      }
  };

  const handleRenameStart = (db: DatabaseEntry, e: React.MouseEvent) => {
      e.stopPropagation();
      setRenamingId(db.id);
      setRenameValue(db.name);
  };

  const handleRenameSubmit = async () => {
      if (!renamingId || !renameValue.trim()) {
          setRenamingId(null);
          return;
      }
      try {
          await window.electronAPI.dbRename(renamingId, renameValue.trim());
          setDatabases(prev => prev.map(db => db.id === renamingId ? { ...db, name: renameValue.trim() } : db));
          setRenamingId(null);
      } catch (err) {
          console.error("Failed to rename database", err);
      }
  };

  const toggleSelection = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const handleMerge = async () => {
      if (!mergeName.trim() || selectedIds.size < 2) return;
      try {
          const newDb = await window.electronAPI.dbMerge(Array.from(selectedIds), mergeName);
          setDatabases(prev => [...prev, newDb]);
          setIsMerging(false);
          setMergeName('');
          setSelectedIds(new Set());
          setIsSelectionMode(false);
      } catch (err) {
          console.error("Merge failed", err);
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
            {isSelectionMode ? (
                <>
                    <button 
                        onClick={() => setIsMerging(true)}
                        disabled={selectedIds.size < 2}
                        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                    >
                        <Merge size={16} />
                        <span>Merge Selected ({selectedIds.size})</span>
                    </button>
                    <button 
                        onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
                        className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                </>
            ) : (
                <button 
                    onClick={() => setIsSelectionMode(true)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                >
                    <CheckSquare size={16} />
                    <span>Select / Merge</span>
                </button>
            )}
            
            {!isSelectionMode && (
                <>
                    <button 
                        onClick={handleImport}
                        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                    >
                        <FolderOpen size={16} />
                        <span>Import</span>
                    </button>
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
                    >
                        <Plus size={16} />
                        <span>New</span>
                    </button>
                </>
            )}
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
                <button onClick={handleCreate} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Create</button>
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">Cancel</button>
            </div>
        </div>
      )}

      {isMerging && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg animate-in fade-in slide-in-from-top-2">
            <h3 className="text-sm font-medium mb-2">Merge Selected Databases</h3>
            <p className="text-xs text-muted-foreground mb-3">Creating a new database from {selectedIds.size} sources.</p>
            <div className="flex space-x-2">
                <input 
                    type="text" 
                    value={mergeName}
                    onChange={(e) => setMergeName(e.target.value)}
                    placeholder="New Merged Database Name"
                    className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                />
                <button onClick={handleMerge} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">Merge</button>
                <button onClick={() => setIsMerging(false)} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium">Cancel</button>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {databases.map(db => (
            <div 
                key={db.id}
                onClick={(e) => {
                    if (isSelectionMode || e.ctrlKey || e.metaKey) {
                        if (!isSelectionMode) {
                             setIsSelectionMode(true);
                             // If starting selection with ctrl/meta, we just select this one.
                             // Existing selectedIds are likely empty if mode was false.
                             const next = new Set<string>();
                             next.add(db.id);
                             setSelectedIds(next);
                        } else {
                             toggleSelection(db.id);
                        }
                    }
                    else onSelectDatabase(db);
                }}
                className={clsx(
                    "flex flex-col text-left p-4 bg-card border rounded-lg transition-all group relative cursor-pointer",
                    isSelectionMode && selectedIds.has(db.id) ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50 hover:shadow-md"
                )}
            >
                <div className="flex items-center space-x-3 mb-3">
                    {isSelectionMode && (
                        <div className={clsx("text-primary", selectedIds.has(db.id) ? "opacity-100" : "opacity-50")}>
                            {selectedIds.has(db.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                        </div>
                    )}
                    <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    
                    {renamingId === db.id ? (
                        <input 
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                            className="flex-1 bg-input border border-border rounded px-1 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                        />
                    ) : (
                        <span className="font-semibold text-lg truncate w-full pr-16">{db.name}</span>
                    )}
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
                
                {!isSelectionMode && renamingId !== db.id && (
                    <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={(e) => handleRenameStart(db, e)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                            title="Rename"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => handleDelete(db.id, e)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
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