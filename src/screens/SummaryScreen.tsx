import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoundRecord } from './GameScreen';
import { hslToString } from '../utils/colorScorer';
import { triggerHaptic } from '../utils/haptics';
import { theme } from '../theme';

interface SummaryScreenProps {
  records: RoundRecord[];
  onRestart: () => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ records, onRestart }) => {
  const insets = useSafeAreaInsets();
  const totalScore = Math.round(records.reduce((sum, r) => sum + r.score, 0) * 100) / 100;
  const totalRounds = records.length || 5;
  const maxScore = totalRounds * 10;

  // Intercept Android hardware back button to cleanly restart/return home
  React.useEffect(() => {
    const onBackPress = () => {
      onRestart();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onRestart]);

  const getRank = (score: number) => {
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (pct >= 90) return { title: 'Master Colorist', badge: 'MASTER', color: theme.colors.status.warning };
    if (pct >= 75) return { title: 'Keen Eyesight', badge: 'EXPERT', color: theme.colors.primaryAccent };
    if (pct >= 55) return { title: 'Sharp Observer', badge: 'SHARP', color: theme.colors.primaryAccent };
    if (pct >= 35) return { title: 'Average Perception', badge: 'APPRENTICE', color: theme.colors.textSecondary };
    return { title: 'Needs Calibration', badge: 'CALIBRATING', color: theme.colors.status.danger };
  };

  const rank = getRank(totalScore);

  const handleShare = async () => {
    triggerHaptic('light');
    const message = `I scored ${totalScore.toFixed(2)}/${maxScore} in color-fool (${totalRounds} rounds)! Can you beat my perceptual score?`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(message);
          Alert.alert('Copied!', 'Score copied to clipboard!');
        } catch {
          // Clipboard write failed
        }
      }
    } else {
      try {
        await Share.share({ message });
      } catch {
        // Dismissed
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>MATCH SUMMARY</Text>
        <Text style={styles.sub}>{totalRounds}-Round Performance Breakdown</Text>

        {/* Total Score Badge Card */}
        <View style={styles.totalCard}>
          <View style={[styles.rankBadge, { borderColor: rank.color }]}>
            <Text style={[styles.rankBadgeText, { color: rank.color }]}>{rank.badge}</Text>
          </View>
          <Text style={styles.totalScore}>{totalScore.toFixed(2)}</Text>
          <Text style={styles.totalMax}>/ {maxScore} TOTAL POINTS</Text>
          <Text style={[styles.rankTitle, { color: rank.color }]}>{rank.title}</Text>
        </View>

        {/* 5 Swatches Breakdown List */}
        <Text style={styles.sectionHeader}>ROUND-BY-ROUND BREAKDOWN</Text>
        {records.map((r, i) => (
          <View key={i} style={styles.recordRow}>
            <View style={styles.roundCol}>
              <Text style={styles.roundNum}>R{i + 1}</Text>
              {r.palette && (
                <Text style={styles.roundPalette}>{r.palette.toUpperCase().slice(0, 4)}</Text>
              )}
            </View>

            <View style={styles.swatchPair}>
              <View style={styles.swatchWrapper}>
                <View
                  style={[styles.swatch, { backgroundColor: hslToString(r.target) }]}
                />
                <Text style={styles.swatchLabel}>TARGET</Text>
              </View>
              <View style={styles.swatchWrapper}>
                <View
                  style={[styles.swatch, { backgroundColor: hslToString(r.guess) }]}
                />
                <Text style={styles.swatchLabel}>GUESS</Text>
              </View>
            </View>

            <View style={styles.recordStats}>
              <Text style={styles.deltaText}>ΔE: {r.deltaE.toFixed(2)}</Text>
              <Text style={styles.roundScore}>+{r.score.toFixed(2)} pts</Text>
            </View>
          </View>
        ))}

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.85}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Share your match score"
          >
            <Text style={styles.shareText}>SHARE SCORE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restartBtn}
            onPress={onRestart}
            activeOpacity={0.85}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Play another match"
          >
            <Text style={styles.restartText}>PLAY AGAIN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 10,
  },
  sub: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  totalCard: {
    backgroundColor: theme.colors.cardSurface,
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  rankBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  totalScore: {
    color: theme.colors.primaryAccent,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 70,
    marginTop: 4,
  },
  totalMax: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  rankTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginTop: 24,
    marginBottom: 12,
  },
  recordRow: {
    backgroundColor: theme.colors.cardSurface,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  roundCol: {
    width: 38,
  },
  roundNum: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  roundPalette: {
    color: theme.colors.primaryAccent,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  swatchPair: {
    flexDirection: 'row',
    gap: 8,
  },
  swatchWrapper: {
    alignItems: 'center',
  },
  swatch: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.surfaceBorder,
  },
  swatchLabel: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  recordStats: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  deltaText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  roundScore: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 24,
    marginBottom: 20,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: theme.colors.cardSurface,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryAccent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  shareText: {
    color: theme.colors.primaryAccent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  restartBtn: {
    flex: 1,
    backgroundColor: theme.colors.primaryAccent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  restartText: {
    color: theme.colors.accentText,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
