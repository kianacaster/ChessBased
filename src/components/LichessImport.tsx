import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { LichessGameFilter } from '../global';

interface LichessImportProps {
  onImport: (pgn: string) => void;
}

const LichessImport: React.FC<LichessImportProps> = ({ onImport }) => {
  const [username, setUsername] = useState('');
  const [maxGames, setMaxGames] = useState(10);
  const [rated, setRated] = useState(true);
  const [perfType, setPerfType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!username) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: LichessGameFilter = {
        max: maxGames,
        rated: rated,
        perfType: perfType || undefined,
        tags: true,
        clocks: false,
        evals: false,
        opening: true
      };

      const pgn = await window.electronAPI.fetchLichessGames(username, filters);
      onImport(pgn);
    } catch (err) {
      console.error(err);
      setError('Failed to import games. Please check the username and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-300">
      <div className="w-full max-w-md bg-[#262421] p-8 rounded-lg shadow-lg border border-[#3e3c39]">
        <div className="flex items-center space-x-3 mb-6">
          <Download className="w-8 h-8 text-blue-500" />
          <h2 className="text-2xl font-bold">Import from Lichess</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              className="w-full bg-[#302e2c] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="e.g. MagnusCarlsen"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Max Games</label>
              <input
                type="number"
                className="w-full bg-[#302e2c] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                value={maxGames}
                onChange={(e) => setMaxGames(parseInt(e.target.value))}
                min={1}
                max={100}
              />
            </div>
             <div>
              <label className="block text-sm font-medium mb-1">Perf Type</label>
              <select
                className="w-full bg-[#302e2c] border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                value={perfType}
                onChange={(e) => setPerfType(e.target.value)}
              >
                <option value="">All</option>
                <option value="bullet">Bullet</option>
                <option value="blitz">Blitz</option>
                <option value="rapid">Rapid</option>
                <option value="classical">Classical</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="rated"
              className="w-4 h-4 rounded bg-[#302e2c] border-gray-600 text-blue-500 focus:ring-blue-500"
              checked={rated}
              onChange={(e) => setRated(e.target.checked)}
            />
            <label htmlFor="rated" className="text-sm font-medium">Rated games only</label>
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Import Games</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LichessImport;
