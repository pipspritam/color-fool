import {
  calculateDeltaE,
  scoreFromDeltaE,
  hslToRgb,
  hslToLab,
  hslToString,
  getScoreRating,
  HSLColor,
} from '../src/utils/colorScorer';
import {
  resolvePaletteForRound,
  generateRandomTarget,
  DIFFICULTY_CONFIG,
  CustomGameConfig,
} from '../src/hooks/useColorState';
import {
  sortPlayersDeterministic,
  PlayerScoreItem,
} from '../src/utils/playerSort';

describe('colorScorer Unit Tests', () => {
  describe('Boundary Condition: Pure Black (L = 0)', () => {
    it('converts L = 0 to pure black RGB (0, 0, 0) regardless of hue or saturation', () => {
      const black1: HSLColor = { h: 0, s: 100, l: 0 };
      const black2: HSLColor = { h: 180, s: 50, l: 0 };
      const black3: HSLColor = { h: 270, s: 0, l: 0 };

      expect(hslToRgb(black1)).toEqual({ r: 0, g: 0, b: 0 });
      expect(hslToRgb(black2)).toEqual({ r: 0, g: 0, b: 0 });
      expect(hslToRgb(black3)).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('calculates Delta E = 0 between two black colors with different hues', () => {
      const blackA: HSLColor = { h: 15, s: 80, l: 0 };
      const blackB: HSLColor = { h: 220, s: 30, l: 0 };

      const deltaE = calculateDeltaE(blackA, blackB);
      expect(deltaE).toBe(0);
      expect(scoreFromDeltaE(deltaE)).toBe(10);
    });

    it('calculates expected Lab coordinates for black (L* = 0, a* = 0, b* = 0)', () => {
      const lab = hslToLab({ h: 120, s: 100, l: 0 });
      expect(lab.L).toBeCloseTo(0, 1);
      expect(lab.a).toBeCloseTo(0, 1);
      expect(lab.b).toBeCloseTo(0, 1);
    });
  });

  describe('Boundary Condition: Pure White (L = 100)', () => {
    it('converts L = 100 to pure white RGB (255, 255, 255) regardless of hue or saturation', () => {
      const white1: HSLColor = { h: 0, s: 100, l: 100 };
      const white2: HSLColor = { h: 200, s: 60, l: 100 };

      expect(hslToRgb(white1)).toEqual({ r: 255, g: 255, b: 255 });
      expect(hslToRgb(white2)).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('calculates Delta E = 0 between two white colors with different hues', () => {
      const whiteA: HSLColor = { h: 45, s: 90, l: 100 };
      const whiteB: HSLColor = { h: 310, s: 10, l: 100 };

      const deltaE = calculateDeltaE(whiteA, whiteB);
      expect(deltaE).toBe(0);
      expect(scoreFromDeltaE(deltaE)).toBe(10);
    });

    it('calculates expected Lab coordinates for white (L* = 100, a* = 0, b* = 0)', () => {
      const lab = hslToLab({ h: 60, s: 100, l: 100 });
      expect(lab.L).toBeCloseTo(100, 1);
      expect(lab.a).toBeCloseTo(0, 1);
      expect(lab.b).toBeCloseTo(0, 1);
    });
  });

  describe('Boundary Condition: Achromatic Grayscale (S = 0)', () => {
    it('converts S = 0 to neutral grayscale (r === g === b) across lightness levels', () => {
      const gray50: HSLColor = { h: 120, s: 0, l: 50 };
      const gray25: HSLColor = { h: 240, s: 0, l: 25 };
      const gray75: HSLColor = { h: 0, s: 0, l: 75 };

      const rgb50 = hslToRgb(gray50);
      expect(rgb50.r).toBe(rgb50.g);
      expect(rgb50.g).toBe(rgb50.b);
      expect(rgb50.r).toBe(128);

      const rgb25 = hslToRgb(gray25);
      expect(rgb25.r).toBe(rgb25.g);
      expect(rgb25.g).toBe(rgb25.b);
      expect(rgb25.r).toBe(64);

      const rgb75 = hslToRgb(gray75);
      expect(rgb75.r).toBe(rgb75.g);
      expect(rgb75.g).toBe(rgb75.b);
      expect(rgb75.r).toBe(191);
    });

    it('calculates Delta E = 0 for identical grays regardless of hue angle', () => {
      const grayA: HSLColor = { h: 0, s: 0, l: 50 };
      const grayB: HSLColor = { h: 270, s: 0, l: 50 };

      const deltaE = calculateDeltaE(grayA, grayB);
      expect(deltaE).toBe(0);
      expect(scoreFromDeltaE(deltaE)).toBe(10);
    });
  });

  describe('Boundary Condition: Circular Hue Wraparound (0° ↔ 360°)', () => {
    it('treats 0° and 360° as identical RGB colors', () => {
      const red0: HSLColor = { h: 0, s: 100, l: 50 };
      const red360: HSLColor = { h: 360, s: 100, l: 50 };

      expect(hslToRgb(red0)).toEqual(hslToRgb(red360));
      expect(hslToRgb(red0)).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('calculates Delta E = 0 between 0° and 360°', () => {
      const red0: HSLColor = { h: 0, s: 100, l: 50 };
      const red360: HSLColor = { h: 360, s: 100, l: 50 };

      const deltaE = calculateDeltaE(red0, red360);
      expect(deltaE).toBe(0);
      expect(scoreFromDeltaE(deltaE)).toBe(10);
    });

    it('handles negative or multiple-rotation hues gracefully with modulo', () => {
      const normal: HSLColor = { h: 120, s: 80, l: 40 };
      const multiWrapped: HSLColor = { h: 120 + 720, s: 80, l: 40 };

      expect(calculateDeltaE(normal, multiWrapped)).toBe(0);
    });
  });

  describe('Score Mapping & Rating Verification', () => {
    it('maps Delta E <= 2.5 to high score (imperceptible difference)', () => {
      expect(scoreFromDeltaE(0.0)).toBe(10);
      expect(scoreFromDeltaE(1.2)).toBe(9.76);
      expect(scoreFromDeltaE(2.5)).toBe(9.5);
      expect(getScoreRating(10)).toBe('Perfection! (Imperceptible)');
      expect(getScoreRating(9.5)).toBe('Perfection! (Imperceptible)');
    });

    it('maps Delta E tiers continuously with 2 decimal places precision', () => {
      expect(scoreFromDeltaE(3.5)).toBe(9.3);
      expect(scoreFromDeltaE(5.0)).toBe(9);
      expect(scoreFromDeltaE(7.2)).toBe(8.56);
      expect(scoreFromDeltaE(10.0)).toBe(8);
      expect(scoreFromDeltaE(15.0)).toBe(6.75);
      expect(scoreFromDeltaE(18.0)).toBe(6);
      expect(scoreFromDeltaE(25.0)).toBe(4.6);
      expect(scoreFromDeltaE(28.0)).toBe(4);
      expect(scoreFromDeltaE(35.0)).toBe(2.83);
      expect(scoreFromDeltaE(40.0)).toBe(2);
      expect(scoreFromDeltaE(45.0)).toBe(1);
    });

    it('clamps scores to 0 for large Delta E (no negative points)', () => {
      expect(scoreFromDeltaE(50.0)).toBe(0);
      expect(scoreFromDeltaE(100.0)).toBe(0);
      expect(scoreFromDeltaE(200.0)).toBe(0);
      expect(getScoreRating(0)).toBe('Way Off');
    });

    it('formats hslToString correctly with rounded values', () => {
      expect(hslToString({ h: 120.4, s: 49.6, l: 80.2 })).toBe('hsl(120, 50%, 80%)');
    });

    it('calculates Delta E with 2 decimal places precision', () => {
      const colA: HSLColor = { h: 100, s: 50, l: 50 };
      const colB: HSLColor = { h: 105, s: 55, l: 52 };
      const deltaE = calculateDeltaE(colA, colB);
      // Ensure deltaE is a number rounded to 2 decimal places
      expect(deltaE).toBe(Math.round(deltaE * 100) / 100);
      const str = deltaE.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
      expect(deltaE).toBeGreaterThan(0);
    });
  });

  describe('Custom Mode: Palette Resolution & Target Generation', () => {
    it('returns standard difficulties unchanged', () => {
      expect(resolvePaletteForRound('easy')).toBe('easy');
      expect(resolvePaletteForRound('medium')).toBe('medium');
      expect(resolvePaletteForRound('hard')).toBe('hard');
    });

    it('cycles through easy, medium, and hard when customConfig palette is "all"', () => {
      const config: CustomGameConfig = {
        previewSeconds: 3.0,
        guessSeconds: 15.0,
        rounds: 5,
        palette: 'all',
      };
      expect(resolvePaletteForRound('custom', config, 1)).toBe('easy');
      expect(resolvePaletteForRound('custom', config, 2)).toBe('medium');
      expect(resolvePaletteForRound('custom', config, 3)).toBe('hard');
      expect(resolvePaletteForRound('custom', config, 4)).toBe('easy');
      expect(resolvePaletteForRound('custom', config, 5)).toBe('medium');
    });

    it('respects fixed palette selections in custom mode', () => {
      const easyCfg: CustomGameConfig = {
        previewSeconds: 4.0,
        guessSeconds: 10.0,
        rounds: 3,
        palette: 'easy',
      };
      expect(resolvePaletteForRound('custom', easyCfg, 1)).toBe('easy');
      expect(resolvePaletteForRound('custom', easyCfg, 2)).toBe('easy');

      const hardCfg: CustomGameConfig = {
        previewSeconds: 2.0,
        guessSeconds: 8.0,
        rounds: 3,
        palette: 'hard',
      };
      expect(resolvePaletteForRound('custom', hardCfg, 1)).toBe('hard');
    });

    it('generates colors strictly conforming to palette bounds across rounds', () => {
      const config: CustomGameConfig = {
        previewSeconds: 3.0,
        guessSeconds: 15.0,
        rounds: 6,
        palette: 'all',
      };

      for (let r = 1; r <= 6; r++) {
        const expectedPalette = resolvePaletteForRound('custom', config, r);
        const cfg = DIFFICULTY_CONFIG[expectedPalette];
        const target = generateRandomTarget('custom', config, r);

        expect(target.h).toBeGreaterThanOrEqual(0);
        expect(target.h).toBeLessThan(360);
        expect(target.s).toBeGreaterThanOrEqual(cfg.sMin);
        expect(target.s).toBeLessThanOrEqual(cfg.sMax);
        expect(target.l).toBeGreaterThanOrEqual(cfg.lMin);
        expect(target.l).toBeLessThanOrEqual(cfg.lMax);
      }
    });
  });

  describe('Leaderboard & Multiplayer: Deterministic Tie-Breaking', () => {
    it('sorts higher score first', () => {
      const players: PlayerScoreItem[] = [
        { id: '1', name: 'Alpha', score: 18.5, locked: true },
        { id: '2', name: 'Beta', score: 25.0, locked: true },
      ];
      const sorted = sortPlayersDeterministic(players);
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
    });

    it('breaks ties using lower deltaE (closer perceptual match wins)', () => {
      const players: PlayerScoreItem[] = [
        { id: '1', name: 'Alpha', score: 20.0, locked: true, deltaE: 8.5 },
        { id: '2', name: 'Beta', score: 20.0, locked: true, deltaE: 4.2 },
      ];
      const sorted = sortPlayersDeterministic(players);
      expect(sorted[0].id).toBe('2'); // Beta has lower deltaE (4.2 < 8.5)
      expect(sorted[1].id).toBe('1');
    });

    it('breaks secondary ties alphabetically by player name', () => {
      const players: PlayerScoreItem[] = [
        { id: '1', name: 'Zeta', score: 20.0, locked: true, deltaE: 5.0 },
        { id: '2', name: 'Alpha', score: 20.0, locked: true, deltaE: 5.0 },
      ];
      const sorted = sortPlayersDeterministic(players);
      expect(sorted[0].name).toBe('Alpha');
      expect(sorted[1].name).toBe('Zeta');
    });
  });
});
