export interface EngineInfo {
  depth: number;
  seldepth: number;
  multipv: number;
  score: {
    unit: 'cp' | 'mate';
    value: number;
  };
  nodes: number;
  nps: number;
  time: number;
  pv: string[];
}

export interface EngineBestMove {
  bestmove: string;
  ponder?: string;
}

export function parseUciInfo(line: string): EngineInfo | null {
  if (!line.startsWith('info')) return null;

  const result: any = { score: {} };
  const parts = line.split(' ');

  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    const value = parts[i + 1];

    switch (key) {
      case 'depth':
        result.depth = parseInt(value, 10);
        break;
      case 'seldepth':
        result.seldepth = parseInt(value, 10);
        break;
      case 'multipv':
        result.multipv = parseInt(value, 10);
        break;
      case 'score':
        result.score.unit = value; // cp or mate
        result.score.value = parseInt(parts[i + 2], 10); // value is the next token
        i++; // skip unit
        break;
      case 'nodes':
        result.nodes = parseInt(value, 10);
        break;
      case 'nps':
        result.nps = parseInt(value, 10);
        break;
      case 'time':
        result.time = parseInt(value, 10);
        break;
      case 'pv':
        result.pv = parts.slice(i + 1);
        return result as EngineInfo; // PV is usually the last part
    }
  }

  return result as EngineInfo;
}

export function parseBestMove(line: string): EngineBestMove | null {
  if (!line.startsWith('bestmove')) return null;
  const parts = line.split(' ');
  return {
    bestmove: parts[1],
    ponder: parts[3]
  };
}
