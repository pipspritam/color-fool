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
  return Math.round(deltaE * 10) / 10;
}

/**
 * Maps Delta E to 0-10 Match Score according to specification:
 * Delta E <= 2.5  -> 10 pts (imperceptible match)
 * Delta E <= 5.0  -> 9 pts
 * Delta E <= 10.0 -> 8 pts
 * Delta E <= 18.0 -> 6 pts
 * Delta E <= 28.0 -> 4 pts
 * Delta E <= 40.0 -> 2 pts
 * Delta E > 40.0  -> max(0, floor(10 - Delta E / 5)) pts
 */
export function scoreFromDeltaE(deltaE: number): number {
  if (deltaE <= 2.5) return 10;
  if (deltaE <= 5.0) return 9;
  if (deltaE <= 10.0) return 8;
  if (deltaE <= 18.0) return 6;
  if (deltaE <= 28.0) return 4;
  if (deltaE <= 40.0) return 2;
  return Math.max(0, Math.floor(10 - deltaE / 5));
}

export function getScoreRating(score: number): string {
  if (score === 10) return 'Perfection! (Imperceptible)';
  if (score >= 8) return 'Superb Eye!';
  if (score >= 6) return 'Close Match';
  if (score >= 4) return 'Noticeable Difference';
  if (score >= 2) return 'Distinct Difference';
  return 'Way Off';
}

export function hslToString(hsl: HSLColor): string {
  return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`;
}
