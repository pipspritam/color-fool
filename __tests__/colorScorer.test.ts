import {
  calculateDeltaE,
  scoreFromDeltaE,
  hslToRgb,
  hslToLab,
  hslToString,
  getScoreRating,
  HSLColor,
} from '../src/utils/colorScorer';

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
});
