import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HSLColor, hslToString, getScoreRating } from '../utils/colorScorer';

interface ResultSplitProps {
  target: HSLColor;
  guess: HSLColor;
  deltaE: number;
  score: number;
  roundNumber: number;
  onNextRound: () => void;
  isLastRound: boolean;
  readyCount?: number;
  totalPlayers?: number;
  hasReadied?: boolean;
}

export const ResultSplit: React.FC<ResultSplitProps> = ({
  target,
  guess,
  deltaE,
  score,
  roundNumber,
  onNextRound,
  isLastRound,
  readyCount = 0,
  totalPlayers,
  hasReadied = false,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 24) + 64;

  const isMultiplayer = totalPlayers !== undefined && totalPlayers > 1;

  let buttonLabel = isLastRound ? 'VIEW MATCH SUMMARY →' : 'NEXT ROUND →';
  if (isMultiplayer) {
    if (hasReadied) {
      buttonLabel = `✓ READY! (${readyCount}/${totalPlayers} WAITING...)`;
    } else {
      const actionName = isLastRound ? 'VIEW MATCH SUMMARY' : 'NEXT ROUND';
      buttonLabel = `${actionName} (${readyCount}/${totalPlayers} READY)`;
    }
  }

  return (
    <View style={styles.container}>
      {/* Side-by-side color split */}
      <View style={styles.splitContainer}>
        <View style={[styles.half, { backgroundColor: hslToString(target), paddingTop: topPadding }]}>
          <View style={styles.swatchLabel}>
            <Text style={styles.labelText}>TARGET</Text>
            <Text style={styles.hslDetail}>
              H:{Math.round(target.h)} S:{Math.round(target.s)}% L:{Math.round(target.l)}%
            </Text>
          </View>
        </View>
        <View style={[styles.half, { backgroundColor: hslToString(guess), paddingTop: topPadding }]}>
          <View style={styles.swatchLabel}>
            <Text style={styles.labelText}>YOUR GUESS</Text>
            <Text style={styles.hslDetail}>
              H:{Math.round(guess.h)} S:{Math.round(guess.s)}% L:{Math.round(guess.l)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Floating Result HUD Card */}
      <View style={styles.card}>
        <Text style={styles.roundHeader}>ROUND {roundNumber} RESULTS</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreNumber}>+{score}</Text>
          <Text style={styles.scoreMax}> / 10 pts</Text>
        </View>
        <Text style={styles.ratingText}>{getScoreRating(score)}</Text>

        <View style={styles.metricBadge}>
          <Text style={styles.metricText}>
            Perceptual Distance (ΔE): <Text style={styles.bold}>{deltaE.toFixed(1)}</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            isMultiplayer && hasReadied && styles.buttonReadied,
          ]}
          onPress={onNextRound}
          disabled={isMultiplayer && hasReadied}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.buttonText,
              isMultiplayer && hasReadied && styles.buttonTextReadied,
            ]}
          >
            {buttonLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  splitContainer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  half: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 84,
  },
  swatchLabel: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  labelText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1.5,
    fontSize: 12,
  },
  hslDetail: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    width: '88%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  roundHeader: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    color: '#38BDF8',
    fontSize: 48,
    fontWeight: '900',
  },
  scoreMax: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
    fontWeight: '700',
  },
  ratingText: {
    color: '#4ADE80',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  metricBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 12,
  },
  metricText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
  },
  bold: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  buttonReadied: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1.5,
    borderColor: '#4ADE80',
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  buttonTextReadied: {
    color: '#4ADE80',
    letterSpacing: 0.8,
  },
});
