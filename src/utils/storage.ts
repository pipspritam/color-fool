import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty, CustomGameConfig } from '../hooks/useColorState';

export interface AppSavedSettings {
  sliderPosition: 'left' | 'right';
  difficulty: Difficulty;
  customConfig: CustomGameConfig;
  playerName: string;
  hasCustomName: boolean;
}

const ADJECTIVES = [
  'Neon', 'Cosmic', 'Pixel', 'Chroma', 'Prism', 'Vivid', 'Cyber', 'Solar',
  'Frost', 'Lunar', 'Turbo', 'Hyper', 'Swift', 'Mystic', 'Golden', 'Spark',
  'Amber', 'Ruby', 'Cobalt', 'Blaze',
];

const NOUNS = [
  'Fox', 'Hawk', 'Wolf', 'Lynx', 'Panda', 'Tiger', 'Otter', 'Owl',
  'Falcon', 'Badger', 'Viper', 'Knight', 'Nomad', 'Pilot', 'Ghost', 'Comet',
  'Wizard', 'Ninja', 'Ranger', 'Fool',
];

export function generateAutoPlayerName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}${num}`.slice(0, 12);
}

export const DEFAULT_SETTINGS: AppSavedSettings = {
  sliderPosition: 'left',
  difficulty: 'medium',
  customConfig: {
    previewSeconds: 3.0,
    guessSeconds: 15.0,
    rounds: 5,
  },
  playerName: generateAutoPlayerName(),
  hasCustomName: false,
};

const STORAGE_KEYS = {
  SLIDER_POSITION: '@color_fool_slider_position',
  DIFFICULTY: '@color_fool_difficulty',
  CUSTOM_CONFIG: '@color_fool_custom_config',
  PLAYER_NAME: '@color_fool_player_name',
  IS_CUSTOM_NAME: '@color_fool_is_custom_name',
};

// Resilient in-memory fallback if native storage bridge is unavailable
const memoryFallback = new Map<string, string>();

async function safeGetItem(key: string): Promise<string | null> {
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Native module unavailable or error; fall back to memory
  }
  return memoryFallback.get(key) || null;
}

async function safeSetItem(key: string, value: string): Promise<void> {
  memoryFallback.set(key, value);
  try {
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(key, value);
    }
  } catch {
    // Handled silently by in-memory fallback
  }
}

export async function loadSavedSettings(): Promise<AppSavedSettings> {
  try {
    const [savedSlider, savedDiff, savedCustom, savedName, savedIsCustom] = await Promise.all([
      safeGetItem(STORAGE_KEYS.SLIDER_POSITION),
      safeGetItem(STORAGE_KEYS.DIFFICULTY),
      safeGetItem(STORAGE_KEYS.CUSTOM_CONFIG),
      safeGetItem(STORAGE_KEYS.PLAYER_NAME),
      safeGetItem(STORAGE_KEYS.IS_CUSTOM_NAME),
    ]);

    const sliderPosition: 'left' | 'right' =
      savedSlider === 'right' || savedSlider === 'left'
        ? savedSlider
        : DEFAULT_SETTINGS.sliderPosition;

    const difficulty: Difficulty =
      savedDiff === 'easy' || savedDiff === 'medium' || savedDiff === 'hard' || savedDiff === 'custom'
        ? savedDiff
        : DEFAULT_SETTINGS.difficulty;

    let customConfig: CustomGameConfig = { ...DEFAULT_SETTINGS.customConfig };
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        if (
          typeof parsed.previewSeconds === 'number' &&
          typeof parsed.guessSeconds === 'number' &&
          typeof parsed.rounds === 'number'
        ) {
          customConfig = {
            previewSeconds: Math.min(99.0, Math.max(0.5, Math.round(parsed.previewSeconds * 10) / 10)),
            guessSeconds: Math.min(99.0, Math.max(0.5, Math.round(parsed.guessSeconds * 10) / 10)),
            rounds: Math.min(30, Math.max(1, Math.round(parsed.rounds))),
          };
        }
      } catch {
        // Fallback to default
      }
    }

    const hasCustomName = savedIsCustom === 'true';
    let playerName: string;
    if (hasCustomName && savedName && savedName.trim().length > 0) {
      playerName = savedName.trim().slice(0, 12);
    } else {
      playerName = generateAutoPlayerName();
    }

    return {
      sliderPosition,
      difficulty,
      customConfig,
      playerName,
      hasCustomName,
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      playerName: generateAutoPlayerName(),
    };
  }
}

export async function saveSliderPosition(position: 'left' | 'right'): Promise<void> {
  await safeSetItem(STORAGE_KEYS.SLIDER_POSITION, position);
}

export async function saveDifficulty(difficulty: Difficulty): Promise<void> {
  await safeSetItem(STORAGE_KEYS.DIFFICULTY, difficulty);
}

export async function saveCustomConfig(config: CustomGameConfig): Promise<void> {
  await safeSetItem(STORAGE_KEYS.CUSTOM_CONFIG, JSON.stringify(config));
}

export async function savePlayerName(name: string, isUserEdited: boolean = true): Promise<void> {
  const trimmed = name.trim().slice(0, 12);
  await Promise.all([
    safeSetItem(STORAGE_KEYS.PLAYER_NAME, trimmed),
    safeSetItem(STORAGE_KEYS.IS_CUSTOM_NAME, isUserEdited ? 'true' : 'false'),
  ]);
}
