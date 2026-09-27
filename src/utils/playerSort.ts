export interface PlayerScoreItem {
  id: string;
  name: string;
  score: number;
  locked?: boolean;
  deltaE?: number;
  lastRoundScore?: number;
}

/**
 * Deterministically sorts players by:
 * 1. Highest total score first (descending)
 * 2. Lowest deltaE (closer perceptual match wins) if scores are equal (ascending)
 * 3. Alphabetical player name if scores and deltaE are equal (ascending)
 */
export function sortPlayersDeterministic<T extends PlayerScoreItem>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aDelta = a.deltaE !== undefined ? a.deltaE : 999;
    const bDelta = b.deltaE !== undefined ? b.deltaE : 999;
    if (aDelta !== bDelta) {
      return aDelta - bDelta;
    }
    return (a.name || '').localeCompare(b.name || '');
  });
}
