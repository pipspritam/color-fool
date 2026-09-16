import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerticalSlider } from '../components/VerticalSlider';
import { CountdownRing } from '../components/CountdownRing';
import { ResultSplit } from '../components/ResultSplit';
import {
  useColorState,
  Difficulty,
  DIFFICULTY_CONFIG,
  generateRandomTarget,
} from '../hooks/useColorState';
import { HSLColor, calculateDeltaE, scoreFromDeltaE, hslToString } from '../utils/colorScorer';
import { triggerHaptic } from '../utils/haptics';

export interface RoundRecord {
  target: HSLColor;
  guess: HSLColor;
  deltaE: number;
  score: number;
}

interface GameScreenProps {
  difficulty: Difficulty;
  onFinishGame: (records: RoundRecord[]) => void;
  onExit: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  difficulty,
  onFinishGame,
  onExit,
}) => {
  const insets = useSafeAreaInsets();
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'preview' | 'guess' | 'result'>('preview');
  const [target, setTarget] = useState<HSLColor>(() => generateRandomTarget(difficulty));
  const [records, setRecords] = useState<RoundRecord[]>([]);

  const { guess, setHue, setSaturation, setLightness, resetGuess } = useColorState();

  const totalScore = records.reduce((sum, r) => sum + r.score, 0);

  // Initialize round
  const startRound = useCallback((roundNum: number) => {
    const newTarget = generateRandomTarget(difficulty);
    setTarget(newTarget);
    resetGuess();
    setPhase('preview');
  }, [difficulty, resetGuess]);

  useEffect(() => {
    startRound(round);
  }, [round, startRound]);

  const handlePreviewDone = () => {
    triggerHaptic('medium');
    setPhase('guess');
  };

  const handleLockIn = () => {
    triggerHaptic('success');
    const deltaE = calculateDeltaE(target, guess);
    const score = scoreFromDeltaE(deltaE);

    const record: RoundRecord = { target, guess, deltaE, score };
    setRecords((prev) => [...prev, record]);
    setPhase('result');
  };

  const handleNextRound = () => {
    if (round >= 5) {
      onFinishGame(records);
    } else {
      setRound((prev) => prev + 1);
    }
  };

  // Dynamic gradient colors for sliders
  const hueColors = [
    '#ff0000',
    '#ffff00',
    '#00ff00',
    '#00ffff',
    '#0000ff',
    '#ff00ff',
    '#ff0000',
  ];

  const satColors = [
    `hsl(${guess.h}, 0%, ${guess.l}%)`,
    `hsl(${guess.h}, 100%, ${guess.l}%)`,
  ];

  const lightColors = [
    '#000000',
    `hsl(${guess.h}, ${guess.s}%, 50%)`,
    '#ffffff',
  ];

  // Active background color: Target during preview, User's guess during Guess
  const backgroundColor =
    phase === 'preview' ? hslToString(target) : hslToString(guess);

  return (
    <View style={[styles.canvas, { backgroundColor }]}>
      {/* Top Floating HUD */}
      <View
        style={[
          styles.topHud,
          {
            paddingTop: Math.max(insets.top, 24) + 8,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onExit}
          style={styles.exitBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.hudCenter}>
          <Text style={styles.hudTitle}>color-fool</Text>
          <Text style={styles.hudRound}>ROUND {round} / 5</Text>
        </View>

        <View style={styles.hudScoreBox}>
          <Text style={styles.hudScoreLabel}>SCORE</Text>
          <Text style={styles.hudScoreVal}>{totalScore}</Text>
        </View>
      </View>

      {/* Phase 1: Preview Phase with floating countdown */}
      {phase === 'preview' && (
        <View style={styles.previewContainer}>
          <CountdownRing
            durationSeconds={DIFFICULTY_CONFIG[difficulty].previewSeconds}
            onFinish={handlePreviewDone}
          />
        </View>
      )}

      {/* Phase 2: Full-screen interactive guess */}
      {phase === 'guess' && (
        <View style={styles.guessArea}>
          {/* 3 Left Vertical Gesture Sliders (Flush against left boundary) */}
          <View
            style={[
              styles.sliderRail,
              {
                top: Math.max(insets.top, 24) + 68,
                bottom: Math.max(insets.bottom, 20) + 80,
              },
            ]}
          >
            <View style={styles.sliderItem}>
              <VerticalSlider
                value={guess.h}
                min={0}
                max={360}
                colors={hueColors}
                onChange={setHue}
                width={34}
              />
              <Text style={styles.sliderLabel}>H</Text>
            </View>

            <View style={styles.sliderItem}>
              <VerticalSlider
                value={guess.s}
                min={0}
                max={100}
                colors={satColors}
                onChange={setSaturation}
                width={34}
              />
              <Text style={styles.sliderLabel}>S</Text>
            </View>

            <View style={styles.sliderItem}>
              <VerticalSlider
                value={guess.l}
                min={0}
                max={100}
                colors={lightColors}
                onChange={setLightness}
                width={34}
              />
              <Text style={styles.sliderLabel}>L</Text>
            </View>
          </View>

          {/* Bottom Floating Lock In Button */}
          <View
            style={[
              styles.bottomHud,
              {
                bottom: Math.max(insets.bottom, 20) + 16,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.lockInBtn}
              onPress={handleLockIn}
              activeOpacity={0.8}
            >
              <Text style={styles.lockInText}>LOCK IN GUESS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Phase 3: Round Result Split */}
      {phase === 'result' && records.length >= round && (
        <ResultSplit
          target={target}
          guess={guess}
          deltaE={records[round - 1].deltaE}
          score={records[round - 1].score}
          roundNumber={round}
          onNextRound={handleNextRound}
          isLastRound={round >= 5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFill,
  },
  safeArea: {
    flex: 1,
  },
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  exitBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  exitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  hudCenter: {
    alignItems: 'center',
  },
  hudTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hudRound: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hudScoreBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hudScoreLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 8.5,
    fontWeight: '800',
  },
  hudScoreVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guessArea: {
    flex: 1,
    position: 'relative',
  },
  sliderRail: {
    position: 'absolute',
    left: 8,
    top: 40,
    bottom: 90,
    width: 140,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 15,
  },
  sliderItem: {
    height: '100%',
    alignItems: 'center',
  },
  sliderLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomHud: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  lockInBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 36,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  lockInText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.8,
  },
});
