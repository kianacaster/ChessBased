import React, { useState } from 'react';
import { Download, Loader2, Database } from 'lucide-react';
import type { LichessGameFilter } from '../types/app';

interface LichessImportProps {
  onImport: (pgn: string) => void;
}

const LichessImport: React.FC<LichessImportProps> = ({ }) => {
  const [username, setUsername] = useState('');
  const [maxGames, setMaxGames] = useState(10);
  const [rated, setRated] = useState(true);
  const [perfType, setPerfType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!username) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

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

      if (window.electronAPI) {
          // Start background download
          await window.electronAPI.lichessDownloadBackground(username, filters);
          setSuccessMsg(`Download started for ${username}. Check the Databases tab.`);
      } else {
          // Fallback for web (if applicable, but this is Electron app)
          setError("Electron API not available");
      }
    } catch (err) {
      console.error(err);
      setError('Failed to start download. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-foreground bg-background p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-lg border border-border">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Download from Lichess</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Username</label>
            <input
              type="text"
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50 transition-shadow"
              placeholder="e.g. MagnusCarlsen"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Max Games</label>
              <input
                type="number"
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                value={maxGames}
                onChange={(e) => setMaxGames(parseInt(e.target.value))}
                min={1}
                max={1000} // Increased max for DB download
              />
            </div>
             <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Perf Type</label>
              <select
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none"
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

          <div className="flex items-center space-x-2.5">
            <input
              type="checkbox"
              id="rated"
              className="w-4 h-4 rounded bg-input border-border text-primary focus:ring-primary focus:ring-offset-background"
              checked={rated}
              onChange={(e) => setRated(e.target.checked)}
            />
            <label htmlFor="rated" className="text-sm font-medium text-foreground select-none cursor-pointer">Rated games only</label>
          </div>

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="text-green-500 text-sm bg-green-500/10 p-3 rounded-md border border-green-500/20">
              {successMsg}
            </div>
          )}

          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 mt-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Starting Download...</span>
              </>
            ) : (
              <>
                 <Database className="w-5 h-5" />
                 <span>Download to Database</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LichessImport;
