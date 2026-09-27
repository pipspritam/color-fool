import { useState, useCallback } from 'react';
import { HSLColor } from '../utils/colorScorer';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';
export type PaletteType = 'all' | 'easy' | 'medium' | 'hard';

export interface CustomGameConfig {
  previewSeconds: number; // 0.5 to 99.0
  guessSeconds: number;   // 0.5 to 99.0
  rounds: number;         // 1 to 30
  palette: PaletteType;   // 'all' | 'easy' | 'medium' | 'hard'
}

export interface DifficultyConfig {
  previewSeconds: number;
  sMin: number;
  sMax: number;
  lMin: number;
  lMax: number;
}

export const DIFFICULTY_CONFIG: Record<Exclude<Difficulty, 'custom'>, DifficultyConfig> = {
  easy: {
    previewSeconds: 5.0,
    sMin: 40,
    sMax: 90,
    lMin: 30,
    lMax: 70,
  },
  medium: {
    previewSeconds: 3.0,
    sMin: 15,
    sMax: 95,
    lMin: 15,
    lMax: 85,
  },
  hard: {
    previewSeconds: 1.5,
    sMin: 5,
    sMax: 100,
    lMin: 10,
    lMax: 90,
  },
};

export function resolvePaletteForRound(
  difficulty: Difficulty,
  customConfig?: CustomGameConfig,
  round: number = 1
): 'easy' | 'medium' | 'hard' {
  if (difficulty !== 'custom') {
    return difficulty;
  }
  const palette = customConfig?.palette ?? 'all';
  if (palette === 'all') {
    const sequence: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    const idx = (Math.max(1, round) - 1) % sequence.length;
    return sequence[idx];
  }
  return palette;
}

export function generateRandomTarget(
  difficulty: Difficulty,
  customConfig?: CustomGameConfig,
  round: number = 1
): HSLColor {
  const effectivePalette = resolvePaletteForRound(difficulty, customConfig, round);
  const cfg = DIFFICULTY_CONFIG[effectivePalette];
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(cfg.sMin + Math.random() * (cfg.sMax - cfg.sMin + 1));
  const l = Math.floor(cfg.lMin + Math.random() * (cfg.lMax - cfg.lMin + 1));
  return { h, s, l };
}

export function useColorState() {
  const [guess, setGuess] = useState<HSLColor>({ h: 180, s: 50, l: 50 });

  const setHue = useCallback((h: number) => {
    setGuess((prev) => ({ ...prev, h }));
  }, []);

  const setSaturation = useCallback((s: number) => {
    setGuess((prev) => ({ ...prev, s }));
  }, []);

  const setLightness = useCallback((l: number) => {
    setGuess((prev) => ({ ...prev, l }));
  }, []);

  const resetGuess = useCallback(() => {
    // Start with a neutral or randomized baseline for guessing
    setGuess({ h: 180, s: 50, l: 50 });
  }, []);

  return {
    guess,
    setGuess,
    setHue,
    setSaturation,
    setLightness,
    resetGuess,
  };
}
