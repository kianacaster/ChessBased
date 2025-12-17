import React, { useMemo } from 'react';
import type { GameHeader } from '../types/app';

interface TournamentCrosstableProps {
  games: GameHeader[];
}

interface PlayerStats {
  name: string;
  points: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
}

const TournamentCrosstable: React.FC<TournamentCrosstableProps> = ({ games }) => {
  const { players, results, sortedPlayerNames } = useMemo(() => {
    const playerMap = new Map<string, PlayerStats>();
    const resultsMap = new Map<string, { points: number; text: string[] }>();

    // Helper to init player
    const getPlayer = (name: string) => {
      if (!playerMap.has(name)) {
        playerMap.set(name, {
          name,
          points: 0,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0
        });
      }
      return playerMap.get(name)!;
    };

    // Helper to get result key
    const getResultKey = (p1: string, p2: string) => `${p1}::${p2}`;

    games.forEach(game => {
      const whiteName = game.White;
      const blackName = game.Black;
      const result = game.Result;

      if (!whiteName || !blackName) return;

      const white = getPlayer(whiteName);
      const black = getPlayer(blackName);

      let whitePoints = 0;
      let blackPoints = 0;
      let whiteText = '';
      let blackText = '';

      if (result === '1-0') {
        whitePoints = 1;
        whiteText = '1';
        blackText = '0';
        white.wins++;
        black.losses++;
      } else if (result === '0-1') {
        blackPoints = 1;
        blackText = '1';
        whiteText = '0';
        black.wins++;
        white.losses++;
      } else if (result === '1/2-1/2') {
        whitePoints = 0.5;
        blackPoints = 0.5;
        whiteText = '½';
        blackText = '½';
        white.draws++;
        black.draws++;
      } else {
        // Unknown or *
        return;
      }

      white.points += whitePoints;
      black.points += blackPoints;
      white.gamesPlayed++;
      black.gamesPlayed++;

      // Update matrix for White vs Black
      const keyWB = getResultKey(whiteName, blackName);
      if (!resultsMap.has(keyWB)) resultsMap.set(keyWB, { points: 0, text: [] });
      const resWB = resultsMap.get(keyWB)!;
      resWB.points += whitePoints;
      resWB.text.push(whiteText);

      // Update matrix for Black vs White (mirror, but keep track of points)
      const keyBW = getResultKey(blackName, whiteName);
      if (!resultsMap.has(keyBW)) resultsMap.set(keyBW, { points: 0, text: [] });
      const resBW = resultsMap.get(keyBW)!;
      resBW.points += blackPoints;
      resBW.text.push(blackText);
    });

    const players = Array.from(playerMap.values());
    // Sort by points desc, then name asc
    players.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name);
    });

    return {
      players,
      results: resultsMap,
      sortedPlayerNames: players.map(p => p.name)
    };
  }, [games]);

  if (players.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No valid games or players found for crosstable.</div>;
  }
  
  // If too many players, it might look bad, but let's assume it's used reasonably (e.g. filtered by event)
  // For huge lists, we might want to limit or warn.
  if (players.length > 50) {
       return <div className="p-8 text-center text-muted-foreground">Too many players ({players.length}) for a crosstable. Please filter by Event.</div>;
  }

  return (
    <div className="overflow-auto p-4 bg-background">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-2 border border-border bg-muted/50 text-left min-w-[150px]">Player</th>
            <th className="p-2 border border-border bg-muted/50 w-12 text-center">Pts</th>
            <th className="p-2 border border-border bg-muted/50 w-12 text-center text-xs text-muted-foreground">G</th>
            {sortedPlayerNames.map((name, i) => (
              <th key={name} className="p-2 border border-border bg-muted/50 w-10 text-center text-xs font-normal text-muted-foreground" title={name}>
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player, i) => (
            <tr key={player.name} className="hover:bg-muted/30">
              <td className="p-2 border border-border font-medium whitespace-nowrap">
                <span className="text-muted-foreground mr-2 text-xs w-4 inline-block">{i + 1}</span>
                {player.name}
              </td>
              <td className="p-2 border border-border text-center font-bold bg-primary/5">{player.points}</td>
              <td className="p-2 border border-border text-center text-muted-foreground text-xs">{player.gamesPlayed}</td>
              {sortedPlayerNames.map((opponent, j) => {
                if (i === j) {
                  return <td key={opponent} className="p-2 border border-border bg-muted/20"></td>;
                }
                const key = `${player.name}::${opponent}`;
                const res = results.get(key);
                return (
                  <td key={opponent} className="p-2 border border-border text-center text-xs">
                    {res ? (
                      <div className="flex flex-col items-center justify-center">
                         {res.text.length <= 2 ? (
                             // If 1 or 2 games, show individual results e.g. "1" or "½ ½"
                             <span>{res.text.join(' ')}</span>
                         ) : (
                             // If many games, show score sum e.g. "2½"
                             <span title={res.text.join(' ')}>{res.points}</span>
                         )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TournamentCrosstable;
