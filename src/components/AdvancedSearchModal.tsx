import React, { useState } from 'react';
import type { GameFilter } from '../types/app';
import { X, Search, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filter: GameFilter) => void;
  currentFilter: GameFilter;
}

const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({ isOpen, onClose, onSearch, currentFilter }) => {
  const [filter, setFilter] = useState<GameFilter>(currentFilter);
  const [activeTab, setActiveTab] = useState<'general' | 'board'>('general');

  // Helper for Position Constraints UI
  const [positionConstraint, setPositionConstraint] = useState({ sq: '', piece: 'wP' });

  if (!isOpen) return null;

  const handleChange = (key: keyof GameFilter, value: any) => {
      setFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleMaterialChange = (color: 'white' | 'black', role: string, value: string) => {
      const num = parseInt(value);
      setFilter(prev => {
          const currentMat = prev.material || {};
          const colorMat = currentMat[color] || {};
          
          if (isNaN(num)) {
              const { [role]: _, ...rest } = colorMat;
              return { ...prev, material: { ...currentMat, [color]: rest } };
          } else {
              return { ...prev, material: { ...currentMat, [color]: { ...colorMat, [role]: num } } };
          }
      });
  };

  const addPositionConstraint = () => {
      if (!positionConstraint.sq) return;
      setFilter(prev => ({
          ...prev,
          position: { ...prev.position, [positionConstraint.sq.toLowerCase()]: positionConstraint.piece }
      }));
      setPositionConstraint({ sq: '', piece: 'wP' });
  };

  const removePositionConstraint = (sq: string) => {
      setFilter(prev => {
          const { [sq]: _, ...rest } = prev.position || {};
          return { ...prev, position: rest };
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(filter);
      onClose();
  };

  const handleClear = () => {
      const empty: GameFilter = {};
      setFilter(empty);
      onSearch(empty);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-lg p-0 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-bold">Advanced Search</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
            </button>
        </div>
        
        <div className="flex border-b border-border bg-muted/20">
            <button 
                onClick={() => setActiveTab('general')}
                className={clsx(
                    "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'general' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
            >
                General Info
            </button>
            <button 
                onClick={() => setActiveTab('board')}
                className={clsx(
                    "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                    activeTab === 'board' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
            >
                Board & Material
            </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'general' ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">White Player</label>
                            <input 
                                type="text" 
                                className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                                value={filter.white || ''}
                                onChange={e => handleChange('white', e.target.value)}
                                placeholder="Name..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Black Player</label>
                            <input 
                                type="text" 
                                className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                                value={filter.black || ''}
                                onChange={e => handleChange('black', e.target.value)}
                                placeholder="Name..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Elo Min</label>
                            <input 
                                type="number" 
                                className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                                value={filter.minElo || ''}
                                onChange={e => handleChange('minElo', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Elo Max</label>
                            <input 
                                type="number" 
                                className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                                value={filter.maxElo || ''}
                                onChange={e => handleChange('maxElo', e.target.value ? parseInt(e.target.value) : undefined)}
                                placeholder="3000"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Event / Tournament</label>
                        <input 
                            type="text" 
                            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                            value={filter.event || ''}
                            onChange={e => handleChange('event', e.target.value)}
                            placeholder="Event name..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Result</label>
                            <select 
                                className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                                value={filter.result || ''}
                                onChange={e => handleChange('result', e.target.value || undefined)}
                            >
                                <option value="">Any</option>
                                <option value="1-0">1-0 (White Win)</option>
                                <option value="0-1">0-1 (Black Win)</option>
                                <option value="1/2-1/2">1/2-1/2 (Draw)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Year (Start)</label>
                            <input 
                                type="text" 
                                className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                                value={filter.dateStart || ''}
                                onChange={e => handleChange('dateStart', e.target.value)}
                                placeholder="YYYY"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">ECO Code</label>
                        <input 
                            type="text" 
                            className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                            value={filter.eco || ''}
                            onChange={e => handleChange('eco', e.target.value)}
                            placeholder="e.g., B12, C00"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Material Section */}
                    <div>
                        <h4 className="text-sm font-bold mb-2 flex items-center space-x-2">
                            <span>Material Count</span>
                            <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1 rounded">Any Position</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-6 p-4 border border-border rounded-lg bg-muted/5">
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-muted-foreground uppercase mb-1">White</div>
                                {['p', 'n', 'b', 'r', 'q'].map(role => (
                                    <div key={role} className="flex items-center justify-between">
                                        <span className="text-sm font-medium w-6 uppercase">{role}</span>
                                        <input 
                                            type="number" 
                                            min="0" max="9"
                                            className="w-16 bg-input border border-border rounded px-2 py-1 text-sm text-center"
                                            value={filter.material?.white?.[role] ?? ''}
                                            onChange={e => handleMaterialChange('white', role, e.target.value)}
                                            placeholder="-"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Black</div>
                                {['p', 'n', 'b', 'r', 'q'].map(role => (
                                    <div key={role} className="flex items-center justify-between">
                                        <span className="text-sm font-medium w-6 uppercase">{role}</span>
                                        <input 
                                            type="number" 
                                            min="0" max="9"
                                            className="w-16 bg-input border border-border rounded px-2 py-1 text-sm text-center"
                                            value={filter.material?.black?.[role] ?? ''}
                                            onChange={e => handleMaterialChange('black', role, e.target.value)}
                                            placeholder="-"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Position Section */}
                    <div>
                        <h4 className="text-sm font-bold mb-2 flex items-center space-x-2">
                            <span>Positional Constraints</span>
                            <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1 rounded">Any Position</span>
                        </h4>
                        <div className="p-4 border border-border rounded-lg bg-muted/5 space-y-3">
                            <div className="flex space-x-2">
                                <input 
                                    type="text" 
                                    className="flex-1 bg-input border border-border rounded px-2 py-1.5 text-sm"
                                    placeholder="e.g. e4"
                                    value={positionConstraint.sq}
                                    onChange={e => setPositionConstraint(prev => ({ ...prev, sq: e.target.value }))}
                                />
                                <select 
                                    className="w-32 bg-input border border-border rounded px-2 py-1.5 text-sm"
                                    value={positionConstraint.piece}
                                    onChange={e => setPositionConstraint(prev => ({ ...prev, piece: e.target.value }))}
                                >
                                    <option value="wP">White Pawn</option>
                                    <option value="wN">White Knight</option>
                                    <option value="wB">White Bishop</option>
                                    <option value="wR">White Rook</option>
                                    <option value="wQ">White Queen</option>
                                    <option value="wK">White King</option>
                                    <option value="bP">Black Pawn</option>
                                    <option value="bN">Black Knight</option>
                                    <option value="bB">Black Bishop</option>
                                    <option value="bR">Black Rook</option>
                                    <option value="bQ">Black Queen</option>
                                    <option value="bK">Black King</option>
                                </select>
                                <button 
                                    type="button"
                                    onClick={addPositionConstraint}
                                    className="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div className="space-y-1">
                                {Object.entries(filter.position || {}).map(([sq, piece]) => (
                                    <div key={sq} className="flex items-center justify-between p-2 bg-background border border-border rounded text-sm">
                                        <div className="flex space-x-4">
                                            <span className="font-bold font-mono">{sq}</span>
                                            <span className="text-muted-foreground">must be</span>
                                            <span className="font-medium">{piece}</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removePositionConstraint(sq)}
                                            className="text-destructive hover:bg-destructive/10 p-1 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {Object.keys(filter.position || {}).length === 0 && (
                                    <div className="text-xs text-center text-muted-foreground py-2 italic">
                                        No positional constraints added.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-border flex justify-end space-x-2 bg-muted/10">
            <button 
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
                Clear Filter
            </button>
            <button 
                onClick={handleSubmit}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center space-x-2"
            >
                <Search size={16} />
                <span>Search</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchModal;