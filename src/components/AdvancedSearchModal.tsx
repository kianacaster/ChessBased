import React, { useState } from 'react';
import type { GameFilter } from '../types/app';
import { X, Search } from 'lucide-react';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filter: GameFilter) => void;
  currentFilter: GameFilter;
}

const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({ isOpen, onClose, onSearch, currentFilter }) => {
  const [filter, setFilter] = useState<GameFilter>(currentFilter);

  if (!isOpen) return null;

  const handleChange = (key: keyof GameFilter, value: string | number | undefined) => {
      setFilter(prev => ({ ...prev, [key]: value }));
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
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Advanced Search</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex justify-end space-x-2 pt-2">
                <button 
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                    Clear Filter
                </button>
                <button 
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center space-x-2"
                >
                    <Search size={16} />
                    <span>Search</span>
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AdvancedSearchModal;