// A simplified ECO lookup for demonstration purposes.
// In a real application, this would be a more comprehensive data structure.

export function getEco(moves: string[]): string | undefined {
  const moveStr = moves.join(' ');

  if (moveStr.startsWith('e4 c5')) return 'B (Sicilian)';
  if (moveStr.startsWith('e4 e5')) return 'C (Open Game)';
  if (moveStr.startsWith('d4 d5')) return 'D (Closed Game)';
  if (moveStr.startsWith('d4 Nf6 2.c4 g6 3.Nc3 Bg7')) return 'E (King\'s Indian)';
  if (moveStr.startsWith('e4 e6')) return 'C (French)';
  if (moveStr.startsWith('d4 Nf6 2.c4 e6 3.Nc3 Bb4')) return 'E (Nimzo-Indian)';
  if (moveStr.startsWith('e4 c6')) return 'B (Caro-Kann)';
  if (moveStr.startsWith('Nf3')) return 'A (Reti/Réti)'; // Modern openings often start with Nf3
  if (moveStr.startsWith('c4')) return 'A (English)';
  
  return undefined; // No ECO found
}
