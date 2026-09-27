import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Difficulty, CustomGameConfig, PaletteType } from '../hooks/useColorState';
import { triggerHaptic } from '../utils/haptics';
import { SettingsModal } from '../components/SettingsModal';
import { saveDifficulty, saveCustomConfig } from '../utils/storage';
import { theme } from '../theme';

interface HomeScreenProps {
  onStartSolo: (difficulty: Difficulty, customConfig?: CustomGameConfig) => void;
  onStartMultiplayer: (difficulty: Difficulty, customConfig?: CustomGameConfig) => void;
  sliderPosition: 'left' | 'right';
  onUpdateSliderPosition: (pos: 'left' | 'right') => void;
  initialCustomConfig?: CustomGameConfig;
  initialDifficulty?: Difficulty;
  onDifficultyChange?: (difficulty: Difficulty) => void;
  onCustomConfigChange?: (config: CustomGameConfig) => void;
}

interface PaletteOptionItem {
  id: PaletteType;
  label: string;
  tag: string;
  desc: string;
  samples: string[];
}

const PALETTE_OPTIONS: PaletteOptionItem[] = [
  {
    id: 'all',
    label: 'All Mix',
    tag: 'DYNAMIC',
    desc: 'Cycles Vivid, Balanced & Expert across rounds',
    samples: ['#38BDF8', '#0284C7', '#64748B'],
  },
  {
    id: 'easy',
    label: 'Vivid',
    tag: 'EASY',
    desc: 'High saturation & clear tones (40–90% S, 30–70% L)',
    samples: ['#38BDF8', '#34D399', '#FB7185'],
  },
  {
    id: 'medium',
    label: 'Balanced',
    tag: 'MEDIUM',
    desc: 'Standard range with subtle nuances (15–95% S, 15–85% L)',
    samples: ['#0284C7', '#0D9488', '#F59E0B'],
  },
  {
    id: 'hard',
    label: 'Expert',
    tag: 'HARD',
    desc: 'Muted, pastels & deep earth tones (5–100% S, 10–90% L)',
    samples: ['#64748B', '#1E293B', '#E2E8F0'],
  },
];

