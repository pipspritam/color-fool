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
import { Difficulty, CustomGameConfig } from '../hooks/useColorState';
import { triggerHaptic } from '../utils/haptics';
import { SettingsModal } from '../components/SettingsModal';
import { saveDifficulty, saveCustomConfig } from '../utils/storage';

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

  // Custom Mode Config (Timers: 0.5s to 99.0s, Rounds: 1 to 30)
  const [previewSec, setPreviewSec] = useState(initialCustomConfig?.previewSeconds ?? 3.0);
  const [guessSec, setGuessSec] = useState(initialCustomConfig?.guessSeconds ?? 15.0);
  const [roundsCount, setRoundsCount] = useState(initialCustomConfig?.rounds ?? 5);

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
    }
  }, [initialCustomConfig]);

  const clampValue = (val: number) => {
    const clamped = Math.min(99.0, Math.max(0.5, val));
    return Math.round(clamped * 100) / 100;
  };

  const clampRounds = (val: number) => {
    return Math.min(30, Math.max(1, Math.round(val)));
  };

  const syncCustomConfig = (p: number, g: number, r: number) => {
    const cfg: CustomGameConfig = { previewSeconds: p, guessSeconds: g, rounds: r };
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
    syncCustomConfig(next, guessSec, roundsCount);
  };

  const adjustGuess = (delta: number) => {
    triggerHaptic('light');
    const next = clampValue(guessSec + delta);
    setGuessSec(next);
    setGuessText(next.toFixed(2));
    syncCustomConfig(previewSec, next, roundsCount);
  };

  const adjustRounds = (delta: number) => {
    triggerHaptic('light');
    const next = clampRounds(roundsCount + delta);
    setRoundsCount(next);
    setRoundsText(String(next));
    syncCustomConfig(previewSec, guessSec, next);
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
    syncCustomConfig(valid, guessSec, roundsCount);
  };

  const handleBlurGuess = () => {
    const valid = clampValue(guessSec);
    setGuessSec(valid);
    setGuessText(valid.toFixed(2));
    syncCustomConfig(previewSec, valid, roundsCount);
  };

  const handleBlurRounds = () => {
    const valid = clampRounds(roundsCount);
    setRoundsCount(valid);
    setRoundsText(String(valid));
    syncCustomConfig(previewSec, guessSec, valid);
  };

  const handleStartGame = () => {
    if (difficulty === 'custom') {
      onStartSolo('custom', {
        previewSeconds: previewSec,
        guessSeconds: guessSec,
        rounds: roundsCount,
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
      });
    } else {
      onStartMultiplayer(difficulty);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
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
                ? `START CUSTOM MATCH (${roundsCount} ROUND${roundsCount > 1 ? 'S' : ''})`
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
    backgroundColor: '#090D16',
  },
  settingsBtn: {
    position: 'absolute',
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  settingsIcon: {
    fontSize: 20,
    color: '#94A3B8',
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
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#131D31',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    color: '#64748B',
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
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  diffBtnActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  diffText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  diffTextActive: {
    color: '#090D16',
    fontWeight: '900',
  },
  descBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  descTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  descSub: {
    color: '#94A3B8',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  timerLabelCol: {
    flex: 1,
    marginRight: 6,
  },
  timerTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timerSub: {
    color: '#94A3B8',
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
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    minWidth: 54,
    justifyContent: 'center',
  },
  timerInput: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    padding: 0,
    minWidth: 32,
  },
  secSuffix: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoTitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#090D16',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  secondaryBtn: {
    backgroundColor: '#131D31',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
