export type DatabaseCategory = 'players' | 'masters' | 'engines';

export interface PublicDatabaseMetadata {
  id: string;
  name: string;
  description: string;
  url: string;
  size: string; // Display string e.g. "15 MB"
  source: string;
  credit: string;
  category: DatabaseCategory;
}

export const PUBLIC_DATABASES: PublicDatabaseMetadata[] = [
  // --- Modern Super GMs ---
  {
    id: 'carlsen',
    name: 'Magnus Carlsen',
    description: 'Complete available games of the GOAT candidate.',
    url: 'https://www.pgnmentor.com/players/Carlsen.zip',
    size: '~4 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'nakamura',
    name: 'Hikaru Nakamura',
    description: 'Games of the streaming giant and Super GM.',
    url: 'https://www.pgnmentor.com/players/Nakamura.zip',
    size: '~4 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'caruana',
    name: 'Fabiano Caruana',
    description: 'Games of the 2018 Challenger and US Champion.',
    url: 'https://www.pgnmentor.com/players/Caruana.zip',
    size: '~3 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'ding',
    name: 'Ding Liren',
    description: 'Games of the World Champion.',
    url: 'https://www.pgnmentor.com/players/Ding.zip',
    size: '~2 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'firouzja',
    name: 'Alireza Firouzja',
    description: 'Games of the creative tactical genius.',
    url: 'https://www.pgnmentor.com/players/Firouzja.zip',
    size: '~1 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'nepomniachtchi',
    name: 'Ian Nepomniachtchi',
    description: 'Two-time World Championship Challenger.',
    url: 'https://www.pgnmentor.com/players/Nepomniachtchi.zip',
    size: '~2.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'aronian',
    name: 'Levon Aronian',
    description: 'Creative masterpieces from the Armenian-American star.',
    url: 'https://www.pgnmentor.com/players/Aronian.zip',
    size: '~3 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'so',
    name: 'Wesley So',
    description: 'Solid and precise games from the US Super GM.',
    url: 'https://www.pgnmentor.com/players/So.zip',
    size: '~2.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'mvl',
    name: 'Maxime Vachier-Lagrave',
    description: 'The master of the Sicilian Najdorf.',
    url: 'https://www.pgnmentor.com/players/VachierLagrave.zip',
    size: '~2.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'giri',
    name: 'Anish Giri',
    description: 'Theoretical preparation and solid play.',
    url: 'https://www.pgnmentor.com/players/Giri.zip',
    size: '~2 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'mamedyarov',
    name: 'Shakhriyar Mamedyarov',
    description: 'Aggressive and creative play style.',
    url: 'https://www.pgnmentor.com/players/Mamedyarov.zip',
    size: '~2.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'grischuk',
    name: 'Alexander Grischuk',
    description: 'Three-time World Blitz Champion.',
    url: 'https://www.pgnmentor.com/players/Grischuk.zip',
    size: '~2.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'ivanchuk',
    name: 'Vasyl Ivanchuk',
    description: 'A creative genius and rapid world champion.',
    url: 'https://www.pgnmentor.com/players/Ivanchuk.zip',
    size: '~3.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'anand',
    name: 'Viswanathan Anand',
    description: 'The Tiger of Madras, 5-time World Champion.',
    url: 'https://www.pgnmentor.com/players/Anand.zip',
    size: '~4 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'kramnik',
    name: 'Vladimir Kramnik',
    description: 'The man who dethroned Kasparov.',
    url: 'https://www.pgnmentor.com/players/Kramnik.zip',
    size: '~3.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'topalov',
    name: 'Veselin Topalov',
    description: 'Aggressive attacking chess from the former World Champion.',
    url: 'https://www.pgnmentor.com/players/Topalov.zip',
    size: '~2.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'polgar',
    name: 'Judit Polgar',
    description: 'The strongest female player of all time.',
    url: 'https://www.pgnmentor.com/players/PolgarJ.zip',
    size: '~1.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },

  // --- Historical Legends ---
  {
    id: 'kasparov',
    name: 'Garry Kasparov',
    description: 'Games of the dominant 13th World Champion.',
    url: 'https://www.pgnmentor.com/players/Kasparov.zip',
    size: '~2.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'fischer',
    name: 'Bobby Fischer',
    description: 'Precision and clarity from the 11th World Champion.',
    url: 'https://www.pgnmentor.com/players/Fischer.zip',
    size: '~1 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'karpov',
    name: 'Anatoly Karpov',
    description: 'Positional boa constrictor, 12th World Champion.',
    url: 'https://www.pgnmentor.com/players/Karpov.zip',
    size: '~3.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'tal',
    name: 'Mikhail Tal',
    description: 'The Magician from Riga - Tactical masterpieces.',
    url: 'https://www.pgnmentor.com/players/Tal.zip',
    size: '~1.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'botvinnik',
    name: 'Mikhail Botvinnik',
    description: 'The Patriarch of the Soviet Chess School.',
    url: 'https://www.pgnmentor.com/players/Botvinnik.zip',
    size: '~1 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'petrosian',
    name: 'Tigran Petrosian',
    description: 'Iron Tigran - The master of prophylaxis.',
    url: 'https://www.pgnmentor.com/players/Petrosian.zip',
    size: '~1.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'spassky',
    name: 'Boris Spassky',
    description: 'Universal style of the 10th World Champion.',
    url: 'https://www.pgnmentor.com/players/Spassky.zip',
    size: '~2 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'smyslov',
    name: 'Vasily Smyslov',
    description: 'Harmony and endgame virtue.',
    url: 'https://www.pgnmentor.com/players/Smyslov.zip',
    size: '~2 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'alekhine',
    name: 'Alexander Alekhine',
    description: 'Complex combinations and attacking genius.',
    url: 'https://www.pgnmentor.com/players/Alekhine.zip',
    size: '~1.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'capablanca',
    name: 'Jose Raul Capablanca',
    description: 'The Chess Machine - intuitive positional play.',
    url: 'https://www.pgnmentor.com/players/Capablanca.zip',
    size: '~0.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'lasker',
    name: 'Emanuel Lasker',
    description: 'Psychological play from the longest reigning champion.',
    url: 'https://www.pgnmentor.com/players/Lasker.zip',
    size: '~0.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },
  {
    id: 'morphy',
    name: 'Paul Morphy',
    description: 'The Pride and Sorrow of Chess - Open games genius.',
    url: 'https://www.pgnmentor.com/players/Morphy.zip',
    size: '~0.2 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'players'
  },

  // --- Masters / Events ---
  {
    id: 'candidates_2024',
    name: 'Candidates 2024',
    description: 'FIDE Candidates Tournament 2024 (Gukesh winner).',
    url: 'https://www.pgnmentor.com/events/Candidates2024.pgn',
    size: '< 1 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'masters'
  },
  {
    id: 'world_cup_2023',
    name: 'FIDE World Cup 2023',
    description: 'Knockout tournament in Baku.',
    url: 'https://www.pgnmentor.com/events/WorldCup2023.pgn',
    size: '~1.5 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'masters'
  },
  {
    id: 'candidates_2022',
    name: 'Candidates 2022',
    description: 'FIDE Candidates Tournament 2022.',
    url: 'https://www.pgnmentor.com/events/Candidates2022.pgn',
    size: '< 1 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'masters'
  },
  {
    id: 'candidates_2020',
    name: 'Candidates 2020/2021',
    description: 'The interrupted Candidates Tournament.',
    url: 'https://www.pgnmentor.com/events/Candidates2020.pgn',
    size: '< 1 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'masters'
  },
  {
    id: 'tata_steel_2024',
    name: 'Tata Steel 2024',
    description: 'Wijk aan Zee 2024 (Wei Yi winner).',
    url: 'https://www.pgnmentor.com/events/WijkaanZee2024.pgn',
    size: '< 1 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'masters'
  },
  {
    id: 'olympiad_2018',
    name: 'Olympiad 2018 (Batumi)',
    description: '43rd Chess Olympiad.',
    url: 'https://www.pgnmentor.com/events/Olympiad2018.pgn',
    size: '~8 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'masters'
  },
  {
    id: 'olympiad_2016',
    name: 'Olympiad 2016 (Baku)',
    description: '42nd Chess Olympiad.',
    url: 'https://www.pgnmentor.com/events/Olympiad2016.pgn',
    size: '~8 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'masters'
  },
  {
    id: 'lichess_elite_2024_01',
    name: 'Lichess Elite (Jan 2024)',
    description: 'Curated 2400+ games. Excellent source for "Master" level play.',
    url: 'https://database.nikonoel.fr/lichess_elite_2024-01.zip',
    size: '~71 MB',
    source: 'Nikonoel / Lichess',
    credit: 'database.nikonoel.fr',
    category: 'masters'
  },
  {
    id: 'lichess_elite_2023_01',
    name: 'Lichess Elite (Jan 2023)',
    description: 'Curated 2400+ games from Jan 2023.',
    url: 'https://database.nikonoel.fr/lichess_elite_2023-01.zip',
    size: '~85 MB',
    source: 'Nikonoel / Lichess',
    credit: 'database.nikonoel.fr',
    category: 'masters'
  },
  {
    id: 'lichess_elite_2022_01',
    name: 'Lichess Elite (Jan 2022)',
    description: 'Curated 2400+ games from Jan 2022.',
    url: 'https://database.nikonoel.fr/lichess_elite_2022-01.zip',
    size: '~125 MB',
    source: 'Nikonoel / Lichess',
    credit: 'database.nikonoel.fr',
    category: 'masters'
  },
  {
    id: 'lichess_elite_2021_01',
    name: 'Lichess Elite (Jan 2021)',
    description: 'Curated 2400+ games from Jan 2021.',
    url: 'https://database.nikonoel.fr/lichess_elite_2021-01.zip',
    size: '~149 MB',
    source: 'Nikonoel / Lichess',
    credit: 'database.nikonoel.fr',
    category: 'masters'
  },

  // --- Engines ---
  {
    id: 'tcec_s25_superfinal',
    name: 'TCEC Season 25 Superfinal',
    description: 'Stockfish vs Leela Chess Zero (LCZero) - 100 Game Match.',
    url: 'https://tcec-chess.com/archive/Season_25/Superfinal/TCEC_S25_Superfinal.pgn',
    size: '~10 MB',
    source: 'TCEC',
    credit: 'tcec-chess.com',
    category: 'engines'
  },
  {
    id: 'tcec_s24_superfinal',
    name: 'TCEC Season 24 Superfinal',
    description: 'Stockfish vs Leela Chess Zero (LCZero).',
    url: 'https://tcec-chess.com/archive/Season_24/Superfinal/TCEC_S24_Superfinal.pgn',
    size: '~10 MB',
    source: 'TCEC',
    credit: 'tcec-chess.com',
    category: 'engines'
  },
  {
    id: 'tcec_s23_superfinal',
    name: 'TCEC Season 23 Superfinal',
    description: 'Stockfish vs Leela Chess Zero.',
    url: 'https://tcec-chess.com/archive/Season_23/Superfinal/TCEC_S23_Superfinal.pgn',
    size: '~10 MB',
    source: 'TCEC',
    credit: 'tcec-chess.com',
    category: 'engines'
  },
  {
    id: 'tcec_s22_superfinal',
    name: 'TCEC Season 22 Superfinal',
    description: 'Stockfish vs Komodo Dragon.',
    url: 'https://tcec-chess.com/archive/Season_22/Superfinal/TCEC_S22_Superfinal.pgn',
    size: '~10 MB',
    source: 'TCEC',
    credit: 'tcec-chess.com',
    category: 'engines'
  },
  {
    id: 'alphazero_vs_stockfish',
    name: 'AlphaZero vs Stockfish',
    description: 'The historic match from DeepMind\'s paper.',
    url: 'https://www.pgnmentor.com/players/Computer.zip',
    size: '~2 MB',
    source: 'PGN Mentor',
    credit: 'pgnmentor.com',
    category: 'engines'
  }
];