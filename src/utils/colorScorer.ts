export interface HSLColor {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
}

export interface RGBColor {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

/**
 * Converts HSL values to sRGB [0..255]
 */
export function hslToRgb(hsl: HSLColor): RGBColor {
  const h = (((hsl.h % 360) + 360) % 360) / 360;
  const s = Math.max(0, Math.min(100, hsl.s)) / 100;
  const l = Math.max(0, Math.min(100, hsl.l)) / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let nt = t;
    if (nt < 0) nt += 1;
    if (nt > 1) nt -= 1;
    if (nt < 1 / 6) return p + (q - p) * 6 * nt;
    if (nt < 1 / 2) return q;
    if (nt < 2 / 3) return p + (q - p) * (2 / 3 - nt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/**
 * Converts sRGB [0..255] to CIELAB using D65 reference white
 * sRGB -> Linear sRGB -> CIEXYZ -> CIELAB
 */
export function rgbToLab(rgb: RGBColor): LabColor {
  // 1. sRGB linearization
  const linearize = (c: number) => {
    const v = c / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };

  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  // 2. Linear RGB to XYZ (D65 observer matrix)
  const X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const Y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1.0;
  const Z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;

  // 3. XYZ to CIELAB
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function hslToLab(hsl: HSLColor): LabColor {
  return rgbToLab(hslToRgb(hsl));
}

/**
 * Calculates Euclidean CIELAB distance (Delta E)
 * Delta E = sqrt((Delta L)^2 + (Delta a)^2 + (Delta b)^2)
 */
export function calculateDeltaE(colorA: HSLColor, colorB: HSLColor): number {
  const labA = hslToLab(colorA);
  const labB = hslToLab(colorB);

  const dL = labA.L - labB.L;
  const da = labA.a - labB.a;
  const db = labA.b - labB.b;

  const deltaE = Math.sqrt(dL * dL + da * da + db * db);
  return Math.round(deltaE * 100) / 100;
}

/**
 * Maps Delta E to a continuous 0.00 to 10.00 score with 2 decimal places precision.
 * Anchored to standard perceptual color distance thresholds:
 * Delta E = 0.0  -> 10.00 pts (perfect match)
 * Delta E = 5.0  -> 9.00 pts
 * Delta E = 10.0 -> 8.00 pts
 * Delta E = 18.0 -> 6.00 pts
 * Delta E = 28.0 -> 4.00 pts
 * Delta E = 40.0 -> 2.00 pts
 * Delta E >= 50.0 -> 0.00 pts
 */
export function scoreFromDeltaE(deltaE: number): number {
  if (deltaE <= 0) return 10.0;
  let rawScore: number;

  if (deltaE <= 10.0) {
    rawScore = 10.0 - 0.2 * deltaE;
  } else if (deltaE <= 18.0) {
    rawScore = 8.0 - ((deltaE - 10.0) / 8.0) * 2.0;
  } else if (deltaE <= 28.0) {
    rawScore = 6.0 - ((deltaE - 18.0) / 10.0) * 2.0;
  } else if (deltaE <= 40.0) {
    rawScore = 4.0 - ((deltaE - 28.0) / 12.0) * 2.0;
  } else if (deltaE <= 50.0) {
    rawScore = 2.0 - ((deltaE - 40.0) / 10.0) * 2.0;
  } else {
    rawScore = 0.0;
  }

  const clamped = Math.max(0.0, Math.min(10.0, rawScore));
  return Math.round(clamped * 100) / 100;
}

export function getScoreRating(score: number): string {
  if (score >= 9.5) return 'Perfection! (Imperceptible)';
  if (score >= 8.0) return 'Superb Eye!';
  if (score >= 6.0) return 'Close Match';
  if (score >= 4.0) return 'Noticeable Difference';
  if (score >= 2.0) return 'Distinct Difference';
  return 'Way Off';
}

export function hslToString(hsl: HSLColor): string {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}
