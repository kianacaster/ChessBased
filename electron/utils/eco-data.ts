// ECO Classification Data
// Based on standard opening lines

interface EcoNode {
  code: string;
  name: string;
}

const ECO_DATA: Record<string, EcoNode> = {
  // A00-A09: Irregular Openings
  'e4': { code: 'B00', name: 'King\'s Pawn' }, // Default fallback
  'd4': { code: 'A40', name: 'Queen\'s Pawn' }, // Default fallback
  'c4': { code: 'A10', name: 'English' },
  'Nf3': { code: 'A04', name: 'Réti' },
  'f4': { code: 'A02', name: 'Bird' },
  'b3': { code: 'A01', name: 'Nimzowitsch-Larsen' },
  'b4': { code: 'A00', name: 'Sokolsky' },
  'g3': { code: 'A00', name: 'Benko' },

  // B: Semi-Open Games
  'e4 c5': { code: 'B20', name: 'Sicilian' },
  'e4 c6': { code: 'B10', name: 'Caro-Kann' },
  'e4 e6': { code: 'C00', name: 'French' },
  'e4 d6': { code: 'B07', name: 'Pirc' },
  'e4 g6': { code: 'B06', name: 'Modern' },
  'e4 Nf6': { code: 'B02', name: 'Alekhine' },
  'e4 d5': { code: 'B01', name: 'Scandinavian' },

  // C: Open Games
  'e4 e5': { code: 'C20', name: 'Open Game' },
  'e4 e5 Nf3 Nc6': { code: 'C44', name: 'King\'s Knight' },
  'e4 e5 Nf3 Nc6 Bb5': { code: 'C60', name: 'Ruy Lopez' },
  'e4 e5 Nf3 Nc6 Bb5 a6': { code: 'C70', name: 'Ruy Lopez' },
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4': { code: 'C70', name: 'Ruy Lopez' },
  'e4 e5 Nf3 Nc6 Bc4': { code: 'C50', name: 'Italian Game' },
  'e4 e5 Nf3 Nc6 Bc4 Bc5': { code: 'C50', name: 'Giuoco Piano' },
  'e4 e5 Nf3 Nc6 Bc4 Nf6': { code: 'C55', name: 'Two Knights' },
  'e4 e5 Nf3 Nf6': { code: 'C42', name: 'Petroff' },
  'e4 e5 f4': { code: 'C30', name: 'King\'s Gambit' },
  'e4 e5 Nc3': { code: 'C25', name: 'Vienna' },

  // D: Closed Games
  'd4 d5': { code: 'D00', name: 'Queen\'s Pawn' },
  'd4 d5 c4': { code: 'D06', name: 'Queen\'s Gambit' },
  'd4 d5 c4 c6': { code: 'D10', name: 'Slav' },
  'd4 d5 c4 e6': { code: 'D30', name: 'Queen\'s Gambit Declined' },
  'd4 Nf6 c4 g6 Nc3 Bg7': { code: 'E60', name: 'King\'s Indian' },
  'd4 Nf6 c4 g6 Nc3 d5': { code: 'D80', name: 'Grunfeld' },
  'd4 Nf6 c4 e6 Nc3 Bb4': { code: 'E20', name: 'Nimzo-Indian' },
  'd4 Nf6 c4 e6 Nf3 b6': { code: 'E12', name: 'Queen\'s Indian' },
  'd4 Nf6 c4 e6 g3': { code: 'E00', name: 'Catalan' },
  'd4 f5': { code: 'A80', name: 'Dutch' }
};

// More specific overrides
const SPECIFIC_ECO: Record<string, string> = {
    // Ruy Lopez branches
    'e4 e5 Nf3 Nc6 Bb5': 'C60',
    'e4 e5 Nf3 Nc6 Bb5 a6': 'C70',
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4': 'C70',
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6': 'C70',
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O': 'C70', // Main line
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7': 'C84', // Closed
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1': 'C88',
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3': 'C88',
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6': 'C90',
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3': 'C92', // Chigorin etc
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4': 'C80', // Open
    'e4 e5 Nf3 Nc6 Bb5 f5': 'C63', // Schliemann
    'e4 e5 Nf3 Nc6 Bb5 Nf6': 'C65', // Berlin
    'e4 e5 Nf3 Nc6 Bb5 Nd4': 'C61', // Bird
    'e4 e5 Nf3 Nc6 Bb5 d6': 'C62', // Steinitz

    // Sicilian branches
    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': 'B90', // Najdorf
    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5': 'B94',
    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6': 'B70', // Dragon
    'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5': 'B33', // Sveshnikov
    'e4 c5 Nc3': 'B23', // Closed
    'e4 c5 c3': 'B22', // Alapin

    // French
    'e4 e6 d4 d5 Nc3': 'C10',
    'e4 e6 d4 d5 Nc3 Bb4': 'C15', // Winawer
    'e4 e6 d4 d5 Nc3 Nf6': 'C11', // Classical
    'e4 e6 d4 d5 Nd2': 'C03', // Tarrasch
    'e4 e6 d4 d5 e5': 'C02', // Advance

    // Caro-Kann
    'e4 c6 d4 d5 Nc3': 'B18',
    'e4 c6 d4 d5 e5': 'B12', // Advance
    'e4 c6 d4 d5 exd5': 'B13', // Exchange

    // Italian
    'e4 e5 Nf3 Nc6 Bc4 Bc5 c3': 'C53',
    'e4 e5 Nf3 Nc6 Bc4 Bc5 b4': 'C51', // Evans Gambit
};

export function getEco(moves: string[]): string | undefined {
  if (moves.length === 0) return 'A00';

  // We construct a move string up to a certain depth to check
  // Checking exact string matches is fast but brittle if we don't have all.
  // We check deepest first.
  
  const MAX_DEPTH = 12; // Check up to 12 plies (6 moves)
  const currentMoves = moves.slice(0, MAX_DEPTH);
  
  // Try to find the longest matching prefix
  for (let i = currentMoves.length; i > 0; i--) {
      const seq = currentMoves.slice(0, i).join(' ');
      
      // Check specific overrides first
      if (SPECIFIC_ECO[seq]) {
          return SPECIFIC_ECO[seq];
      }
      
      // Check general categories
      if (ECO_DATA[seq]) {
          return ECO_DATA[seq].code;
      }
  }
  
  return undefined; // No ECO found
}