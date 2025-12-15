import React, { useEffect, useState } from 'react';
import type { DatabaseEntry } from '../types/app';
import { Database, X, FileText, Plus } from 'lucide-react';

interface SaveToDatabaseModalProps {
  onClose: () => void;
  onSave: (dbId: string) => void;
}

const SaveToDatabaseModal: React.FC<SaveToDatabaseModalProps> = ({ onClose, onSave }) => {
  const [databases, setDatabases] = useState<DatabaseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDatabases = async () => {
      if (window.electronAPI) {
        try {
          const dbs = await window.electronAPI.dbGetList();
          setDatabases(dbs);
        } catch (error) {
          console.error("Failed to load databases", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadDatabases();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Save to Database</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Loading databases...</div>
          ) : databases.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No databases found.</p>
              <p className="text-xs mt-1">Create one in the Databases tab first.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {databases.map(db => (
                <button
                  key={db.id}
                  onClick={() => onSave(db.id)}
                  className="w-full flex items-center justify-between p-3 rounded-md hover:bg-muted text-left transition-colors group"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-medium truncate">{db.name}</span>
                        <span className="text-xs text-muted-foreground">{db.gameCount} games</span>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-border bg-muted/20 text-xs text-center text-muted-foreground">
           Click a database to save the current game
        </div>
      </div>
    </div>
  );
};

export default SaveToDatabaseModal;