export function getPaletteDisplayName(p: PaletteType): string {
  switch (p) {
    case 'all':
      return 'All Mix';
    case 'easy':
      return 'Vivid';
    case 'medium':
      return 'Balanced';
    case 'hard':
      return 'Expert';
    default:
      return 'All Mix';
  }
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartSolo,
  onStartMultiplayer,
  sliderPosition,
  onUpdateSliderPosition,
  initialCustomConfig,
  initialDifficulty,
  onDifficultyChange,
  onCustomConfigChange,
}) => {
  const insets = useSafeAreaInsets();
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty ?? 'medium');
  const [showSettings, setShowSettings] = useState(false);

  // Custom Mode Config (Timers: 0.5s to 99.0s, Rounds: 1 to 30, Palette: all / easy / medium / hard)
  const [previewSec, setPreviewSec] = useState(initialCustomConfig?.previewSeconds ?? 3.0);
  const [guessSec, setGuessSec] = useState(initialCustomConfig?.guessSeconds ?? 15.0);
  const [roundsCount, setRoundsCount] = useState(initialCustomConfig?.rounds ?? 5);
  const [palette, setPalette] = useState<PaletteType>(initialCustomConfig?.palette ?? 'all');
  const [showPaletteDropdown, setShowPaletteDropdown] = useState(false);

  const [previewText, setPreviewText] = useState(previewSec.toFixed(2));
  const [guessText, setGuessText] = useState(guessSec.toFixed(2));
  const [roundsText, setRoundsText] = useState(String(roundsCount));

  // Sync state when props change from storage loader
  useEffect(() => {
    if (initialDifficulty) {
      setDifficulty(initialDifficulty);
    }
  }, [initialDifficulty]);

  useEffect(() => {
    if (initialCustomConfig) {
      setPreviewSec(initialCustomConfig.previewSeconds);
      setPreviewText(initialCustomConfig.previewSeconds.toFixed(2));
      setGuessSec(initialCustomConfig.guessSeconds);
      setGuessText(initialCustomConfig.guessSeconds.toFixed(2));
      setRoundsCount(initialCustomConfig.rounds);
      setRoundsText(String(initialCustomConfig.rounds));
      setPalette(initialCustomConfig.palette ?? 'all');
    }
  }, [initialCustomConfig]);

  const clampValue = (val: number) => {
    const clamped = Math.min(99.0, Math.max(0.5, val));
    return Math.round(clamped * 100) / 100;
  };

  const clampRounds = (val: number) => {
    return Math.min(30, Math.max(1, Math.round(val)));
  };

  const syncCustomConfig = (p: number, g: number, r: number, pal: PaletteType) => {
    const cfg: CustomGameConfig = { previewSeconds: p, guessSeconds: g, rounds: r, palette: pal };
    saveCustomConfig(cfg);
    onCustomConfigChange?.(cfg);
  };

  const handleSelectDifficulty = (level: Difficulty) => {
    triggerHaptic('selection');
    setDifficulty(level);
    saveDifficulty(level);
    onDifficultyChange?.(level);
  };

  const adjustPreview = (delta: number) => {
    triggerHaptic('light');
    const next = clampValue(previewSec + delta);
    setPreviewSec(next);
    setPreviewText(next.toFixed(2));
    syncCustomConfig(next, guessSec, roundsCount, palette);
  };

  const adjustGuess = (delta: number) => {
    triggerHaptic('light');
    const next = clampValue(guessSec + delta);
    setGuessSec(next);
    setGuessText(next.toFixed(2));
    syncCustomConfig(previewSec, next, roundsCount, palette);
  };

  const adjustRounds = (delta: number) => {
    triggerHaptic('light');
    const next = clampRounds(roundsCount + delta);
    setRoundsCount(next);
    setRoundsText(String(next));
    syncCustomConfig(previewSec, guessSec, next, palette);
  };

  const handlePaletteSelect = (nextPal: PaletteType) => {
    triggerHaptic('selection');
    setPalette(nextPal);
    syncCustomConfig(previewSec, guessSec, roundsCount, nextPal);
  };

  const handlePreviewTextChange = (text: string) => {
    setPreviewText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      setPreviewSec(clampValue(parsed));
    }
  };

  const handleGuessTextChange = (text: string) => {
    setGuessText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      setGuessSec(clampValue(parsed));
    }
  };

  const handleRoundsTextChange = (text: string) => {
    setRoundsText(text);
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed)) {
      setRoundsCount(clampRounds(parsed));
    }
  };

  const handleBlurPreview = () => {
    const valid = clampValue(previewSec);
    setPreviewSec(valid);
    setPreviewText(valid.toFixed(2));
    syncCustomConfig(valid, guessSec, roundsCount, palette);
  };

  const handleBlurGuess = () => {
    const valid = clampValue(guessSec);
    setGuessSec(valid);
    setGuessText(valid.toFixed(2));
    syncCustomConfig(previewSec, valid, roundsCount, palette);
  };

  const handleBlurRounds = () => {
    const valid = clampRounds(roundsCount);
    setRoundsCount(valid);
    setRoundsText(String(valid));
    syncCustomConfig(previewSec, guessSec, valid, palette);
  };

  const handleStartGame = () => {
    if (difficulty === 'custom') {
      onStartSolo('custom', {
        previewSeconds: previewSec,
        guessSeconds: guessSec,
        rounds: roundsCount,
        palette,
      });
    } else {
      onStartSolo(difficulty);
    }
  };

  const handleStartMultiplayer = () => {
    if (difficulty === 'custom') {
      onStartMultiplayer('custom', {
        previewSeconds: previewSec,
        guessSeconds: guessSec,
        rounds: roundsCount,
        palette,
      });
    } else {
      onStartMultiplayer(difficulty);
    }
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
        setShowPaletteDropdown(false);
      }}
      accessible={false}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 24) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 8,
          },
        ]}
      >
      {/* Settings Gear Button */}
      <TouchableOpacity
        style={[
          styles.settingsBtn,
          {
            top: Math.max(insets.top, 24) + 8,
          },
        ]}
        onPress={() => {
          triggerHaptic('light');
          setShowSettings(true);
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Game settings"
      >
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <View style={[styles.dot, { backgroundColor: theme.colors.dots.dot1 }]} />
            <View style={[styles.dot, { backgroundColor: theme.colors.dots.dot2 }]} />
            <View style={[styles.dot, { backgroundColor: theme.colors.dots.dot3 }]} />
          </View>
          <Text style={styles.title}>color-fool</Text>
          <Text style={styles.tagline}>Memorize. Reconstruct. Match.</Text>
        </View>

        {/* Difficulty Presets */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>SELECT DIFFICULTY</Text>
          <View style={styles.diffRow}>
            {(['easy', 'medium', 'hard', 'custom'] as Difficulty[]).map((level) => {
              const isSelected = difficulty === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.diffBtn, isSelected && styles.diffBtnActive]}
                  onPress={() => handleSelectDifficulty(level)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.diffText, isSelected && styles.diffTextActive]}>
                    {level.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.descBox}>
            {difficulty === 'easy' && (
              <>
                <Text style={styles.descTitle}>5.0s Preview • Vivid Palette</Text>
                <Text style={styles.descSub}>High saturation colors (40% - 90%)</Text>
              </>
            )}
            {difficulty === 'medium' && (
              <>
                <Text style={styles.descTitle}>3.0s Preview • Standard Spectrum</Text>
                <Text style={styles.descSub}>Balanced shades (15% - 95%)</Text>
              </>
            )}
            {difficulty === 'hard' && (
              <>
                <Text style={styles.descTitle}>1.5s Preview • Expert Palette</Text>
                <Text style={styles.descSub}>Muted, pastels, and dark earth tones (5% - 100%)</Text>
              </>
            )}
            {difficulty === 'custom' && (
              <View style={styles.customBox}>
                {/* 1. Preview Time Selector */}
                <View style={styles.timerControlRow}>
                  <View style={styles.timerLabelCol}>
                    <Text style={styles.timerTitle}>PREVIEW TIME</Text>
                    <Text style={styles.timerSub}>Time to memorize (0.5 - 99s)</Text>
                  </View>

                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustPreview(-0.5)}
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease preview time"
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>

                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.timerInput}
                        value={previewText}
                        onChangeText={handlePreviewTextChange}
                        onBlur={handleBlurPreview}
                        keyboardType="numeric"
                        maxLength={4}
                        selectTextOnFocus
                      />
                      <Text style={styles.secSuffix}>s</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustPreview(0.5)}
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Increase preview time"
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. Guessing Time Limit Selector */}
                <View style={styles.timerControlRow}>
                  <View style={styles.timerLabelCol}>
                    <Text style={styles.timerTitle}>GUESS TIME LIMIT</Text>
                    <Text style={styles.timerSub}>Auto-locks in (0.5 - 99s)</Text>
                  </View>

                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustGuess(-1.0)}
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease guess time limit"
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>

                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.timerInput}
                        value={guessText}
                        onChangeText={handleGuessTextChange}
                        onBlur={handleBlurGuess}
                        keyboardType="numeric"
                        maxLength={4}
                        selectTextOnFocus
                      />
                      <Text style={styles.secSuffix}>s</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustGuess(1.0)}
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Increase guess time limit"
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. Number of Rounds Selector */}
                <View style={styles.timerControlRow}>
                  <View style={styles.timerLabelCol}>
                    <Text style={styles.timerTitle}>NUMBER OF ROUNDS</Text>
                    <Text style={styles.timerSub}>Match length (1 - 30 rounds)</Text>
                  </View>

                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustRounds(-1)}
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease number of rounds"
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>

                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.timerInput}
                        value={roundsText}
                        onChangeText={handleRoundsTextChange}
                        onBlur={handleBlurRounds}
                        keyboardType="number-pad"
                        maxLength={2}
                        selectTextOnFocus
                      />
                      <Text style={styles.secSuffix}>r</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustRounds(1)}
                      activeOpacity={0.7}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Increase number of rounds"
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4. Color Palette Selector (Dropdown) */}
                <View style={styles.dropdownControlContainer}>
                  <TouchableOpacity
                    style={styles.timerControlRow}
                    onPress={() => {
                      triggerHaptic('light');
                      setShowPaletteDropdown((prev) => !prev);
                    }}
                    activeOpacity={0.7}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Toggle color palette dropdown"
                  >
                    <View style={styles.timerLabelCol}>
                      <Text style={styles.timerTitle}>COLOR PALETTE</Text>
                      <Text style={styles.timerSub}>
                        {getPaletteDisplayName(palette)} spectrum
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.dropdownTrigger,
                        showPaletteDropdown && styles.dropdownTriggerActive,
                      ]}
                    >
                      <Text style={styles.dropdownTriggerText}>
                        {getPaletteDisplayName(palette)}
                      </Text>
                      <Text style={styles.dropdownChevron}>
                        {showPaletteDropdown ? '▲' : '▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Dropdown Menu with All Mix / Vivid / Balanced / Expert */}
                  {showPaletteDropdown && (
                    <View style={styles.dropdownMenu}>
                      {PALETTE_OPTIONS.map((opt) => {
                        const isSelected = palette === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.dropdownMenuItem,
                              isSelected && styles.dropdownMenuItemActive,
                            ]}
                            onPress={() => {
                              handlePaletteSelect(opt.id);
                              setShowPaletteDropdown(false);
                            }}
                            activeOpacity={0.7}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${opt.label} palette`}
                          >
                            <View style={styles.dropdownItemLeft}>
                              <View style={styles.dropdownItemTitleRow}>
                                <Text
                                  style={[
                                    styles.dropdownItemLabel,
                                    isSelected && styles.dropdownItemLabelActive,
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                                <View
                                  style={[
                                    styles.dropdownItemBadge,
                                    isSelected && styles.dropdownItemBadgeActive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.dropdownItemBadgeText,
                                      isSelected && styles.dropdownItemBadgeTextActive,
                                    ]}
                                  >
                                    {opt.tag}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.dropdownItemSub}>{opt.desc}</Text>
                            </View>

                            <View style={styles.dropdownItemRight}>
                              <View style={styles.dropdownSwatchesRow}>
                                {opt.samples.map((color, idx) => (
                                  <View
                                    key={idx}
                                    style={[styles.dropdownSwatch, { backgroundColor: color }]}
                                  />
                                ))}
                              </View>
                              {isSelected && (
                                <View style={styles.dropdownActiveTag}>
                                  <Text style={styles.dropdownActiveTagText}>SELECTED</Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Math & Rule info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>HOW IT WORKS</Text>
          <Text style={styles.infoText}>
            1. Memorize the preview color before the timer expires.{'\n'}
            2. Use the 3 vertical sliders (Hue, Saturation, Lightness) to match it.{'\n'}
            3. Score 0 to 10 points per round calculated via perceptual ΔE distance.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStartGame}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {difficulty === 'custom'
                ? `START CUSTOM MATCH (${roundsCount} RND • ${getPaletteDisplayName(palette).toUpperCase()})`
                : 'SOLO MATCH (5 ROUNDS)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleStartMultiplayer}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>MULTIPLAYER ROOM (UP TO 10)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        sliderPosition={sliderPosition}
        onUpdateSliderPosition={onUpdateSliderPosition}
      />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  settingsBtn: {
    position: 'absolute',
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.cardSurface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  settingsIcon: {
    fontSize: 20,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoBadge: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.textPrimary,
    letterSpacing: 2,
  },
  tagline: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: theme.colors.cardSurface,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  cardHeader: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  diffBtnActive: {
    backgroundColor: theme.colors.primaryAccent,
    borderColor: theme.colors.primaryAccent,
  },
  diffText: {
    color: theme.colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  diffTextActive: {
    color: theme.colors.accentText,
    fontWeight: '900',
  },
  descBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    alignItems: 'center',
  },
  descTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  descSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  customBox: {
    width: '100%',
    marginTop: 4,
    gap: 10,
  },
  timerControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  timerLabelCol: {
    flex: 1,
    marginRight: 6,
  },
  timerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerSub: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: theme.colors.primaryAccent,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardSurface,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    minWidth: 54,
    justifyContent: 'center',
  },
  timerInput: {
    color: theme.colors.primaryAccent,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    padding: 0,
    minWidth: 32,
  },
  secSuffix: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  dropdownControlContainer: {
    width: '100%',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    height: 32,
    paddingHorizontal: 10,
    gap: 8,
    minWidth: 110,
  },
  dropdownTriggerActive: {
    borderColor: theme.colors.primaryAccent,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  dropdownTriggerText: {
    color: theme.colors.primaryAccent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownChevron: {
    color: theme.colors.primaryAccent,
    fontSize: 10,
    fontWeight: '900',
  },
  dropdownMenu: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 6,
    gap: 6,
    marginTop: 6,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardSurface,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  dropdownMenuItemActive: {
    borderColor: theme.colors.primaryAccent,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  dropdownItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  dropdownItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownItemLabel: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownItemLabelActive: {
    color: theme.colors.primaryAccent,
  },
  dropdownItemBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceBorder,
  },
  dropdownItemBadgeActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  dropdownItemBadgeText: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dropdownItemBadgeTextActive: {
    color: theme.colors.primaryAccent,
  },
  dropdownItemSub: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  dropdownItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dropdownSwatchesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dropdownSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dropdownActiveTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryAccent,
  },
  dropdownActiveTagText: {
    color: theme.colors.accentText,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  infoTitle: {
    color: theme.colors.primaryAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primaryAccent,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: theme.colors.accentText,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  secondaryBtn: {
    backgroundColor: theme.colors.cardSurface,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryAccent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: theme.colors.primaryAccent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
